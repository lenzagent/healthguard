/**
 * POST /api/reports/upload
 *
 * Upload a medical report (image or PDF), perform OCR extraction,
 * and generate AI interpretation.
 *
 * Multipart/form-data:
 * - file: the report file (JPG, PNG, or PDF)
 * - consent_ocr: "true"/"false"
 * - consent_ai: "true"/"false"
 * - consent_storage: "true"/"false"
 * - consent_wearable: "true"/"false"
 *
 * PIPL: Original file processed in-memory, OCR results encrypted at rest.
 * AI disclaimer included in all responses.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { encryptHealthData } from "@/lib/crypto/encryption";
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiInternalError,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { processReportOcr, validateReportFile, estimatePageCount } from "@/lib/ocr";
import { interpretIndicators } from "@/lib/reportAi";

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiBadRequest("请上传体检报告文件。");
    }

    // Validate file
    const validation = validateReportFile(file.type, file.size);
    if (!validation.valid) {
      return apiBadRequest(validation.error!);
    }

    // Check PIPL consents
    const consentOcr = formData.get("consent_ocr") === "true";
    const consentAi = formData.get("consent_ai") === "true";
    const consentStorage = formData.get("consent_storage") === "true";
    const consentWearable = formData.get("consent_wearable") === "true";

    if (!consentOcr || !consentAi || !consentStorage) {
      return apiBadRequest("需要获得OCR识别、AI分析和数据存储的PIPL授权才能继续。");
    }

    // Read file into buffer (in-memory only — PIPL compliance)
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileType = file.type as "image/jpeg" | "image/png" | "application/pdf";
    const pageCount = estimatePageCount(fileType, fileBuffer);

    // OCR extraction
    const ocrResult = await processReportOcr({
      fileBuffer,
      fileType,
      fileName: file.name,
    });

    if (!ocrResult.success) {
      return apiInternalError("OCR识别失败，请检查图片清晰度后重试。");
    }

    // AI interpretation
    let aiResult;
    try {
      aiResult = await interpretIndicators({
        indicators: ocrResult.indicators,
        context: {
          patientAge: ocrResult.metadata.patientAge,
          patientGender: ocrResult.metadata.patientGender,
        },
        wearableContext: consentWearable ? {
          // In production: fetch from user's connected devices
        } : undefined,
      });
    } catch (aiError) {
      console.error("[Reports Upload] AI interpretation failed:", aiError);
      // Continue without AI — indicators are still useful
    }

    // Encrypt the complete OCR output for storage
    const plaintext = JSON.stringify({
      indicators: ocrResult.indicators,
      metadata: ocrResult.metadata,
      rawText: ocrResult.rawText,
    });
    const encrypted = await encryptHealthData(plaintext);

    // Determine report title
    const examYear = ocrResult.metadata.examDate
      ? new Date(ocrResult.metadata.examDate).getFullYear()
      : new Date().getFullYear();
    const reportType = ocrResult.metadata.reportType || "体检报告";
    const title = `${examYear}年度${reportType}`;

    // Store in database
    const ipAddress = getClientIp(request);

    const report = await prisma.report.create({
      data: {
        userId: userPayload.sub,
        title,
        examDate: ocrResult.metadata.examDate
          ? new Date(ocrResult.metadata.examDate)
          : new Date(),
        hospital: ocrResult.metadata.hospital || null,
        ocrAccuracy: ocrResult.accuracy,
        fileType,
        fileSize: file.size,
        pageCount,
        encryptedData: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        aiSummary: aiResult?.aiSummary || null,
        aiRecommendations: aiResult ? JSON.stringify(aiResult.aiRecommendations) : null,
        wearableCorrelationSummary: aiResult?.wearableCorrelationSummary || null,
        status: "ready",
        // Create indicators
        indicators: {
          create: (aiResult?.indicators || ocrResult.indicators.map((ind) => ({
            ...ind,
            interpretation: null,
            wearableCorrelation: null,
            recommendation: null,
          }))).map((ind, index) => ({
            name: ind.name,
            nameEn: ind.nameEn,
            value: ind.value,
            numericValue: ind.numericValue ?? null,
            range: ind.range,
            unit: ind.unit ?? null,
            status: ind.status,
            category: ind.category,
            interpretation: ind.interpretation || null,
            wearableCorrelation: ind.wearableCorrelation || null,
            recommendation: ind.recommendation || null,
            sortOrder: index,
          })),
        },
        // Create consent records
        consents: {
          create: [
            { userId: userPayload.sub, consentType: "ocr-processing", granted: consentOcr, ipAddress },
            { userId: userPayload.sub, consentType: "ai-analysis", granted: consentAi, ipAddress },
            { userId: userPayload.sub, consentType: "data-storage", granted: consentStorage, ipAddress },
            { userId: userPayload.sub, consentType: "wearable-correlation", granted: consentWearable, ipAddress },
          ],
        },
      },
      include: {
        indicators: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: userPayload.sub,
      action: "report_upload",
      resource: "medical_report",
      resourceId: report.id,
      details: {
        title,
        fileType,
        fileSize: file.size,
        ocrAccuracy: ocrResult.accuracy,
        indicatorCount: ocrResult.indicators.length,
        processingTimeMs: ocrResult.processingTimeMs,
      },
      ipAddress,
    });

    return apiSuccess(
      {
        report: {
          id: report.id,
          title: report.title,
          examDate: report.examDate,
          hospital: report.hospital,
          ocrAccuracy: report.ocrAccuracy,
          fileType: report.fileType,
          pageCount: report.pageCount,
          status: report.status,
          indicators: report.indicators.map((ind: { name: string; nameEn: string; value: string; numericValue?: number | null; range: string; unit?: string | null; status: string; category: string; interpretation?: string | null; wearableCorrelation?: string | null; recommendation?: string | null }) => ({
            name: ind.name,
            nameEn: ind.nameEn,
            value: ind.value,
            range: ind.range,
            status: ind.status,
            category: ind.category,
            interpretation: ind.interpretation,
            wearableCorrelation: ind.wearableCorrelation,
            recommendation: ind.recommendation,
          })),
          aiSummary: report.aiSummary,
          aiRecommendations: report.aiRecommendations ? JSON.parse(report.aiRecommendations) : [],
          wearableCorrelationSummary: report.wearableCorrelationSummary,
          consents: {
            ocr: consentOcr,
            ai: consentAi,
            storage: consentStorage,
            wearable: consentWearable,
          },
          createdAt: report.createdAt,
        },
        ocr: {
          accuracy: ocrResult.accuracy,
          processingTimeMs: ocrResult.processingTimeMs,
          indicatorCount: ocrResult.indicators.length,
        },
        disclaimer: "本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
      },
      201
    );
  } catch (error) {
    console.error("[Reports Upload] Error:", error);
    return apiInternalError("报告上传处理失败，请稍后重试。");
  }
}

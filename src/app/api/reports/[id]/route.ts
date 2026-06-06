/**
 * GET /api/reports/[id] — Get full report with all indicators
 * DELETE /api/reports/[id] — Delete a report (PIPL right to erasure)
 *
 * Every access and deletion is audit logged for PIPL compliance.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { decryptHealthData } from "@/lib/crypto/encryption";
import {
  apiSuccess,
  apiNoContent,
  apiUnauthorized,
  apiNotFound,
  apiForbidden,
  apiInternalError,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

// ─── GET: Fetch single report with all indicators ────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  const { id } = await params;
  const ipAddress = getClientIp(request);

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      indicators: {
        orderBy: { sortOrder: "asc" },
      },
      consents: {
        select: {
          consentType: true,
          granted: true,
          createdAt: true,
          withdrawnAt: true,
        },
      },
    },
  });

  if (!report) {
    return apiNotFound("报告未找到。");
  }

  if (report.userId !== userPayload.sub) {
    return apiForbidden("无权访问此报告。");
  }

  // Audit log for access
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_access",
    resource: "medical_report",
    resourceId: id,
    details: { indicatorCount: report.indicators.length },
    ipAddress,
  });

  // Decrypt the full OCR data if needed
  let ocrData: Record<string, unknown> | null = null;
  try {
    const plaintext = await decryptHealthData({
      ciphertext: report.encryptedData,
      iv: report.iv,
      authTag: report.authTag,
    });
    ocrData = JSON.parse(plaintext);
  } catch {
    console.warn(`[Reports] Failed to decrypt OCR data for report ${id}`);
  }

  return apiSuccess({
    report: {
      id: report.id,
      title: report.title,
      examDate: report.examDate,
      hospital: report.hospital,
      ocrAccuracy: report.ocrAccuracy,
      fileType: report.fileType,
      pageCount: report.pageCount,
      status: report.status,
      indicators: report.indicators.map((ind: Record<string, unknown> & { name: string; nameEn: string }) => ({
        name: ind.name,
        nameEn: ind.nameEn,
        value: ind.value,
        numericValue: ind.numericValue,
        range: ind.range,
        unit: ind.unit,
        status: ind.status,
        category: ind.category,
        interpretation: ind.interpretation,
        wearableCorrelation: ind.wearableCorrelation,
        recommendation: ind.recommendation,
      })),
      aiSummary: report.aiSummary,
      aiRecommendations: report.aiRecommendations
        ? JSON.parse(report.aiRecommendations)
        : [],
      wearableCorrelationSummary: report.wearableCorrelationSummary,
      consents: report.consents.map((c: { consentType: string; granted: boolean; createdAt?: string; withdrawnAt?: string | null }) => ({
        type: c.consentType,
        granted: c.granted,
        createdAt: c.createdAt,
        withdrawnAt: c.withdrawnAt,
      })),
      ocrData, // Full raw OCR output (for debugging/audit)
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    },
    disclaimer: "本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
  });
}

// ─── DELETE: Remove a report (PIPL right to erasure) ─────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  const { id } = await params;
  const ipAddress = getClientIp(request);

  const report = await prisma.report.findUnique({
    where: { id },
    select: { userId: true, title: true },
  });

  if (!report) {
    return apiNotFound("报告未找到。");
  }

  if (report.userId !== userPayload.sub) {
    return apiForbidden("无权删除此报告。");
  }

  // Cascade delete: indicators and consents are auto-deleted by schema
  await prisma.report.delete({ where: { id } });

  // Audit log for deletion (PIPL requirement)
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_delete",
    resource: "medical_report",
    resourceId: id,
    details: {
      title: report.title,
      reason: "user_requested_deletion",
      pipLCompliance: "right_to_erasure",
    },
    ipAddress,
  });

  return apiNoContent();
}

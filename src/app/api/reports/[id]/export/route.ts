/**
 * GET /api/reports/[id]/export
 *
 * Generate a doctor-friendly health data summary for export.
 * Returns structured JSON that can be rendered as PDF or printed.
 *
 * PIPL: Export is audit logged. Original images are not included.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { decryptHealthData } from "@/lib/crypto/encryption";
import { apiSuccess, apiUnauthorized, apiNotFound, apiForbidden, apiInternalError } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

interface ExportIndicator {
  name: string;
  nameEn?: string;
  value: string;
  range: string;
  unit?: string;
  category: string;
  status: string;
  interpretation?: string;
  recommendation?: string;
}

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

  // Fetch report with indicators
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      indicators: {
        orderBy: [{ status: "asc" }, { sortOrder: "asc" }], // Abnormal first
      },
    },
  });

  if (!report) {
    return apiNotFound("报告未找到。");
  }

  if (report.userId !== userPayload.sub) {
    return apiForbidden("无权访问此报告。");
  }

  // Fetch user profile for patient info
  const user = await prisma.user.findUnique({
    where: { id: userPayload.sub },
    select: { nickname: true },
  });

  // Get other reports for trend context
  const allReports = await prisma.report.findMany({
    where: { userId: userPayload.sub },
    orderBy: { examDate: "asc" },
    select: {
      id: true,
      title: true,
      examDate: true,
      hospital: true,
      ocrAccuracy: true,
    },
  });

  // Classify indicators by status
  const abnormal = report.indicators.filter((i: { status: string }) => i.status === "abnormal");
  const borderline = report.indicators.filter((i: { status: string }) => i.status === "borderline");
  const normal = report.indicators.filter((i: { status: string }) => i.status === "normal");

  // Generate summary sections
  const summary = {
    // Header
    documentTitle: "健康数据摘要 — 供医生参考",
    generatedAt: new Date().toISOString(),
    generatedBy: "HealthGuard AI",
    disclaimer:
      "本摘要由AI生成，仅供参考，不构成医疗诊断或治疗方案。请由执业医师结合临床检查做出最终诊断。",

    // Patient info
    patient: {
      name: user?.nickname || "未设置",
      // Note: Full patient info would come from a dedicated profile model
      // This is the minimum viable export
    },

    // Report source
    report: {
      title: report.title,
      examDate: report.examDate,
      hospital: report.hospital || "未知",
      ocrAccuracy: report.ocrAccuracy,
      status: report.status,
      fileType: report.fileType,
    },

    // Historical context
    history: {
      totalReports: allReports.length,
      reports: allReports.map((r: { id: string; title: string; examDate: string; hospital: string }) => ({
        id: r.id,
        title: r.title,
        examDate: r.examDate,
        hospital: r.hospital,
      })),
    },

    // Summary by status
    summary: {
      totalIndicators: report.indicators.length,
      abnormalCount: abnormal.length,
      borderlineCount: borderline.length,
      normalCount: normal.length,
    },

    // Focus: Abnormal indicators (most important for doctor)
    abnormalIndicators: abnormal.map((ind: ExportIndicator) => ({
      name: ind.name,
      nameEn: ind.nameEn,
      value: ind.value,
      range: ind.range,
      unit: ind.unit,
      category: ind.category,
      status: ind.status,
      interpretation: ind.interpretation,
      recommendation: ind.recommendation,
    })),

    // Borderline indicators (watch list)
    borderlineIndicators: borderline.map((ind: ExportIndicator) => ({
      name: ind.name,
      nameEn: ind.nameEn,
      value: ind.value,
      range: ind.range,
      category: ind.category,
      status: ind.status,
      recommendation: ind.recommendation,
    })),

    // Normal indicators (for completeness)
    normalIndicators: normal.map((ind: ExportIndicator) => ({
      name: ind.name,
      value: ind.value,
      range: ind.range,
      category: ind.category,
    })),

    // AI analysis
    aiAnalysis: {
      overallSummary: report.aiSummary,
      recommendations: report.aiRecommendations
        ? JSON.parse(report.aiRecommendations)
        : [],
      wearableCorrelation: report.wearableCorrelationSummary,
    },

    // Wearable data context (if available)
    wearableContext: null as Record<string, unknown> | null,

    // PIPL compliance
    pipLNotice:
      "根据《个人信息保护法》(PIPL)，本摘要仅包含经用户授权的健康数据。原始体检报告图片在OCR识别后已自动删除。用户保留随时撤回授权或删除数据的权利。",
  };

  // Try to attach wearable data if user has connected devices
  try {
    const recentHealthData = await prisma.healthRecord.findMany({
      where: {
        userId: userPayload.sub,
        recordedAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        },
      },
      orderBy: { recordedAt: "desc" },
      take: 100,
      select: {
        dataType: true,
        recordedAt: true,
      },
    });

    if (recentHealthData.length > 0) {
      summary.wearableContext = {
        dataSource: "用户关联穿戴设备",
        dataRange: "最近90天",
        dataTypes: [...new Set(recentHealthData.map((r: { dataType: string }) => r.dataType))],
        recordCount: recentHealthData.length,
        note: "详细穿戴数据可在App内查看或单独导出",
      };
    }
  } catch {
    // Wearable data is optional — continue without it
    summary.wearableContext = null;
  }

  // Audit log for export (PIPL requirement)
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_export",
    resource: "medical_report_export",
    resourceId: id,
    details: {
      reportTitle: report.title,
      exportType: "doctor_summary",
      indicatorCount: report.indicators.length,
      pipLCompliance: "export_logged",
    },
    ipAddress,
  });

  return apiSuccess({
    ...summary,
    exportMetadata: {
      format: "structured_json",
      printable: true,
      generatedAt: summary.generatedAt,
      notes: "此JSON可渲染为打印友好的格式。在App中可使用导出PDF功能生成PDF文件。",
    },
  });
}

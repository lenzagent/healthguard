/**
 * POST /api/reports/interpret
 *
 * Re-generate AI interpretation for an existing report's indicators.
 * Accepts optional wearable data context for correlation analysis.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
  apiForbidden,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { interpretIndicators } from "@/lib/reportAi";

interface InterpretBody {
  reportId: string;
  wearableContext?: {
    avgSteps?: number;
    avgHeartRate?: number;
    avgSpo2?: number;
    sleepHoursAvg?: number;
    exerciseMinutesAvg?: number;
    weightKg?: number;
    bmi?: number;
  };
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as InterpretBody;
    const { reportId, wearableContext } = body;

    if (!reportId) {
      return apiBadRequest("reportId is required.");
    }

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        indicators: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!report) {
      return apiNotFound("报告未找到。");
    }

    if (report.userId !== userPayload.sub) {
      return apiForbidden("无权访问此报告。");
    }

    // Run AI interpretation
    const result = await interpretIndicators({
      indicators: report.indicators.map((ind: { name: string; nameEn: string; value: string; numericValue?: number | null; range: string; unit?: string | null; status: string; category: string }) => ({
        name: ind.name,
        nameEn: ind.nameEn,
        value: ind.value,
        numericValue: ind.numericValue,
        range: ind.range,
        status: ind.status as "normal" | "borderline" | "abnormal",
        category: ind.category as Parameters<typeof interpretIndicators>[0]["indicators"][0]["category"],
      })),
      wearableContext,
    });

    // Update report with new AI interpretations
    // Update each indicator's AI fields
    for (const interpreted of result.indicators) {
      await prisma.reportIndicator.updateMany({
        where: {
          reportId,
          name: interpreted.name,
        },
        data: {
          interpretation: interpreted.interpretation,
          wearableCorrelation: interpreted.wearableCorrelation,
          recommendation: interpreted.recommendation,
        },
      });
    }

    // Update report-level AI fields
    await prisma.report.update({
      where: { id: reportId },
      data: {
        aiSummary: result.aiSummary,
        aiRecommendations: JSON.stringify(result.aiRecommendations),
        wearableCorrelationSummary: result.wearableCorrelationSummary,
      },
    });

    // Audit log
    await createAuditLog({
      userId: userPayload.sub,
      action: "data_access",
      resource: "report_ai_interpretation",
      resourceId: reportId,
      details: {
        model: result.model,
        indicatorCount: result.indicators.length,
      },
      ipAddress: getClientIp(request),
    });

    return apiSuccess({
      reportId,
      aiSummary: result.aiSummary,
      aiRecommendations: result.aiRecommendations,
      wearableCorrelationSummary: result.wearableCorrelationSummary,
      indicators: result.indicators.map((ind) => ({
        name: ind.name,
        interpretation: ind.interpretation,
        wearableCorrelation: ind.wearableCorrelation,
        recommendation: ind.recommendation,
      })),
      generatedAt: result.generatedAt,
      model: result.model,
      disclaimer: "本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    });
  } catch (error) {
    console.error("[Reports Interpret] Error:", error);
    return apiBadRequest("AI解读失败，请稍后重试。");
  }
}

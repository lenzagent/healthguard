/**
 * GET /api/reports/compare
 *
 * Compare multiple medical reports across time.
 * Query params: ids=report1,report2,report3 (comma-separated report IDs)
 *
 * Returns trend data and AI-generated analysis.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { analyzeTrends } from "@/lib/reportAi";

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  const url = request.nextUrl;
  const idsParam = url.searchParams.get("ids");

  if (!idsParam) {
    return apiBadRequest("请提供要对比的报告ID（使用 ids=id1,id2,id3 参数）。");
  }

  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);

  if (ids.length < 2) {
    return apiBadRequest("需要至少两份报告才能进行对比分析。");
  }

  if (ids.length > 5) {
    return apiBadRequest("最多支持对比5份报告。");
  }

  // Fetch reports with indicators
  const reports = await prisma.report.findMany({
    where: {
      id: { in: ids },
      userId: userPayload.sub,
    },
    include: {
      indicators: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { examDate: "asc" },
  });

  if (reports.length < 2) {
    return apiBadRequest("未找到足够的报告进行对比。请确认报告ID是否正确。");
  }

  // Build comparison timeline
  const indicatorNames = new Set<string>();
  const timeline: Array<{
    date: string;
    label: string;
    values: Record<string, number>;
  }> = [];

  for (const report of reports) {
    const values: Record<string, number> = {};
    for (const ind of report.indicators) {
      if (ind.numericValue !== null) {
        indicatorNames.add(ind.name);
        values[ind.name] = ind.numericValue;
      }
    }
    timeline.push({
      date: report.examDate.toISOString().slice(0, 10),
      label: report.title,
      values,
    });
  }

  // Generate trend analysis
  const trendResult = await analyzeTrends({
    reports: reports.map((r: { id: string; title: string; examDate: Date; hospital?: string; ocrAccuracy: number; indicators: { name?: string; value?: string; numericValue?: number; status: string }[] }) => ({
      title: r.title,
      examDate: r.examDate.toISOString().slice(0, 10),
      indicators: r.indicators.map((ind) => ({
        name: ind.name,
        value: ind.value,
        numericValue: ind.numericValue,
        status: ind.status,
      })),
    })),
  });

  // Audit log
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_access",
    resource: "report_comparison",
    details: {
      reportIds: ids,
      reportCount: reports.length,
      indicatorCount: indicatorNames.size,
    },
    ipAddress: getClientIp(request),
  });

  return apiSuccess({
    reports: reports.map((r: { id: string; title: string; examDate: Date; hospital?: string; ocrAccuracy: number; indicators: { name?: string; value?: string; numericValue?: number; status: string }[] }) => ({
      id: r.id,
      title: r.title,
      examDate: r.examDate,
      hospital: r.hospital,
      ocrAccuracy: r.ocrAccuracy,
    })),
    indicators: Array.from(indicatorNames),
    timeline,
    trendAnalysis: trendResult.trendAnalysis,
    keyFindings: trendResult.keyFindings,
    generatedAt: trendResult.generatedAt,
    disclaimer: "本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
  });
}

/**
 * GET /api/reports — List user's medical reports
 *
 * Returns all reports for the authenticated user, ordered by exam date descending.
 * Indicators are not included in the list (use GET /api/reports/[id] for full details).
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { apiSuccess, apiUnauthorized, apiBadRequest } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  const url = request.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: { userId: userPayload.sub },
      orderBy: { examDate: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        examDate: true,
        hospital: true,
        ocrAccuracy: true,
        status: true,
        fileType: true,
        pageCount: true,
        createdAt: true,
        _count: {
          select: {
            indicators: true,
          },
        },
      },
    }),
    prisma.report.count({ where: { userId: userPayload.sub } }),
  ]);

  // Audit log
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_access",
    resource: "medical_reports",
    details: { count: reports.length, offset, limit },
    ipAddress: getClientIp(request),
  });

  return apiSuccess({
    reports: reports.map((r: { id: string; title: string; examDate: Date; hospital?: string | null; ocrAccuracy: number; status: string; fileType: string; pageCount: number; _count: { indicators: number }; createdAt: Date }) => ({
      id: r.id,
      title: r.title,
      examDate: r.examDate,
      hospital: r.hospital,
      ocrAccuracy: r.ocrAccuracy,
      status: r.status,
      fileType: r.fileType,
      pageCount: r.pageCount,
      indicatorCount: r._count.indicators,
      createdAt: r.createdAt,
    })),
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    },
  });
}

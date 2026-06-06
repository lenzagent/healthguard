/**
 * GET /api/reports/consent?reportId=xxx — Get consent status for a report
 * POST /api/reports/consent — Record or withdraw consent for a report
 *
 * PIPL compliance: All consent actions are permanently recorded and auditable.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
  apiForbidden,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

const VALID_CONSENT_TYPES = [
  "ocr-processing",
  "ai-analysis",
  "data-storage",
  "wearable-correlation",
] as const;

type ConsentType = (typeof VALID_CONSENT_TYPES)[number];

// ─── GET: Query consent status ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  const url = request.nextUrl;
  const reportId = url.searchParams.get("reportId");

  if (!reportId) {
    return apiBadRequest("reportId query parameter is required.");
  }

  // Verify report belongs to user
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { userId: true },
  });

  if (!report) {
    return apiNotFound("报告未找到。");
  }

  if (report.userId !== userPayload.sub) {
    return apiForbidden("无权访问此报告。");
  }

  const consents = await prisma.reportConsent.findMany({
    where: { reportId },
    select: {
      consentType: true,
      granted: true,
      createdAt: true,
      withdrawnAt: true,
    },
  });

  return apiSuccess({
    reportId,
    consents: consents.map((c: { consentType: string; granted: boolean; createdAt: string; withdrawnAt: string | null }) => ({
      type: c.consentType,
      granted: c.granted,
      active: c.granted && !c.withdrawnAt,
      createdAt: c.createdAt,
      withdrawnAt: c.withdrawnAt,
    })),
  });
}

// ─── POST: Record or withdraw consent ─────────────────────────────────

interface ConsentBody {
  reportId: string;
  consentType: ConsentType;
  granted: boolean; // true = grant, false = withdraw
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as ConsentBody;
    const { reportId, consentType, granted } = body;

    if (!reportId || !consentType) {
      return apiBadRequest("reportId and consentType are required.");
    }

    if (!VALID_CONSENT_TYPES.includes(consentType as typeof VALID_CONSENT_TYPES[number])) {
      return apiBadRequest(
        `Invalid consentType. Must be one of: ${VALID_CONSENT_TYPES.join(", ")}`
      );
    }

    // Verify report belongs to user
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { userId: true, title: true },
    });

    if (!report) {
      return apiNotFound("报告未找到。");
    }

    if (report.userId !== userPayload.sub) {
      return apiForbidden("无权操作此报告。");
    }

    const ipAddress = getClientIp(request);

    // Upsert consent record
    const consent = await prisma.reportConsent.upsert({
      where: {
        reportId_consentType: {
          reportId,
          consentType,
        },
      },
      create: {
        reportId,
        userId: userPayload.sub,
        consentType,
        granted,
        ipAddress,
        withdrawnAt: granted ? null : new Date(),
      },
      update: {
        granted,
        withdrawnAt: granted ? null : new Date(),
        ipAddress,
      },
    });

    // Audit log
    await createAuditLog({
      userId: userPayload.sub,
      action: granted ? "consent_granted" : "consent_withdrawn",
      resource: "report_consent",
      resourceId: consent.id,
      details: {
        reportId,
        reportTitle: report.title,
        consentType,
        granted,
      },
      ipAddress,
    });

    return apiCreated({
      reportId,
      consentType,
      granted,
      active: granted && !consent.withdrawnAt,
      recordedAt: consent.createdAt.toISOString(),
      withdrawnAt: consent.withdrawnAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("[Reports Consent] Error:", error);
    return apiBadRequest("Failed to record consent.");
  }
}

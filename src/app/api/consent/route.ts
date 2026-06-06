/**
 * GET /api/consent — Get current user's consent records
 * POST /api/consent — Record a new consent decision (PIPL compliance)
 *
 * Every consent action is permanently recorded for audit purposes.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { recordConsent } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const consentRecords = await prisma.consentRecord.findMany({
    where: { userId: userPayload.sub },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      consentType: true,
      granted: true,
      version: true,
      createdAt: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userPayload.sub },
    select: {
      privacyConsentGiven: true,
      privacyConsentAt: true,
      dataProcessingConsent: true,
      dataProcessingConsentAt: true,
      consentVersion: true,
    },
  });

  return apiSuccess({
    current: user,
    history: consentRecords,
  });
}

interface ConsentBody {
  consentType: "privacy_policy" | "data_processing" | "health_data_collection";
  granted: boolean;
  version: string;
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as ConsentBody;
    const { consentType, granted, version } = body;

    if (!consentType || !version) {
      return apiBadRequest("consentType and version are required.");
    }

    const ipAddress = getClientIp(request);

    await recordConsent(userPayload.sub, consentType, granted, version, ipAddress);

    return apiSuccess({
      consentType,
      granted,
      version,
      recordedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Consent] Error:", error);
    return apiBadRequest("Failed to record consent.");
  }
}

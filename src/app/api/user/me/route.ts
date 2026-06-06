/**
 * GET /api/user/me
 *
 * Get the current authenticated user's profile.
 *
 * PATCH /api/user/me
 *
 * Update the current user's profile.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const user = await prisma.user.findUnique({
    where: { id: userPayload.sub },
    select: {
      id: true,
      phone: true,
      wechatOpenId: true,
      nickname: true,
      avatarUrl: true,
      privacyConsentGiven: true,
      privacyConsentAt: true,
      dataProcessingConsent: true,
      dataProcessingConsentAt: true,
      consentVersion: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    return apiBadRequest("User not found.");
  }

  return apiSuccess(user);
}

interface UpdateProfileBody {
  nickname?: string;
  avatarUrl?: string;
}

export async function PATCH(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as UpdateProfileBody;
    const ipAddress = getClientIp(request);

    const user = await prisma.user.update({
      where: { id: userPayload.sub },
      data: {
        ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        lastLoginAt: true,
      },
    });

    await createAuditLog({
      userId: userPayload.sub,
      action: "profile_update",
      resource: "user",
      resourceId: userPayload.sub,
      ipAddress,
    });

    return apiSuccess(user);
  } catch (error) {
    console.error("[User/Me] Error:", error);
    return apiBadRequest("Failed to update profile.");
  }
}

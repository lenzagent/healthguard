/**
 * POST /api/auth/refresh
 *
 * Refresh the access token using a valid refresh token.
 * Implements token rotation: old refresh token is revoked, new one issued.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { getClientIp } from "@/lib/middleware/auth";
import { checkAuthRateLimit } from "@/lib/middleware/rateLimit";
import { createAuditLog } from "@/lib/audit/logger";

interface RefreshBody {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkAuthRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const body = (await request.json()) as RefreshBody;
    const { refreshToken } = body;

    if (!refreshToken) {
      return apiBadRequest("Refresh token is required.");
    }

    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return apiUnauthorized("Invalid or expired refresh token.");
    }

    // Find the session
    const session = await prisma.session.findUnique({
      where: { id: payload.jti },
    });

    if (!session || session.revokedAt) {
      return apiUnauthorized("Session has been revoked.");
    }

    if (session.refreshToken !== refreshToken) {
      return apiUnauthorized("Token mismatch.");
    }

    // Revoke old session (token rotation)
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const ipAddress = getClientIp(request);

    // Create new session (token rotation)
    const accessToken = await signAccessToken({
      sub: payload.sub,
    });

    const newSession = await prisma.session.create({
      data: {
        userId: payload.sub,
        token: accessToken.slice(0, 32),
        refreshToken: "", // Will be set below
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        ipAddress,
      },
    });

    const newRefreshToken = await signRefreshToken({
      sub: payload.sub,
      jti: newSession.id,
    });

    await prisma.session.update({
      where: { id: newSession.id },
      data: { refreshToken: newRefreshToken },
    });

    // Audit log
    await createAuditLog({
      userId: payload.sub,
      action: "token_refresh",
      resource: "session",
      resourceId: newSession.id,
      ipAddress,
    });

    return apiSuccess({
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("[Refresh] Error:", error);
    return apiBadRequest("Token refresh failed.");
  }
}

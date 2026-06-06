/**
 * POST /api/auth/logout
 *
 * Revoke the current session (token rotation: invalidates refresh token).
 * Requires valid Bearer access token.
 * Optionally accepts a refresh token to revoke a specific session.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

interface LogoutBody {
  refreshToken?: string; // Optional: specific refresh token to revoke
  allSessions?: boolean; // Optional: revoke all user sessions
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json().catch(() => ({}))) as LogoutBody;
    const ipAddress = getClientIp(request);

    if (body.allSessions) {
      // Revoke all active sessions for this user
      const result = await prisma.session.updateMany({
        where: {
          userId: userPayload.sub,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await createAuditLog({
        userId: userPayload.sub,
        action: "logout",
        resource: "session",
        details: { allSessions: true, revokedCount: result.count },
        ipAddress,
      });

      return apiSuccess({
        message: "All sessions revoked",
        revokedCount: result.count,
      });
    }

    if (body.refreshToken) {
      // Revoke specific session by refresh token
      const session = await prisma.session.findFirst({
        where: {
          userId: userPayload.sub,
          refreshToken: body.refreshToken,
          revokedAt: null,
        },
      });

      if (session) {
        await prisma.session.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        });
      }

      await createAuditLog({
        userId: userPayload.sub,
        action: "logout",
        resource: "session",
        resourceId: session?.id,
        ipAddress,
      });

      return apiSuccess({ message: "Session revoked" });
    }

    // Default: revoke all sessions for this user (stateless logout)
    const result = await prisma.session.updateMany({
      where: {
        userId: userPayload.sub,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await createAuditLog({
      userId: userPayload.sub,
      action: "logout",
      resource: "session",
      details: { revokedCount: result.count },
      ipAddress,
    });

    return apiSuccess({
      message: "Logged out successfully",
      revokedCount: result.count,
    });
  } catch (error) {
    console.error("[Logout] Error:", error);
    return apiBadRequest("Logout failed. Please try again.");
  }
}

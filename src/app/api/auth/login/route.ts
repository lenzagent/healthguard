/**
 * POST /api/auth/login
 *
 * Login with phone number + verification code.
 * Returns JWT access and refresh tokens.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { isValidChinesePhone } from "@/lib/auth/sms";
import { apiSuccess, apiBadRequest, apiUnauthorized } from "@/lib/api/response";
import { getClientIp } from "@/lib/middleware/auth";
import { checkAuthRateLimit } from "@/lib/middleware/rateLimit";
import { createAuditLog } from "@/lib/audit/logger";

interface LoginBody {
  phone: string;
  code: string;
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkAuthRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json()) as LoginBody;
    const { phone, code } = body;

    // Validate required fields
    if (!phone || !isValidChinesePhone(phone)) {
      return apiBadRequest("Valid phone number is required.");
    }
    if (!code || code.length !== 6) {
      return apiBadRequest("Valid 6-digit verification code is required.");
    }

    // Find active user
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.isActive) {
      return apiUnauthorized("Account not found. Please register first.");
    }

    // Verify the code (accept both "login" and "register" purpose codes)
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: { gte: new Date() },
        purpose: { in: ["login", "register"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verificationCode) {
      return apiBadRequest("Invalid or expired verification code.");
    }

    // Mark code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { usedAt: new Date() },
    });

    const ipAddress = getClientIp(request);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const accessToken = await signAccessToken({
      sub: user.id,
      phone: user.phone ?? undefined,
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken.slice(0, 32),
        refreshToken: "",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
        ipAddress,
      },
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      jti: session.id,
    });

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "login",
      resource: "user",
      resourceId: user.id,
      ipAddress,
    });

    return apiSuccess({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        privacyConsentGiven: user.privacyConsentGiven,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("[Login] Error:", error);
    return apiBadRequest("Login failed. Please try again.");
  }
}

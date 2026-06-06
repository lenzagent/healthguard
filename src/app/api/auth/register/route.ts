/**
 * POST /api/auth/register
 *
 * Register a new user with phone number + verification code.
 * Creates user account and returns JWT tokens.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { isValidChinesePhone } from "@/lib/auth/sms";
import { apiSuccess, apiBadRequest, apiConflict } from "@/lib/api/response";
import { getClientIp } from "@/lib/middleware/auth";
import { checkAuthRateLimit } from "@/lib/middleware/rateLimit";
import { createAuditLog } from "@/lib/audit/logger";

interface RegisterBody {
  phone: string;
  code: string;
  nickname?: string;
  privacyConsent: boolean;
  dataProcessingConsent: boolean;
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkAuthRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json()) as RegisterBody;
    const { phone, code, nickname, privacyConsent, dataProcessingConsent } = body;

    // Validate required fields
    if (!phone || !isValidChinesePhone(phone)) {
      return apiBadRequest("Valid phone number is required.");
    }
    if (!code || code.length !== 6) {
      return apiBadRequest("Valid 6-digit verification code is required.");
    }
    if (!privacyConsent) {
      return apiBadRequest("Privacy policy consent is required for registration.");
    }

    // Check if user already exists and is active
    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser?.isActive) {
      return apiConflict("An account with this phone number already exists.");
    }

    // Verify the code
    const verificationCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        code,
        purpose: "register",
        usedAt: null,
        expiresAt: { gte: new Date() },
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

    // Create or activate user
    let user;
    if (existingUser) {
      // Activate provisional user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          isActive: true,
          nickname: nickname || `User_${phone.slice(-4)}`,
          privacyConsentGiven: true,
          privacyConsentAt: new Date(),
          dataProcessingConsent: dataProcessingConsent,
          dataProcessingConsentAt: dataProcessingConsent ? new Date() : null,
          consentVersion: "v1.0",
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          phone,
          nickname: nickname || `User_${phone.slice(-4)}`,
          isActive: true,
          privacyConsentGiven: true,
          privacyConsentAt: new Date(),
          dataProcessingConsent,
          dataProcessingConsentAt: dataProcessingConsent ? new Date() : null,
          consentVersion: "v1.0",
          lastLoginAt: new Date(),
        },
      });
    }

    // Create session with JWT tokens
    const accessToken = await signAccessToken({
      sub: user.id,
      phone: user.phone ?? undefined,
    });

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken.slice(0, 32), // Store a hash prefix for lookup
        refreshToken: "", // Will be set below
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000), // 7 days
        ipAddress,
      },
    });

    const refreshToken = await signRefreshToken({
      sub: user.id,
      jti: session.id,
    });

    // Update session with refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: "register",
      resource: "user",
      resourceId: user.id,
      details: { phone: phone.slice(0, 3) + "****" + phone.slice(-4) },
      ipAddress,
    });

    return apiSuccess(
      {
        user: {
          id: user.id,
          phone: user.phone,
          nickname: user.nickname,
          privacyConsentGiven: user.privacyConsentGiven,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes in seconds
      },
      201
    );
  } catch (error) {
    console.error("[Register] Error:", error);
    return apiBadRequest("Registration failed. Please try again.");
  }
}

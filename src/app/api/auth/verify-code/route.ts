/**
 * POST /api/auth/verify-code
 *
 * Send a 6-digit SMS verification code to the user's phone.
 * Rate limited: 1 per 60 seconds per phone number.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateVerificationCode, sendSmsCode, isValidChinesePhone } from "@/lib/auth/sms";
import { apiSuccess, apiBadRequest, apiTooManyRequests } from "@/lib/api/response";
import { getClientIp } from "@/lib/middleware/auth";
import { checkAuthRateLimit } from "@/lib/middleware/rateLimit";

interface SendCodeBody {
  phone: string;
  purpose?: "login" | "register" | "bind";
}

export async function POST(request: NextRequest) {
  // Rate limit check
  const rateLimitResponse = checkAuthRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await request.json()) as SendCodeBody;
    const { phone, purpose = "login" } = body;

    // Validate phone
    if (!phone || !isValidChinesePhone(phone)) {
      return apiBadRequest("Invalid phone number. Must be a valid Chinese mobile number.");
    }

    // Rate limiting: check last code sent time
    const recentCode = await prisma.verificationCode.findFirst({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - 60_000) }, // 60 seconds
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentCode) {
      return apiTooManyRequests("Please wait 60 seconds before requesting a new code.");
    }

    // Find or create a placeholder user for code storage
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      // For register purpose, create a provisional user
      user = await prisma.user.create({
        data: {
          phone,
          isActive: false, // Not active until code verified + registration complete
        },
      });
    }

    // Generate and store code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 5 * 60_000); // 5 minutes

    await prisma.verificationCode.create({
      data: {
        userId: user.id,
        phone,
        code,
        purpose,
        expiresAt,
      },
    });

    // Send code via SMS
    const result = await sendSmsCode(phone, code);

    if (!result.success) {
      return apiBadRequest("Failed to send verification code. Please try again.");
    }

    const ipAddress = getClientIp(request);

    return apiSuccess({
      message: "Verification code sent",
      expiresIn: 300, // 5 minutes in seconds
      // In development only: return the code for testing
      ...(process.env.NODE_ENV === "development" ? { devCode: code } : {}),
    });
  } catch (error) {
    console.error("[VerifyCode] Error:", error);
    return apiBadRequest("Failed to process request.");
  }
}

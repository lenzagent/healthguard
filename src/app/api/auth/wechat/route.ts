/**
 * POST /api/auth/wechat
 *
 * WeChat OAuth login.
 * Exchanges WeChat authorization code for user info and creates/looks up HealthGuard account.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { signAccessToken, signRefreshToken } from "@/lib/auth/jwt";
import { exchangeWeChatCode, getWeChatUserInfo } from "@/lib/auth/wechat";
import { apiSuccess, apiBadRequest, apiInternalError } from "@/lib/api/response";
import { getClientIp } from "@/lib/middleware/auth";
import { createAuditLog } from "@/lib/audit/logger";

interface WeChatLoginBody {
  code: string; // WeChat OAuth authorization code
  privacyConsent?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WeChatLoginBody;
    const { code, privacyConsent } = body;

    if (!code) {
      return apiBadRequest("WeChat authorization code is required.");
    }

    // Exchange code for access token
    const tokenResponse = await exchangeWeChatCode(code);
    if (!tokenResponse) {
      return apiBadRequest("Failed to authenticate with WeChat. Please try again.");
    }

    // Get WeChat user info
    const wechatUser = await getWeChatUserInfo(tokenResponse.access_token, tokenResponse.openid);
    if (!wechatUser) {
      return apiBadRequest("Failed to get WeChat user information.");
    }

    const ipAddress = getClientIp(request);

    // Find or create HealthGuard user linked to WeChat
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { wechatOpenId: wechatUser.openid },
          ...(wechatUser.unionid ? [{ wechatUnionId: wechatUser.unionid }] : []),
        ],
      },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          wechatOpenId: wechatUser.openid,
          wechatUnionId: wechatUser.unionid ?? null,
          nickname: wechatUser.nickname,
          avatarUrl: wechatUser.headimgurl,
          isActive: true,
          privacyConsentGiven: privacyConsent ?? false,
          privacyConsentAt: privacyConsent ? new Date() : null,
          consentVersion: privacyConsent ? "v1.0" : null,
          lastLoginAt: new Date(),
        },
      });

      await createAuditLog({
        userId: user.id,
        action: "register",
        resource: "user",
        resourceId: user.id,
        details: { method: "wechat", openid: wechatUser.openid },
        ipAddress,
      });
    } else {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          nickname: wechatUser.nickname,
          avatarUrl: wechatUser.headimgurl,
          lastLoginAt: new Date(),
        },
      });
    }

    // Create session
    const accessToken = await signAccessToken({
      sub: user.id,
      wechatOpenId: user.wechatOpenId ?? undefined,
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

    await createAuditLog({
      userId: user.id,
      action: "login",
      resource: "user",
      resourceId: user.id,
      details: { method: "wechat" },
      ipAddress,
    });

    return apiSuccess({
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        wechatOpenId: user.wechatOpenId,
        privacyConsentGiven: user.privacyConsentGiven,
        lastLoginAt: user.lastLoginAt,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    console.error("[WeChat Auth] Error:", error);
    return apiInternalError("WeChat authentication failed.");
  }
}

/**
 * JWT Authentication Utilities
 *
 * Uses `jose` for edge-compatible JWT signing and verification.
 * Access tokens: short-lived (15 min)
 * Refresh tokens: long-lived (7 days)
 */

import { SignJWT, jwtVerify } from "jose";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
};

const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
};

export interface JwtPayload {
  sub: string; // user ID
  phone?: string;
  wechatOpenId?: string;
}

export interface RefreshPayload {
  sub: string; // user ID
  jti: string; // token ID (session ID)
}

// ─── Access Token ────────────────────────────────────────────────────

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  const expiryStr = process.env.JWT_ACCESS_EXPIRY || "15m";

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiryStr)
    .setSubject(payload.sub)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
  });
  return payload as unknown as JwtPayload;
}

// ─── Refresh Token ───────────────────────────────────────────────────

export async function signRefreshToken(payload: RefreshPayload): Promise<string> {
  const expiryStr = process.env.JWT_REFRESH_EXPIRY || "7d";

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiryStr)
    .setSubject(payload.sub)
    .sign(getRefreshSecret());
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret(), {
    algorithms: ["HS256"],
  });
  return payload as unknown as RefreshPayload;
}

/**
 * Authentication Middleware
 *
 * Extracts and validates JWT access token from the Authorization header.
 * Returns the authenticated user's JwtPayload or null.
 */

import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";
import type { JwtPayload } from "@/lib/auth/jwt";

export interface AuthenticatedRequest {
  user: JwtPayload;
}

/**
 * Authenticate a request by validating the Bearer token.
 * Returns the user payload if valid, null if not authenticated.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<JwtPayload | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws a Response that should be returned.
 * Use in API route handlers to ensure the user is authenticated.
 */
export function requireAuth(user: JwtPayload | null): asserts user is JwtPayload {
  if (!user) {
    throw new Response(
      JSON.stringify({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
        timestamp: new Date().toISOString(),
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Extract client IP from request headers or connection.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

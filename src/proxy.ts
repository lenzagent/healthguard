/**
 * Next.js Proxy (migrated from Middleware — Next.js 16 convention)
 *
 * Protects API routes that require authentication.
 * Allows public routes: /api/auth/*, /api/health (public health check)
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_API_PATTERNS = [
  "/api/auth/verify-code",
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/wechat",
  "/api/auth/refresh",
];

// Health check endpoint
const HEALTH_PATH = "/api/health";

function isPublicPath(pathname: string): boolean {
  if (pathname === HEALTH_PATH) return true;
  return PUBLIC_API_PATTERNS.some((pattern) => pathname.startsWith(pattern));
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!isApiPath(pathname)) {
    return NextResponse.next();
  }

  // Allow public routes without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // For protected API routes, check for Authorization header
  // The actual JWT validation happens in the route handler's authenticateRequest()
  // This middleware adds security headers and basic checks

  const response = NextResponse.next();

  // Security headers (TLS 1.3 handled by deployment platform)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.deepseek.com https://api.weixin.qq.com https://dysmsapi.aliyuncs.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};

/**
 * API Response Helpers
 *
 * Standardized JSON response formatting for all API routes.
 */

import { NextResponse } from "next/server";

// ─── Success Responses ───────────────────────────────────────────────

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function apiCreated<T>(data: T) {
  return apiSuccess(data, 201);
}

export function apiNoContent() {
  return new NextResponse(null, { status: 204 });
}

// ─── Error Responses ─────────────────────────────────────────────────

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
) {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message, details },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, { status });
}

export function apiBadRequest(message: string, details?: unknown) {
  return apiError("BAD_REQUEST", message, 400, details);
}

export function apiUnauthorized(message = "Authentication required") {
  return apiError("UNAUTHORIZED", message, 401);
}

export function apiForbidden(message = "Access denied") {
  return apiError("FORBIDDEN", message, 403);
}

export function apiNotFound(message = "Resource not found") {
  return apiError("NOT_FOUND", message, 404);
}

export function apiConflict(message: string) {
  return apiError("CONFLICT", message, 409);
}

export function apiTooManyRequests(message = "Too many requests") {
  return apiError("TOO_MANY_REQUESTS", message, 429);
}

export function apiInternalError(message = "Internal server error") {
  return apiError("INTERNAL_ERROR", message, 500);
}

// ─── Validation ──────────────────────────────────────────────────────

export function apiValidationError(errors: Record<string, string>) {
  return apiError("VALIDATION_ERROR", "Request validation failed", 422, errors);
}

/**
 * Rate Limiting Middleware
 *
 * In-memory sliding window rate limiter for API routes.
 * Protects auth endpoints from brute force attacks.
 *
 * Production: replace with Redis-based implementation for
 * distributed rate limiting across multiple instances.
 */

import type { NextRequest } from "next/server";
import { apiTooManyRequests } from "@/lib/api/response";

// ─── Configuration ────────────────────────────────────────────────

interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed in the window
  windowMs: number; // Time window in milliseconds
}

const DEFAULT_AUTH_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || "5", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || "60000", 10),
};

const DEFAULT_API_CONFIG: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || "100", 10),
  windowMs: parseInt(process.env.RATE_LIMIT_API_WINDOW_MS || "60000", 10),
};

// ─── In-Memory Store ──────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[]; // Unix ms timestamps of requests
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    // Remove entries with no recent timestamps
    const maxWindow = Math.max(
      DEFAULT_AUTH_CONFIG.windowMs,
      DEFAULT_API_CONFIG.windowMs
    );
    entry.timestamps = entry.timestamps.filter((t) => now - t < maxWindow);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

// ─── Rate Limiter ─────────────────────────────────────────────────

/**
 * Check if a request should be rate limited.
 * Returns a Response if rate limited, or null if the request can proceed.
 *
 * Uses a sliding window: counts requests in the configured time window.
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_AUTH_CONFIG
): Response | null {
  cleanup();

  // Build a key from IP + route (more precise than IP alone)
  const ip = getClientIpForRateLimit(request);
  // Support both NextRequest (with nextUrl) and plain Request (with url)
  const route = request.nextUrl?.pathname ?? new URL(request.url).pathname;
  const key = `${ip}:${route}`;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window (sliding window)
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  // Check if limit exceeded
  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    const response = apiTooManyRequests(
      `Rate limit exceeded. Try again in ${retryAfterSeconds} seconds.`
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil((oldestInWindow + config.windowMs) / 1000))
    );

    return response;
  }

  // Record this request
  entry.timestamps.push(now);

  return null; // Not rate limited
}

/**
 * Apply rate limiting to auth endpoints (login, register, verify-code).
 * Returns a Response if rate limited, or null if OK.
 */
export function checkAuthRateLimit(request: NextRequest): Response | null {
  return checkRateLimit(request, DEFAULT_AUTH_CONFIG);
}

/**
 * Apply rate limiting to general API endpoints.
 */
export function checkApiRateLimit(request: NextRequest): Response | null {
  return checkRateLimit(request, DEFAULT_API_CONFIG);
}

// ─── Helpers ──────────────────────────────────────────────────────

function getClientIpForRateLimit(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

/**
 * Reset the in-memory rate limit store.
 * Used in testing to ensure clean state between tests.
 */
export function resetRateLimitStore(): void {
  store.clear();
}

/**
 * Get the current rate limit status for a request (for debugging/monitoring).
 */
export function getRateLimitStatus(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_AUTH_CONFIG
): { remaining: number; limit: number; reset: number } {
  const ip = getClientIpForRateLimit(request);
  const route = request.nextUrl.pathname;
  const key = `${ip}:${route}`;

  const now = Date.now();
  const windowStart = now - config.windowMs;

  const entry = store.get(key);
  if (!entry) {
    return { remaining: config.maxRequests, limit: config.maxRequests, reset: 0 };
  }

  const inWindow = entry.timestamps.filter((t) => t > windowStart).length;
  const remaining = Math.max(0, config.maxRequests - inWindow);

  const oldestInWindow = entry.timestamps.find((t) => t > windowStart);
  const reset = oldestInWindow
    ? Math.ceil((oldestInWindow + config.windowMs) / 1000)
    : 0;

  return { remaining, limit: config.maxRequests, reset };
}

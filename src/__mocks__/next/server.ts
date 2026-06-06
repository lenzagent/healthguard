/**
 * Mock next/server for vitest
 *
 * Provides a minimal NextResponse class for testing API route handlers.
 */
import { vi } from "vitest";

export class NextResponse extends Response {
  static json<T>(body: T, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      ...init,
      headers: { ...init?.headers, "content-type": "application/json" },
    });
  }
}

export const NextRequest = {
  // Stub
};

export const userAgent = vi.fn(() => ({
  device: { type: "mobile" },
}));

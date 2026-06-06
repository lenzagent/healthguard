// @testing-library/jest-dom matchers — install when needed for component tests
// No current tests use jest-dom matchers.

// Mock fetch globally for test environment — prevents real network calls
// from hanging tests when the Next.js dev server isn't running.
if (typeof globalThis.fetch === "function" || typeof globalThis.fetch === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = () =>
    Promise.reject(new Error("fetch is not available in test environment"));
}

// Set test environment variables for unit tests
// These are used by JWT and encryption utilities
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-unit-tests-xxxxxxxxxx";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-for-unit-tests-xxxxxxxxxx";
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";
process.env.HEALTH_DATA_ENCRYPTION_KEY = process.env.HEALTH_DATA_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

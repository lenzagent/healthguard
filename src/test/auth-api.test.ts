/**
 * Auth API Integration Tests
 *
 * Tests for the authentication API routes: verify-code, register, login, refresh, logout.
 * Uses mocked Prisma and NextRequest to test route handlers directly.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimitStore } from "@/lib/middleware/rateLimit";

// Set required environment variables before any imports
process.env.JWT_SECRET = "test-jwt-secret-for-integration-tests-xxxxx";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-for-integration-tests-xxxxx";
process.env.JWT_ACCESS_EXPIRY = "15m";
process.env.JWT_REFRESH_EXPIRY = "7d";
process.env.HEALTH_DATA_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.RATE_LIMIT_AUTH_MAX = "5";
process.env.RATE_LIMIT_AUTH_WINDOW_MS = "60000";

// ─── Mock Prisma ──────────────────────────────────────────────────────

const mockPrismaClient = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  verificationCode: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  session: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  consentRecord: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: mockPrismaClient,
}));

// ─── Helpers ──────────────────────────────────────────────────────────

function createMockRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/auth/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "192.168.1.1",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function getResponseBody(response: Response): Promise<unknown> {
  return response.json();
}

// ─── Tests ────────────────────────────────────────────────────────────

describe("Auth API — Verify Code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it("should reject invalid phone numbers", async () => {
    const { POST } = await import("@/app/api/auth/verify-code/route");
    const req = createMockRequest({ phone: "12345", purpose: "login" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  it("should create verification code for valid phone", async () => {
    // Mock: no recent code (rate limit passed)
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce(null);
    // Mock: no existing user
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
    // Mock: provisional user created
    mockPrismaClient.user.create.mockResolvedValueOnce({
      id: "temp-user-1",
      phone: "13800138000",
      isActive: false,
    });
    // Mock: verification code stored
    mockPrismaClient.verificationCode.create.mockResolvedValueOnce({
      id: "vc-1",
      code: "123456",
    });

    const { POST } = await import("@/app/api/auth/verify-code/route");
    const req = createMockRequest({ phone: "13800138000", purpose: "login" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("message", "Verification code sent");
    expect(body.data).toHaveProperty("expiresIn", 300);
  });

  it("should rate limit: reject requests within 60 seconds", async () => {
    // Mock: recent code exists (within 60s)
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce({
      id: "vc-recent",
      createdAt: new Date(),
    });

    const { POST } = await import("@/app/api/auth/verify-code/route");
    const req = createMockRequest({ phone: "13800138001", purpose: "login" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(429);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });
});

describe("Auth API — Register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it("should require privacy consent for registration", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "123456",
      privacyConsent: false,
      dataProcessingConsent: false,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(false);
  });

  it("should require valid 6-digit code", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "123",
      privacyConsent: true,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });

  it("should refuse registration if verification code is invalid", async () => {
    // Mock: no existing user
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
    // Mock: no valid verification code found
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "000000",
      privacyConsent: true,
      dataProcessingConsent: true,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });

  it("should successfully register a new user with valid code", async () => {
    // Mock: no existing user
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);
    // Mock: valid verification code
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce({
      id: "vc-1",
      phone: "13800138000",
      code: "123456",
      purpose: "register",
      usedAt: null,
      expiresAt: new Date(Date.now() + 300_000),
    });
    // Mock: mark code as used
    mockPrismaClient.verificationCode.update.mockResolvedValueOnce({});
    // Mock: user created
    mockPrismaClient.user.create.mockResolvedValueOnce({
      id: "new-user-123",
      phone: "13800138000",
      nickname: "User_8000",
      privacyConsentGiven: true,
      privacyConsentAt: new Date(),
      dataProcessingConsent: true,
      dataProcessingConsentAt: new Date(),
      consentVersion: "v1.0",
      isActive: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
    // Mock: session created
    mockPrismaClient.session.create.mockResolvedValueOnce({
      id: "session-1",
      userId: "new-user-123",
    });
    // Mock: session updated with refresh token
    mockPrismaClient.session.update.mockResolvedValueOnce({});
    // Mock: audit log
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "123456",
      nickname: "Test User",
      privacyConsent: true,
      dataProcessingConsent: true,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(201);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("accessToken");
    expect(body.data).toHaveProperty("refreshToken");
    expect(body.data).toHaveProperty("expiresIn", 900);
    expect((body.data as Record<string, unknown>).user).toHaveProperty(
      "id",
      "new-user-123"
    );
  });

  it("should reject duplicate registration for active user", async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({
      id: "existing-user",
      phone: "13800138000",
      isActive: true,
    });

    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "123456",
      privacyConsent: true,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(409);
  });
});

describe("Auth API — Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it("should reject login for non-existent user", async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/login/route");
    const req = createMockRequest({ phone: "13800138000", code: "123456" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
  });

  it("should reject login with invalid verification code", async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      phone: "13800138000",
      isActive: true,
    });
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/auth/login/route");
    const req = createMockRequest({ phone: "13800138000", code: "000000" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });

  it("should successfully login with valid code", async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({
      id: "user-1",
      phone: "13800138000",
      isActive: true,
    });
    mockPrismaClient.verificationCode.findFirst.mockResolvedValueOnce({
      id: "vc-login",
      code: "123456",
      usedAt: null,
      expiresAt: new Date(Date.now() + 300_000),
    });
    mockPrismaClient.verificationCode.update.mockResolvedValueOnce({});
    mockPrismaClient.user.update.mockResolvedValueOnce({});
    mockPrismaClient.session.create.mockResolvedValueOnce({
      id: "session-login-1",
      userId: "user-1",
    });
    mockPrismaClient.session.update.mockResolvedValueOnce({});
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/auth/login/route");
    const req = createMockRequest({ phone: "13800138000", code: "123456" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("accessToken");
    expect(body.data).toHaveProperty("refreshToken");
    expect(body.data).toHaveProperty("expiresIn", 900);
  });
});

describe("Auth API — Token Refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it("should reject empty refresh token", async () => {
    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = createMockRequest({});
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
  });

  it("should reject invalid refresh token format", async () => {
    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = createMockRequest({ refreshToken: "invalid.token.here" });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
  });

  it("should reject revoked session", async () => {
    const { signRefreshToken } = await import("@/lib/auth/jwt");

    const refreshToken = await signRefreshToken({
      sub: "user-1",
      jti: "session-revoked",
    });

    mockPrismaClient.session.findUnique.mockResolvedValueOnce({
      id: "session-revoked",
      revokedAt: new Date(), // Already revoked
      refreshToken,
    });

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = createMockRequest({ refreshToken });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
  });

  it("should perform token rotation on valid refresh", async () => {
    const { signRefreshToken } = await import("@/lib/auth/jwt");

    const refreshToken = await signRefreshToken({
      sub: "user-1",
      jti: "session-active",
    });

    mockPrismaClient.session.findUnique.mockResolvedValueOnce({
      id: "session-active",
      userId: "user-1",
      revokedAt: null,
      refreshToken,
    });
    mockPrismaClient.session.update.mockResolvedValueOnce({}); // Revoke old
    mockPrismaClient.session.create.mockResolvedValueOnce({
      id: "session-new",
      userId: "user-1",
    });
    mockPrismaClient.session.update.mockResolvedValueOnce({}); // Set new refresh token
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/auth/refresh/route");
    const req = createMockRequest({ refreshToken });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("accessToken");
    expect(body.data).toHaveProperty("refreshToken");
    // New refresh token should be different from old
    expect((body.data as Record<string, unknown>).refreshToken).not.toBe(
      refreshToken
    );
  });
});

describe("Auth API — Logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  it("should require authentication", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    // No auth header
    const req = createMockRequest({});
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
  });

  it("should revoke all sessions on logout", async () => {
    const { signAccessToken } = await import("@/lib/auth/jwt");
    const token = await signAccessToken({ sub: "user-1", phone: "13800138000" });

    mockPrismaClient.session.updateMany.mockResolvedValueOnce({ count: 2 });
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/auth/logout/route");
    const req = createMockRequest(
      {},
      { Authorization: `Bearer ${token}` }
    );
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty("message", "Logged out successfully");
  });

  it("should support revoking all sessions explicitly", async () => {
    const { signAccessToken } = await import("@/lib/auth/jwt");
    const token = await signAccessToken({ sub: "user-2", phone: "13900139000" });

    mockPrismaClient.session.updateMany.mockResolvedValueOnce({ count: 3 });
    mockPrismaClient.auditLog.create.mockResolvedValueOnce({});

    const { POST } = await import("@/app/api/auth/logout/route");
    const req = createMockRequest(
      { allSessions: true },
      { Authorization: `Bearer ${token}` }
    );
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const body = (await getResponseBody(response)) as Record<string, unknown>;
    expect(body.data).toHaveProperty("revokedCount", 3);
  });
});

describe("Auth API — Security Properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });
  it("should use separate secrets for access and refresh tokens", async () => {
    const { signAccessToken, signRefreshToken } = await import("@/lib/auth/jwt");
    const { verifyRefreshToken, verifyAccessToken } = await import("@/lib/auth/jwt");

    const accessToken = await signAccessToken({ sub: "user-x" });
    const refreshToken = await signRefreshToken({ sub: "user-x", jti: "sess-x" });

    // Cross-verification should fail
    await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
    await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
  });

  it("should include security headers in API responses", async () => {
    const { POST } = await import("@/app/api/auth/register/route");
    const req = createMockRequest({
      phone: "13800138000",
      code: "123456",
      privacyConsent: true,
    });
    const response = await POST(req as unknown as Parameters<typeof POST>[0]);

    // Response should have content-type set
    expect(response.headers.get("Content-Type")).toBe("application/json");
  });

  it("should require authentication for protected routes", async () => {
    const { authenticateRequest } = await import("@/lib/middleware/auth");

    // Request without auth header
    const req = createMockRequest({});
    const result = await authenticateRequest(
      req as unknown as Parameters<typeof authenticateRequest>[0]
    );
    expect(result).toBeNull();
  });

  it("should authenticate valid bearer tokens", async () => {
    const { signAccessToken } = await import("@/lib/auth/jwt");
    const { authenticateRequest } = await import("@/lib/middleware/auth");

    const token = await signAccessToken({
      sub: "user-auth-test",
      phone: "13800138000",
    });

    const req = createMockRequest(
      {},
      { Authorization: `Bearer ${token}` }
    );
    const result = await authenticateRequest(
      req as unknown as Parameters<typeof authenticateRequest>[0]
    );

    expect(result).not.toBeNull();
    expect(result?.sub).toBe("user-auth-test");
  });
});

/**
 * API Response Helper Tests
 */

import { describe, it, expect } from "vitest";
import {
  apiSuccess,
  apiCreated,
  apiNoContent,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiTooManyRequests,
  apiInternalError,
  apiValidationError,
} from "@/lib/api/response";

describe("API Response Helpers", () => {
  it("apiSuccess returns 200 with data", async () => {
    const response = apiSuccess({ id: "123" });
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: "123" });
    expect(body.timestamp).toBeTruthy();
  });

  it("apiCreated returns 201", async () => {
    const response = apiCreated({ id: "new" });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("apiNoContent returns 204 with no body", () => {
    const response = apiNoContent();
    expect(response.status).toBe(204);
  });

  it("apiBadRequest returns 400 with error", async () => {
    const response = apiBadRequest("Invalid input");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.message).toBe("Invalid input");
  });

  it("apiUnauthorized returns 401", async () => {
    const response = apiUnauthorized();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("apiForbidden returns 403", async () => {
    const response = apiForbidden();
    expect(response.status).toBe(403);
  });

  it("apiNotFound returns 404", async () => {
    const response = apiNotFound("User not found");
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.message).toBe("User not found");
  });

  it("apiConflict returns 409", async () => {
    const response = apiConflict("Already exists");
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("apiTooManyRequests returns 429", async () => {
    const response = apiTooManyRequests();
    expect(response.status).toBe(429);

    const body = await response.json();
    expect(body.error.code).toBe("TOO_MANY_REQUESTS");
  });

  it("apiInternalError returns 500", async () => {
    const response = apiInternalError();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("apiValidationError returns 422 with field errors", async () => {
    const response = apiValidationError({
      phone: "Phone is required",
      email: "Invalid email format",
    });
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual({
      phone: "Phone is required",
      email: "Invalid email format",
    });
  });

  it("all success responses include timestamp", async () => {
    const responses = [
      apiSuccess("test"),
      apiCreated("test"),
      apiSuccess({ data: true }, 200),
    ];

    for (const response of responses) {
      if (response.status !== 204) {
        const body = await response.json();
        expect(body.timestamp).toBeTruthy();
        expect(new Date(body.timestamp).getTime()).not.toBeNaN();
      }
    }
  });

  it("all error responses include timestamp", async () => {
    const responses = [
      apiBadRequest("err"),
      apiUnauthorized(),
      apiForbidden(),
      apiNotFound("err"),
      apiConflict("err"),
      apiTooManyRequests(),
      apiInternalError(),
      apiValidationError({}),
    ];

    for (const response of responses) {
      const body = await response.json();
      expect(body.timestamp).toBeTruthy();
      expect(body.success).toBe(false);
    }
  });
});

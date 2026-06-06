/**
 * GET /api/health
 *
 * Public health check endpoint.
 * Returns service status — no authentication required.
 */

import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  return apiSuccess({
    status: "ok",
    service: "HealthGuard API",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

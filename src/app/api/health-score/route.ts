/**
 * GET /api/health-score — Compute and return the composite health score.
 *
 * Accepts optional query params:
 *   ?days=30  — number of days of data to score (default 30, max 90)
 *
 * In MVP, uses synthetic mock data.
 * Post-MVP, fetches real DailyHealthData from the database for the
 * authenticated user, then runs the same computeHealthScore engine.
 *
 * The response includes:
 *   - overall 0–100 composite score
 *   - per-dimension breakdown (6 dimensions)
 *   - weekly/monthly change vs prior periods
 *   - anomaly flags at both dimension and global level
 *   - AI-generated explanation (rule-based in MVP)
 */

import type { NextRequest } from "next/server";
import { computeHealthScore } from "@/lib/healthScoreEngine";
import { generateMockDailyData } from "@/data/mockData";
import type { HealthScoreResult } from "@/lib/types";

// ─── GET: Compute health score ────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const url = request.nextUrl;
  const daysParam = url.searchParams.get("days");
  const days = Math.min(
    Math.max(parseInt(daysParam || "30", 10) || 30, 3),
    90
  );

  // ── MVP: Use mock data ─────────────────────────────────
  // Post-MVP: fetch real data from prisma.healthRecord,
  // transform into DailyHealthData[], then score.
  const mockData = generateMockDailyData(days);
  const result: HealthScoreResult = computeHealthScore(mockData);

  return Response.json(result);
}

// ─── POST: Recalculate score with custom data (for testing) ──────────

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();

    // Accept custom daily health data array for recalculation
    if (body.data && Array.isArray(body.data)) {
      const result: HealthScoreResult = computeHealthScore(body.data);
      return Response.json(result);
    }

    return Response.json(
      { error: "Missing or invalid 'data' array in request body." },
      { status: 400 }
    );
  } catch {
    return Response.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }
}

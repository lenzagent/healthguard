import type { SummaryPreferences } from "@/lib/types";
import { mockSummaryPreferences } from "@/data/mockData";

// In-memory store for MVP (post-MVP: database-backed)
let preferences: SummaryPreferences = { ...mockSummaryPreferences };

/**
 * GET /api/summary/preferences
 *
 * Returns the current user's daily summary push preferences.
 */
export async function GET(): Promise<Response> {
  return Response.json(preferences);
}

/**
 * PUT /api/summary/preferences
 *
 * Updates the user's daily summary push preferences.
 * Accepts partial updates — only provided fields are changed.
 *
 * Body: Partial<SummaryPreferences>
 */
export async function PUT(request: Request): Promise<Response> {
  const body = await request.json();

  // Validate pushTime format if provided
  if (body.pushTime !== undefined) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(body.pushTime)) {
      return Response.json(
        { error: "Invalid pushTime format. Expected HH:mm (24-hour)." },
        { status: 400 }
      );
    }
  }

  // Validate language if provided
  if (body.language !== undefined && !["zh-CN", "en"].includes(body.language)) {
    return Response.json(
      { error: "Invalid language. Supported: zh-CN, en." },
      { status: 400 }
    );
  }

  preferences = { ...preferences, ...body };

  return Response.json(preferences);
}

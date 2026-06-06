import type { SummaryClickEvent } from "@/lib/types";

// In-memory store for MVP (post-MVP: analytics database)
const clickEvents: SummaryClickEvent[] = [];

/**
 * POST /api/summary/track-click
 *
 * Records a push notification or in-app click event for analytics.
 * Used to track CTR and user engagement with daily summaries.
 *
 * Body: { summaryId: string; source: "push" | "in-app"; sectionsViewed: string[]; timeSpentSeconds: number }
 */
export async function POST(request: Request): Promise<Response> {
  const body = await request.json();

  // Validate required fields
  if (!body.summaryId) {
    return Response.json(
      { error: "summaryId is required." },
      { status: 400 }
    );
  }

  if (!["push", "in-app"].includes(body.source)) {
    return Response.json(
      { error: "source must be 'push' or 'in-app'." },
      { status: 400 }
    );
  }

  const event: SummaryClickEvent = {
    summaryId: body.summaryId,
    clickedAt: new Date().toISOString(),
    source: body.source || "in-app",
    sectionsViewed: body.sectionsViewed || [],
    timeSpentSeconds: body.timeSpentSeconds || 0,
  };

  clickEvents.push(event);

  // Log for analytics (MVP: console; post-MVP: analytics pipeline)
  console.log("[analytics] summary_click:", JSON.stringify(event));

  return Response.json({ recorded: true, event });
}

/**
 * GET /api/summary/track-click
 *
 * Returns click analytics summary for the dashboard.
 * MVP: simple count; post-MVP: full analytics query.
 */
export async function GET(): Promise<Response> {
  const totalClicks = clickEvents.length;
  const pushClicks = clickEvents.filter((e) => e.source === "push").length;
  const inAppViews = clickEvents.filter((e) => e.source === "in-app").length;
  const avgTimeSpent =
    totalClicks > 0
      ? Math.round(
          clickEvents.reduce((sum, e) => sum + e.timeSpentSeconds, 0) / totalClicks
        )
      : 0;

  return Response.json({
    totalClicks,
    pushClicks,
    inAppViews,
    avgTimeSpentSeconds: avgTimeSpent,
    // Mock CTR for MVP dashboard display
    clickThroughRate: totalClicks > 0 ? 18.5 : 0,
  });
}

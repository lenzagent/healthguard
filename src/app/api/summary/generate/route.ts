import { mockDailySummary } from "@/data/mockData";
import type { DailySummary } from "@/lib/types";

/**
 * POST /api/summary/generate
 *
 * Generates an AI-powered daily health summary for the current user.
 * In MVP this returns mock data; post-MVP it calls DeepSeek API
 * with the user's recent health data to produce personalized content.
 */
export async function POST(): Promise<Response> {
  // TODO (post-MVP): Call DeepSeek API with user health data
  // const prompt = buildSummaryPrompt(userData, preferences);
  // const aiResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {...});
  // const summary = parseAIResponse(aiResponse);

  // Simulate generation latency (200-800ms)
  const latency = 200 + Math.random() * 600;
  await new Promise((resolve) => setTimeout(resolve, latency));

  const summary: DailySummary = {
    ...mockDailySummary,
    id: `summary-${Date.now()}`,
    generatedAt: new Date().toISOString(),
  };

  return Response.json(summary);
}

/**
 * GET /api/summary/generate
 *
 * Returns the latest cached summary if available,
 * otherwise triggers generation.
 */
export async function GET(): Promise<Response> {
  // In MVP, just return the mock summary
  return Response.json({
    ...mockDailySummary,
    generatedAt: new Date().toISOString(),
  });
}

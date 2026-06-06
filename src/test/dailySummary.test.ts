import { describe, it, expect } from "vitest";
import { mockDailySummary, mockSummaryPreferences } from "@/data/mockData";
import type { DailySummary, SummaryPreferences } from "@/lib/types";

describe("mockDailySummary", () => {
  it("has all required DailySummary fields", () => {
    const summary: DailySummary = mockDailySummary;

    expect(summary.id).toBeTruthy();
    expect(summary.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(summary.generatedAt).toBeTruthy();
    expect(summary.greeting).toBeTruthy();
    expect(summary.overallMessage).toBeTruthy();
    expect(summary.healthScore).toBeGreaterThanOrEqual(0);
    expect(summary.healthScore).toBeLessThanOrEqual(100);
    expect(typeof summary.healthScoreChange).toBe("number");

    // Sleep section
    expect(summary.sleep.durationHours).toBeGreaterThan(0);
    expect(summary.sleep.deepSleepMinutes).toBeGreaterThan(0);
    expect(summary.sleep.deepSleepTarget).toBeGreaterThan(0);
    expect(["excellent", "good", "fair", "poor"]).toContain(summary.sleep.quality);
    expect(summary.sleep.insights).toBeTruthy();
    expect(summary.sleep.suggestion).toBeTruthy();

    // Exercise section
    expect(summary.exercise.recommendedMinutes).toBeGreaterThan(0);
    expect(summary.exercise.recommendedType).toBeTruthy();
    expect(["low", "moderate", "vigorous"]).toContain(summary.exercise.intensity);
    expect(summary.exercise.reason).toBeTruthy();

    // Trends
    expect(summary.trends.length).toBeGreaterThan(0);
    const trend = summary.trends[0];
    expect(trend.metricName).toBeTruthy();
    expect(trend.metricIcon).toBeTruthy();
    expect(["up", "down", "stable"]).toContain(trend.direction);
    expect(trend.description).toBeTruthy();
    expect(trend.suggestion).toBeTruthy();

    // Anomalies
    expect(summary.anomalies.length).toBeGreaterThan(0);

    // Disclaimer
    expect(summary.disclaimer).toContain("AI生成");
    expect(summary.disclaimer).toContain("仅供参考");
  });

  it("has valid health score range", () => {
    expect(mockDailySummary.healthScore).toBeGreaterThanOrEqual(0);
    expect(mockDailySummary.healthScore).toBeLessThanOrEqual(100);
  });

  it("has sleep deep sleep target > 0", () => {
    expect(mockDailySummary.sleep.deepSleepTarget).toBeGreaterThan(0);
  });
});

describe("mockSummaryPreferences", () => {
  it("has all required SummaryPreferences fields", () => {
    const prefs: SummaryPreferences = mockSummaryPreferences;

    expect(typeof prefs.enabled).toBe("boolean");
    expect(prefs.pushTime).toMatch(/^\d{2}:\d{2}$/);
    expect(prefs.timezone).toBeTruthy();
    expect(typeof prefs.includeSleep).toBe("boolean");
    expect(typeof prefs.includeExercise).toBe("boolean");
    expect(typeof prefs.includeTrends).toBe("boolean");
    expect(typeof prefs.includeAnomalies).toBe("boolean");
    expect(["zh-CN", "en"]).toContain(prefs.language);
  });

  it("has valid push time format (24-hour)", () => {
    const [hours, minutes] = mockSummaryPreferences.pushTime.split(":").map(Number);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThanOrEqual(23);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThanOrEqual(59);
  });
});

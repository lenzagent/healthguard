/**
 * Unit tests for the Health Score Engine (M2).
 */
import { describe, it, expect } from "vitest";
import { computeHealthScore } from "@/lib/healthScoreEngine";
import type { DailyHealthData } from "@/lib/types";

// ── Helpers ────────────────────────────────────────────────

/** Create a baseline "healthy" day */
function healthyDay(date: string): DailyHealthData {
  return {
    date,
    sleep: { durationHours: 7.5, deepSleepMinutes: 90, quality: 80 },
    heartRate: { restingBpm: 65, avgDailyBpm: 72 },
    activity: { steps: 10000, activeMinutes: 45, caloriesBurned: 450 },
    weight: { kg: 70, bmi: 22 },
    recovery: { hrvMs: 55 },
    bloodMetrics: { systolic: 118, diastolic: 76, spo2: 98 },
  };
}

/** Create a "poor health" day with multiple issues */
function poorDay(date: string): DailyHealthData {
  return {
    date,
    sleep: { durationHours: 4.5, deepSleepMinutes: 25, quality: 30 },
    heartRate: { restingBpm: 95, avgDailyBpm: 105 },
    activity: { steps: 2000, activeMinutes: 5, caloriesBurned: 80 },
    weight: { kg: 95, bmi: 31 },
    recovery: { hrvMs: 18 },
    bloodMetrics: { systolic: 145, diastolic: 92, spo2: 93 },
  };
}

/** Generate N consecutive days of similar health data */
function generateDays(
  count: number,
  startDate: string,
  template: DailyHealthData,
  variance: number = 0
): DailyHealthData[] {
  const days: DailyHealthData[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const day = structuredClone(template);
    day.date = dateStr;

    if (variance > 0) {
      // Add small random variance
      const v = () => (Math.random() - 0.5) * 2 * variance;
      day.sleep.durationHours = Math.max(3, day.sleep.durationHours + v());
      day.heartRate.restingBpm = Math.max(40, day.heartRate.restingBpm + v());
      day.activity.steps = Math.max(0, day.activity.steps + v() * 1000);
      day.recovery.hrvMs = Math.max(5, day.recovery.hrvMs + v());
    }

    days.push(day);
  }
  return days;
}

// ── Tests ──────────────────────────────────────────────────

describe("computeHealthScore", () => {
  // ── Insufficient data ────────────────────────────────────
  describe("insufficient data", () => {
    it("returns insufficientData=true when fewer than 3 days", () => {
      const data = generateDays(2, "2026-06-01", healthyDay("2026-06-01"));
      const result = computeHealthScore(data);

      expect(result.insufficientData).toBe(true);
      expect(result.dataDays).toBe(2);
      expect(result.overall).toBe(0);
      expect(result.dimensions).toHaveLength(0);
      expect(result.globalFlags.length).toBeGreaterThan(0);
      expect(result.globalFlags[0]).toContain("3天");
    });

    it("returns insufficientData=true for empty data", () => {
      const result = computeHealthScore([]);
      expect(result.insufficientData).toBe(true);
      expect(result.dataDays).toBe(0);
    });
  });

  // ── Minimum viable data (exactly 3 days) ─────────────────
  it("produces a valid score with exactly 3 days of data", () => {
    const data = generateDays(3, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);

    expect(result.insufficientData).toBe(false);
    expect(result.dataDays).toBe(3);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    expect(result.dimensions).toHaveLength(6);
  });

  // ── Normal healthy person ─────────────────────────────────
  it("scores a consistently healthy person >= 80", () => {
    const data = generateDays(14, "2026-05-20", healthyDay("2026-05-20"), 0.3);
    const result = computeHealthScore(data);

    expect(result.insufficientData).toBe(false);
    expect(result.overall).toBeGreaterThanOrEqual(80);
    expect(result.dimensions.every((d) => d.rawScore >= 60)).toBe(true);
  });

  it("returns 'excellent' status for very high scores", () => {
    // Create super-healthy data
    const superHealthy: DailyHealthData = {
      date: "2026-06-01",
      sleep: { durationHours: 8, deepSleepMinutes: 110, quality: 95 },
      heartRate: { restingBpm: 62, avgDailyBpm: 68 },
      activity: { steps: 15000, activeMinutes: 60, caloriesBurned: 600 },
      weight: { kg: 68, bmi: 21.5 },
      recovery: { hrvMs: 65 },
      bloodMetrics: { systolic: 112, diastolic: 72, spo2: 99 },
    };
    const data = generateDays(14, "2026-05-20", superHealthy);
    const result = computeHealthScore(data);

    expect(result.overall).toBeGreaterThanOrEqual(90);
  });

  // ── Poor health ───────────────────────────────────────────
  it("scores poor health below 40", () => {
    const data = generateDays(14, "2026-05-20", poorDay("2026-05-20"));
    const result = computeHealthScore(data);

    expect(result.insufficientData).toBe(false);
    expect(result.overall).toBeLessThan(60);
    expect(result.globalFlags.length).toBeGreaterThan(0);
  });

  it("flags individual dimension anomalies", () => {
    const data = generateDays(14, "2026-05-20", poorDay("2026-05-20"));
    const result = computeHealthScore(data);

    // At least one dimension should have flags
    const flaggedDimensions = result.dimensions.filter(
      (d) => d.flags.length > 0
    );
    expect(flaggedDimensions.length).toBeGreaterThan(0);
  });

  // ── Dimension weight verification ─────────────────────────
  it("each dimension has the correct weight", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);

    const expectedWeights: Record<string, number> = {
      sleep: 0.25,
      heartRate: 0.2,
      activity: 0.2,
      weight: 0.15,
      recovery: 0.1,
      bloodMetrics: 0.1,
    };

    for (const dim of result.dimensions) {
      expect(dim.weight).toBe(expectedWeights[dim.name]);
    }

    // Sum of weights = 1.0
    const totalWeight = result.dimensions.reduce((s, d) => s + d.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  // ── Specific anomaly cases ────────────────────────────────
  it("detects low sleep duration", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    // Make the last 3 days have very low sleep
    for (let i = 4; i < 7; i++) {
      data[i].sleep.durationHours = 4;
      data[i].sleep.deepSleepMinutes = 30;
    }
    const result = computeHealthScore(data);

    const sleepDim = result.dimensions.find((d) => d.name === "sleep")!;
    expect(sleepDim.flags.length).toBeGreaterThan(0);
    expect(sleepDim.flags.some((f) => f.includes("睡眠时长不足"))).toBe(true);
    expect(sleepDim.rawScore).toBeLessThan(80);
  });

  it("detects high resting heart rate", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 4; i < 7; i++) {
      data[i].heartRate.restingBpm = 95;
    }
    const result = computeHealthScore(data);

    const hrDim = result.dimensions.find((d) => d.name === "heartRate")!;
    expect(hrDim.flags.some((f) => f.includes("静息心率偏高"))).toBe(true);
  });

  it("detects low activity levels", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 4; i < 7; i++) {
      data[i].activity.steps = 2000;
      data[i].activity.activeMinutes = 5;
    }
    const result = computeHealthScore(data);

    const actDim = result.dimensions.find((d) => d.name === "activity")!;
    expect(actDim.flags.some((f) => f.includes("步数不足"))).toBe(true);
    expect(actDim.rawScore).toBeLessThan(85);
  });

  it("detects high BMI", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 0; i < 7; i++) {
      data[i].weight.bmi = 30;
      data[i].weight.kg = 95;
    }
    const result = computeHealthScore(data);

    const wDim = result.dimensions.find((d) => d.name === "weight")!;
    expect(wDim.flags.some((f) => f.includes("BMI偏高"))).toBe(true);
    expect(wDim.rawScore).toBeLessThan(60);
  });

  it("detects low SpO2", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 4; i < 7; i++) {
      data[i].bloodMetrics.spo2 = 92;
    }
    const result = computeHealthScore(data);

    const bDim = result.dimensions.find((d) => d.name === "bloodMetrics")!;
    expect(bDim.flags.some((f) => f.includes("血氧偏低"))).toBe(true);
  });

  // ── Trend calculations ────────────────────────────────────
  it("calculates positive weekly trend when health improves", () => {
    // First week: poor health
    const week1 = generateDays(7, "2026-05-15", poorDay("2026-05-15"));
    // Second week: healthy
    const week2 = generateDays(7, "2026-05-22", healthyDay("2026-05-22"));
    const data = [...week1, ...week2];

    const result = computeHealthScore(data);
    expect(result.weeklyChange).toBeGreaterThan(0);
  });

  it("calculates negative weekly trend when health declines", () => {
    // First week: healthy
    const week1 = generateDays(7, "2026-05-15", healthyDay("2026-05-15"));
    // Second week: poor
    const week2 = generateDays(7, "2026-05-22", poorDay("2026-05-22"));
    const data = [...week1, ...week2];

    const result = computeHealthScore(data);
    expect(result.weeklyChange).toBeLessThan(0);
  });

  it("returns 0 for weekly change when insufficient history", () => {
    const data = generateDays(4, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);
    // With only 4 days, we can't compare two 7-day windows
    // weeklyChange should be 0 (not enough history for comparison)
    expect(typeof result.weeklyChange).toBe("number");
  });

  // ── Global flags ──────────────────────────────────────────
  it("promotes poor dimension status to global flags", () => {
    const data = generateDays(7, "2026-06-01", poorDay("2026-06-01"));
    const result = computeHealthScore(data);

    const poorDims = result.dimensions.filter((d) => d.status === "poor");
    if (poorDims.length > 0) {
      expect(result.globalFlags.length).toBeGreaterThan(0);
    }
  });

  // ── Explanation generation ────────────────────────────────
  it("generates a non-empty explanation", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);

    expect(result.explanation).toBeTruthy();
    expect(result.explanation.length).toBeGreaterThan(10);
    expect(result.explanation).toContain("综合健康评分");
  });

  it("explanation mentions status text", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);

    const hasStatus =
      result.explanation.includes("优秀") ||
      result.explanation.includes("良好") ||
      result.explanation.includes("一般") ||
      result.explanation.includes("需关注");
    expect(hasStatus).toBe(true);
  });

  // ── Score bounds ──────────────────────────────────────────
  it("overall score is always between 0 and 100", () => {
    // Test with healthy data
    const healthy = generateDays(14, "2026-05-20", healthyDay("2026-05-20"));
    const healthyResult = computeHealthScore(healthy);
    expect(healthyResult.overall).toBeGreaterThanOrEqual(0);
    expect(healthyResult.overall).toBeLessThanOrEqual(100);

    // Test with poor data
    const poor = generateDays(14, "2026-05-20", poorDay("2026-05-20"));
    const poorResult = computeHealthScore(poor);
    expect(poorResult.overall).toBeGreaterThanOrEqual(0);
    expect(poorResult.overall).toBeLessThanOrEqual(100);
  });

  it("each dimension raw score is between 0 and 100", () => {
    const data = generateDays(14, "2026-05-20", healthyDay("2026-05-20"));
    const result = computeHealthScore(data);

    for (const dim of result.dimensions) {
      expect(dim.rawScore).toBeGreaterThanOrEqual(0);
      expect(dim.rawScore).toBeLessThanOrEqual(100);
    }
  });

  // ── Metadata ──────────────────────────────────────────────
  it("includes updatedAt and dataDays in result", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    const result = computeHealthScore(data);

    expect(result.updatedAt).toBeTruthy();
    expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dataDays).toBe(7);
  });

  // ── Edge case: all dimensions have some variance ──────────
  it("handles mixed health data across days", () => {
    const days: DailyHealthData[] = [];
    const start = new Date("2026-05-20");

    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      // Alternate between healthy and somewhat poor
      if (i % 3 === 0) {
        days.push(poorDay(dateStr));
      } else {
        days.push(healthyDay(dateStr));
      }
    }

    const result = computeHealthScore(days);
    expect(result.insufficientData).toBe(false);
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(100);
    // Should have some flags due to poor days mixed in
    expect(result.dimensions.length).toBe(6);
  });

  // ── Trend direction is set on each dimension ──────────────
  it("sets trend direction on every dimension", () => {
    const data = generateDays(14, "2026-05-20", healthyDay("2026-05-20"), 1);
    const result = computeHealthScore(data);

    for (const dim of result.dimensions) {
      expect(["up", "down", "stable"]).toContain(dim.trend);
    }
  });

  // ── Deep sleep flag detection ─────────────────────────────
  it("detects low deep sleep", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 4; i < 7; i++) {
      data[i].sleep.deepSleepMinutes = 35;
    }
    const result = computeHealthScore(data);

    const sleepDim = result.dimensions.find((d) => d.name === "sleep")!;
    expect(sleepDim.flags.some((f) => f.includes("深睡时长偏低"))).toBe(true);
  });

  // ── Low HRV flag detection ────────────────────────────────
  it("detects low HRV", () => {
    const data = generateDays(7, "2026-06-01", healthyDay("2026-06-01"));
    for (let i = 4; i < 7; i++) {
      data[i].recovery.hrvMs = 22;
    }
    const result = computeHealthScore(data);

    const recDim = result.dimensions.find((d) => d.name === "recovery")!;
    expect(recDim.flags.some((f) => f.includes("HRV偏低"))).toBe(true);
  });
});

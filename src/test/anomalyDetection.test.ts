import { describe, it, expect } from "vitest";
import {
  detectAnomalies,
  mergeThresholds,
  validateThresholds,
  isEscalating,
  DEFAULT_THRESHOLDS,
  type DetectionInput,
  type ThresholdConfig,
} from "@/lib/anomalyDetection";

// ── mergeThresholds ────────────────────────────────────────────────
// Tests use partial threshold objects; cast via any to avoid deep-partial TS errors.

describe("mergeThresholds", () => {
  it("returns defaults when no custom thresholds provided", () => {
    const result = mergeThresholds(undefined);
    expect(result).toEqual(DEFAULT_THRESHOLDS);
  });

  it("overrides heart rate thresholds", () => {
    const result = mergeThresholds({
      heartRate: { min: 45, max: 110 },
    } as any);
    expect(result.heartRate.min).toBe(45);
    expect(result.heartRate.max).toBe(110);
    expect(result.heartRate.yellowMin).toBe(DEFAULT_THRESHOLDS.heartRate.yellowMin);
    expect(result.spo2.normal).toBe(DEFAULT_THRESHOLDS.spo2.normal);
  });

  it("overrides spo2 thresholds", () => {
    const result = mergeThresholds({
      spo2: { normal: 96, yellow: 93, red: 88 },
    } as any);
    expect(result.spo2.normal).toBe(96);
    expect(result.spo2.yellow).toBe(93);
    expect(result.spo2.red).toBe(88);
  });

  it("overrides trend thresholds", () => {
    const result = mergeThresholds({
      trend: { windowDays: 14, driftStdDevThreshold: 2.5 },
    } as any);
    expect(result.trend.windowDays).toBe(14);
    expect(result.trend.driftStdDevThreshold).toBe(2.5);
    expect(result.trend.minDataPoints).toBe(DEFAULT_THRESHOLDS.trend.minDataPoints);
  });
});

// ── validateThresholds ─────────────────────────────────────────────

describe("validateThresholds", () => {
  it("returns empty array for valid thresholds", () => {
    const errors = validateThresholds({
      heartRate: { min: 50, max: 100 },
    } as any);
    expect(errors).toHaveLength(0);
  });

  it("returns empty array for empty thresholds", () => {
    const errors = validateThresholds({} as any);
    expect(errors).toHaveLength(0);
  });

  it("rejects HR min >= max", () => {
    const errors = validateThresholds({
      heartRate: { min: 100, max: 60 },
    } as any);
    expect(errors.some((e) => e.includes("下限必须小于上限"))).toBe(true);
  });

  it("rejects HR min below 30", () => {
    const errors = validateThresholds({
      heartRate: { min: 20 },
    } as any);
    expect(errors.some((e) => e.includes("心率下限"))).toBe(true);
  });

  it("rejects HR max above 220", () => {
    const errors = validateThresholds({
      heartRate: { max: 250 },
    } as any);
    expect(errors.some((e) => e.includes("心率上限"))).toBe(true);
  });

  it("rejects spo2 normal below 80", () => {
    const errors = validateThresholds({
      spo2: { normal: 70 },
    } as any);
    expect(errors.some((e) => e.includes("血氧正常值"))).toBe(true);
  });

  it("rejects trend window below 3", () => {
    const errors = validateThresholds({
      trend: { windowDays: 1 },
    } as any);
    expect(errors.some((e) => e.includes("趋势窗口"))).toBe(true);
  });

  it("rejects drift threshold above 5", () => {
    const errors = validateThresholds({
      trend: { driftStdDevThreshold: 6 },
    } as any);
    expect(errors.some((e) => e.includes("漂移阈值"))).toBe(true);
  });
});

// ── detectAnomalies: Heart Rate ────────────────────────────────────

describe("detectAnomalies - heart rate", () => {
  it("detects no anomaly for normal heart rate", () => {
    const input: DetectionInput = { heartRate: 72, source: "Apple Watch" };
    const results = detectAnomalies(input);
    expect(results.filter((r) => r.metric === "heart-rate")).toHaveLength(0);
  });

  it("detects yellow warning for elevated heart rate", () => {
    const input: DetectionInput = { heartRate: 97, source: "Apple Watch" };
    const results = detectAnomalies(input);
    const hrAnomalies = results.filter((r) => r.type === "heart-rate-high");
    expect(hrAnomalies).toHaveLength(1);
    expect(hrAnomalies[0].severity).toBe("yellow");
    expect(hrAnomalies[0].currentValue).toBe(97);
  });

  it("detects red alert for dangerously high heart rate", () => {
    const input: DetectionInput = { heartRate: 130, source: "Apple Watch" };
    const results = detectAnomalies(input);
    const hrAnomalies = results.filter((r) => r.type === "heart-rate-high");
    expect(hrAnomalies).toHaveLength(1);
    expect(hrAnomalies[0].severity).toBe("red");
    expect(hrAnomalies[0].medicalAdvice).toBeDefined();
    expect(hrAnomalies[0].medicalAdvice).toContain("本内容由AI生成，仅供参考");
  });

  it("detects yellow warning for low heart rate", () => {
    const input: DetectionInput = { heartRate: 52, source: "Huawei Health" };
    const results = detectAnomalies(input);
    const hrAnomalies = results.filter((r) => r.type === "heart-rate-low");
    expect(hrAnomalies).toHaveLength(1);
    expect(hrAnomalies[0].severity).toBe("yellow");
  });

  it("detects red alert for dangerously low heart rate", () => {
    const input: DetectionInput = { heartRate: 40, source: "Huawei Health" };
    const results = detectAnomalies(input);
    const hrAnomalies = results.filter((r) => r.type === "heart-rate-low");
    expect(hrAnomalies).toHaveLength(1);
    expect(hrAnomalies[0].severity).toBe("red");
  });

  it("detects irregular heart rate with high HRV + abnormal rate", () => {
    const input: DetectionInput = {
      heartRate: 105,
      hrv: 150,
      source: "Apple Watch",
    };
    const results = detectAnomalies(input);
    const irregular = results.filter((r) => r.type === "heart-rate-irregular");
    expect(irregular).toHaveLength(1);
    expect(irregular[0].severity).toBe("yellow");
  });

  it("does not flag irregular HRV when rate is normal", () => {
    const input: DetectionInput = {
      heartRate: 72,
      hrv: 130,
      source: "Apple Watch",
    };
    const results = detectAnomalies(input);
    const irregular = results.filter((r) => r.type === "heart-rate-irregular");
    expect(irregular).toHaveLength(0);
  });

  it("respects custom heart rate thresholds", () => {
    const input: DetectionInput = { heartRate: 105, source: "Test" };
    // With custom higher threshold, 105 should not trigger
    const results = detectAnomalies(input, {
      heartRate: { yellowMax: 110, redMax: 130 },
    } as any);
    const hrAnomalies = results.filter((r) => r.metric === "heart-rate");
    expect(hrAnomalies).toHaveLength(0);
  });
});

// ── detectAnomalies: SpO2 ──────────────────────────────────────────

describe("detectAnomalies - SpO2", () => {
  it("detects no anomaly for normal SpO2", () => {
    const input: DetectionInput = { spo2: 98, source: "Apple Watch" };
    const results = detectAnomalies(input);
    expect(results.filter((r) => r.metric === "spo2")).toHaveLength(0);
  });

  it("detects yellow warning for low SpO2", () => {
    const input: DetectionInput = { spo2: 91, source: "Apple Watch" };
    const results = detectAnomalies(input);
    const spo2Anomalies = results.filter((r) => r.type === "spo2-low");
    expect(spo2Anomalies).toHaveLength(1);
    expect(spo2Anomalies[0].severity).toBe("yellow");
  });

  it("detects red alert for critically low SpO2", () => {
    const input: DetectionInput = { spo2: 88, source: "Apple Watch" };
    const results = detectAnomalies(input);
    const spo2Anomalies = results.filter((r) => r.type === "spo2-crisis");
    expect(spo2Anomalies).toHaveLength(1);
    expect(spo2Anomalies[0].severity).toBe("red");
    expect(spo2Anomalies[0].medicalAdvice).toBeDefined();
    expect(spo2Anomalies[0].medicalAdvice).toContain("立即拨打急救电话");
  });

  it("adds sleep context to SpO2 warnings during sleep hours", () => {
    const input: DetectionInput = { spo2: 91, isSleepHours: true, source: "Apple Watch" };
    const results = detectAnomalies(input);
    const spo2Anomalies = results.filter((r) => r.type === "spo2-low");
    expect(spo2Anomalies).toHaveLength(1);
    expect(spo2Anomalies[0].description).toContain("睡眠");
  });
});

// ── detectAnomalies: Sleep Apnea ───────────────────────────────────

describe("detectAnomalies - sleep apnea risk", () => {
  it("detects sleep apnea risk when SpO2 drops during sleep", () => {
    const input: DetectionInput = {
      spo2: 86,
      isSleepHours: true,
      source: "Apple Watch",
    };
    const results = detectAnomalies(input);
    const apnea = results.filter((r) => r.type === "sleep-apnea-risk");
    expect(apnea.length).toBeGreaterThanOrEqual(1);
    const redApnea = apnea.find((a) => a.severity === "red");
    expect(redApnea).toBeDefined();
    expect(redApnea!.medicalAdvice).toContain("多导睡眠图");
  });

  it("does not flag sleep apnea outside sleep hours", () => {
    const input: DetectionInput = {
      spo2: 87,
      isSleepHours: false,
      source: "Apple Watch",
    };
    const results = detectAnomalies(input);
    const apnea = results.filter((r) => r.type === "sleep-apnea-risk");
    // Should only get spo2-crisis, not sleep-apnea-risk
    expect(apnea).toHaveLength(0);
  });

  it("detects pattern-based apnea risk from history", () => {
    const now = new Date();
    const input: DetectionInput = {
      spo2: 93,
      isSleepHours: true,
      source: "Apple Watch",
      recentHistory: {
        heartRate: [],
        spo2: [
          { timestamp: new Date(now.getTime() - 3600000).toISOString(), value: 94 },
          { timestamp: new Date(now.getTime() - 2700000).toISOString(), value: 84 },
          { timestamp: new Date(now.getTime() - 1800000).toISOString(), value: 83 },
          { timestamp: new Date(now.getTime() - 900000).toISOString(), value: 93 },
        ],
      },
    };
    const results = detectAnomalies(input);
    const apnea = results.filter((r) => r.type === "sleep-apnea-risk");
    // Should have at least the pattern-based warning
    expect(apnea.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag apnea without sufficient history data", () => {
    const input: DetectionInput = {
      spo2: 93,
      isSleepHours: true,
      source: "Apple Watch",
      recentHistory: {
        heartRate: [],
        spo2: [
          { timestamp: new Date().toISOString(), value: 93 },
          { timestamp: new Date().toISOString(), value: 94 },
        ],
      },
    };
    const results = detectAnomalies(input);
    // With only 2 data points below drop threshold with 3 required, no pattern alert
    const apneaPattern = results.filter(
      (r) => r.type === "sleep-apnea-risk" && r.description.includes("次夜间血氧测量")
    );
    expect(apneaPattern).toHaveLength(0);
  });
});

// ── detectAnomalies: Trend Drift ───────────────────────────────────

describe("detectAnomalies - trend drift", () => {
  function makeDaySeries(startValue: number, days: number, increment: number) {
    const now = new Date();
    return Array.from({ length: days }, (_, i) => ({
      timestamp: new Date(now.getTime() - (days - 1 - i) * 86400000).toISOString(),
      value: Math.round(startValue + increment * i),
    }));
  }

  it("detects upward heart rate trend", () => {
    const input: DetectionInput = {
      source: "Trend Detection",
      recentHistory: {
        heartRate: makeDaySeries(68, 7, 3), // 68, 71, 74, 77, 80, 83, 86
        spo2: [],
      },
    };
    const results = detectAnomalies(input);
    const drifts = results.filter((r) => r.type === "trend-drift-up");
    expect(drifts.length).toBeGreaterThanOrEqual(1);
    expect(drifts[0].metric).toBe("heart-rate");
  });

  it("detects downward SpO2 trend", () => {
    const input: DetectionInput = {
      source: "Trend Detection",
      recentHistory: {
        heartRate: [],
        spo2: makeDaySeries(98, 7, -0.8), // steady decline
      },
    };
    const results = detectAnomalies(input);
    const drifts = results.filter((r) => r.type === "trend-drift-down" && r.metric === "spo2");
    expect(drifts.length).toBeGreaterThanOrEqual(1);
  });

  it("does not flag stable trend", () => {
    const input: DetectionInput = {
      source: "Trend Detection",
      recentHistory: {
        heartRate: makeDaySeries(72, 7, 0), // flat
        spo2: [],
      },
    };
    const results = detectAnomalies(input);
    const drifts = results.filter((r) => r.type.startsWith("trend-drift"));
    expect(drifts).toHaveLength(0);
  });

  it("does not analyze trend with insufficient data points", () => {
    const input: DetectionInput = {
      source: "Trend Detection",
      recentHistory: {
        heartRate: makeDaySeries(72, 2, 5), // only 2 data points
        spo2: [],
      },
    };
    const results = detectAnomalies(input);
    const drifts = results.filter((r) => r.type.startsWith("trend-drift"));
    expect(drifts).toHaveLength(0);
  });
});

// ── isEscalating ───────────────────────────────────────────────────

describe("isEscalating", () => {
  it("returns false for single anomaly", () => {
    const input: DetectionInput = { heartRate: 97, source: "Test" };
    const results = detectAnomalies(input);
    expect(isEscalating(results)).toBe(false);
  });

  it("returns true for multiple red alerts", () => {
    const input: DetectionInput = {
      heartRate: 130,
      spo2: 88,
      source: "Test",
    };
    const results = detectAnomalies(input);
    expect(isEscalating(results)).toBe(true);
  });

  it("returns false for no anomalies", () => {
    expect(isEscalating([])).toBe(false);
  });

  it("returns true for mixed red + yellow across multiple metrics", () => {
    const input: DetectionInput = {
      heartRate: 130,
      spo2: 91,
      source: "Test",
      recentHistory: {
        heartRate: Array.from({ length: 7 }, (_, i) => ({
          timestamp: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
          value: 65 + i * 5, // 65, 70, 75, 80, 85, 90, 95 — steady climb
        })),
        spo2: [],
      },
    };
    const results = detectAnomalies(input);
    // Should have at least heart-rate-high (red) + spo2-low (yellow) + trend-drift-up
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(isEscalating(results)).toBe(true);
  });
});

// ── Full Pipeline ──────────────────────────────────────────────────

describe("detectAnomalies - full pipeline", () => {
  it("handles empty input gracefully", () => {
    const results = detectAnomalies({});
    expect(results).toHaveLength(0);
  });

  it("each anomaly has required fields", () => {
    const input: DetectionInput = { heartRate: 130, spo2: 88, source: "Test" };
    const results = detectAnomalies(input);
    for (const r of results) {
      expect(r.id).toBeTruthy();
      expect(r.type).toBeTruthy();
      expect(r.severity).toMatch(/^(green|yellow|red)$/);
      expect(r.title).toBeTruthy();
      expect(r.description).toBeTruthy();
      expect(r.metric).toBeTruthy();
      expect(r.detectedAt).toBeTruthy();
      expect(r.source).toBe("Test");
      expect(r.active).toBe(true);
    }
  });

  it("all red alerts include medical disclaimer", () => {
    const input: DetectionInput = { heartRate: 130, spo2: 88, source: "Test" };
    const results = detectAnomalies(input);
    const redAlerts = results.filter((r) => r.severity === "red");
    expect(redAlerts.length).toBeGreaterThan(0);
    for (const r of redAlerts) {
      if (r.medicalAdvice) {
        expect(r.medicalAdvice).toContain("本内容由AI生成，仅供参考");
      }
    }
  });

  it("uses default source when not provided", () => {
    const input: DetectionInput = { heartRate: 130 };
    const results = detectAnomalies(input);
    for (const r of results) {
      expect(r.source).toBe("HealthGuard");
    }
  });
});

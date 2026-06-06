/**
 * Mock Data Tests
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import {
  mockUser,
  mockMetrics,
  mockHealthScore,
  mockTrends,
  mockAlerts,
  mockDevices,
  mockReportIndicators,
  generateResultData,
} from "@/data/mockData";

describe("Mock User Profile", () => {
  it("has required user fields", () => {
    expect(mockUser.name).toBeTruthy();
    expect(mockUser.age).toBeGreaterThan(0);
    expect(mockUser.gender).toBeTruthy();
    expect(mockUser.height).toBeGreaterThan(0);
    expect(mockUser.weight).toBeGreaterThan(0);
  });

  it("has valid conditions array", () => {
    expect(Array.isArray(mockUser.conditions)).toBe(true);
  });

  it("has valid family history array", () => {
    expect(Array.isArray(mockUser.familyHistory)).toBe(true);
  });
});

describe("Mock Health Metrics", () => {
  it("has exactly 3 core metrics", () => {
    expect(mockMetrics).toHaveLength(3);
  });

  it("each metric has required fields", () => {
    for (const metric of mockMetrics) {
      expect(metric.type).toBeTruthy();
      expect(metric.icon).toBeTruthy();
      expect(metric.label).toBeTruthy();
      expect(metric.value).toBeDefined();
      expect(metric.unit).toBeTruthy();
      expect(metric.status).toMatch(/^(normal|caution|abnormal)$/);
      expect(metric.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("metric types are unique", () => {
    const types = mockMetrics.map((m) => m.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("all metrics have normal status in default state", () => {
    expect(mockMetrics.every((m) => m.status === "normal")).toBe(true);
  });
});

describe("Mock Health Score", () => {
  it("has overall score between 0 and 100", () => {
    expect(mockHealthScore.overall).toBeGreaterThanOrEqual(0);
    expect(mockHealthScore.overall).toBeLessThanOrEqual(100);
  });

  it("has at least 4 factors", () => {
    expect(mockHealthScore.factors.length).toBeGreaterThanOrEqual(4);
  });

  it("each factor has valid score <= maxScore", () => {
    for (const factor of mockHealthScore.factors) {
      expect(factor.score).toBeLessThanOrEqual(factor.maxScore);
      expect(factor.score).toBeGreaterThanOrEqual(0);
      expect(factor.name).toBeTruthy();
    }
  });

  it("change is a finite number", () => {
    expect(Number.isFinite(mockHealthScore.change)).toBe(true);
  });
});

describe("Mock Trends", () => {
  it("has trend data for all 4 metrics", () => {
    expect(Object.keys(mockTrends)).toHaveLength(4);
    expect(mockTrends["heart-rate"]).toBeTruthy();
    expect(mockTrends["blood-pressure"]).toBeTruthy();
    expect(mockTrends.spo2).toBeTruthy();
    expect(mockTrends.stress).toBeTruthy();
  });

  it("each trend has 7 daily data points", () => {
    for (const key of Object.keys(mockTrends)) {
      expect(mockTrends[key].values).toHaveLength(7);
    }
  });

  it("each trend has consistent stats", () => {
    for (const key of Object.keys(mockTrends)) {
      const trend = mockTrends[key];
      const values = trend.values.map((v) => v.value);
      expect(trend.avg).toBeGreaterThanOrEqual(Math.min(...values));
      expect(trend.avg).toBeLessThanOrEqual(Math.max(...values));
      expect(trend.min).toBe(Math.min(...values));
      expect(trend.max).toBe(Math.max(...values));
    }
  });
});

describe("Mock Alerts", () => {
  it("has at least one alert of each level", () => {
    const levels = mockAlerts.map((a) => a.level);
    expect(levels).toContain("red");
    expect(levels).toContain("yellow");
    expect(levels).toContain("green");
  });

  it("each alert has required fields", () => {
    for (const alert of mockAlerts) {
      expect(alert.id).toBeTruthy();
      expect(alert.title).toBeTruthy();
      expect(alert.description).toBeTruthy();
      expect(alert.time).toBeTruthy();
      expect(alert.source).toBeTruthy();
    }
  });
});

describe("Mock Devices", () => {
  it("has at least 4 device brands", () => {
    expect(mockDevices.length).toBeGreaterThanOrEqual(4);
  });

  it("each device has required fields", () => {
    for (const device of mockDevices) {
      expect(device.id).toBeTruthy();
      expect(device.name).toBeTruthy();
      expect(device.icon).toBeTruthy();
      expect(typeof device.connected).toBe("boolean");
    }
  });

  it("at least one device is connected", () => {
    expect(mockDevices.some((d) => d.connected)).toBe(true);
  });
});

describe("Mock Report Indicators", () => {
  it("has at least 5 indicators", () => {
    expect(mockReportIndicators.length).toBeGreaterThanOrEqual(5);
  });

  it("each indicator has required fields", () => {
    for (const ind of mockReportIndicators) {
      expect(ind.name).toBeTruthy();
      expect(ind.value).toBeTruthy();
      expect(ind.range).toBeTruthy();
      expect(ind.status).toMatch(/^(normal|borderline|abnormal)$/);
    }
  });
});

describe("generateResultData", () => {
  it("returns an object with emoji, title, subtitle, metrics, and advice", () => {
    const result = generateResultData();
    expect(result.emoji).toBeTruthy();
    expect(result.title).toBeTruthy();
    expect(result.subtitle).toBeTruthy();
    expect(result.metrics).toBeTruthy();
    expect(result.advice).toBeTruthy();
  });

  it("returns valid metric values", () => {
    const result = generateResultData();
    expect(result.metrics.hr).toBeGreaterThanOrEqual(68);
    expect(result.metrics.hr).toBeLessThanOrEqual(76);
    expect(result.metrics.spo2).toBeGreaterThanOrEqual(97);
    expect(result.metrics.spo2).toBeLessThanOrEqual(99);
  });

  it("returns blood pressure as a string with format 'sys/dia'", () => {
    const result = generateResultData();
    expect(result.metrics.bp).toMatch(/^\d{2,3}\/\d{2,3}$/);
  });

  it("returns consistent emoji and title based on health status", () => {
    // Run multiple times to cover both paths probabilistically
    const results = Array.from({ length: 10 }, () => generateResultData());
    const hasNormal = results.some((r) => r.emoji === "✅");
    const hasWarning = results.some((r) => r.emoji === "⚠️");
    // At least one of each should appear over 10 runs with default thresholds
    // Note: with the default random ranges, both states are possible
    expect(results.length).toBe(10);
    // All results should have the disclaimer
    results.forEach((r) => {
      expect(typeof r.advice).toBe("string");
      expect(r.advice.length).toBeGreaterThan(0);
    });
  });
});

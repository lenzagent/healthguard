import { describe, it, expect, beforeEach } from "vitest";
import {
  processAnomalies,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  dismissAlert,
  clearResolvedAlerts,
  getAlerts,
  getAlertStats,
  hasActiveRedAlert,
  getPendingPushAlerts,
  markPushSent,
  buildPushPayload,
  resolveInactiveAlerts,
  generateMockAlertHistory,
  type ManagedAlert,
} from "@/lib/alertService";
import type { AnomalyResult } from "@/lib/anomalyDetection";

// Mock localStorage
const store: Record<string, string> = {};

beforeEach(() => {
  // Clear store
  Object.keys(store).forEach((k) => delete store[k]);
  // Mock localStorage
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
});

// ── Helper ─────────────────────────────────────────────────────────

function makeAnomaly(overrides: Partial<AnomalyResult> = {}): AnomalyResult {
  return {
    id: `anomaly-test-${Date.now()}-${Math.random()}`,
    type: "heart-rate-high",
    severity: "red",
    title: "🔴 心率异常偏高",
    description: "心率 130 bpm，超出正常范围。",
    metric: "heart-rate",
    currentValue: 130,
    referenceRange: "60-100 bpm",
    detectedAt: new Date().toISOString(),
    source: "Test Device",
    active: true,
    medicalAdvice: "建议休息。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    ...overrides,
  };
}

// ── processAnomalies ───────────────────────────────────────────────

describe("processAnomalies", () => {
  it("creates a new alert from an anomaly", () => {
    const anomaly = makeAnomaly();
    const alerts = processAnomalies([anomaly]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe("red");
    expect(alerts[0].title).toContain("心率异常偏高");
    expect(alerts[0].status).toBe("active");
    expect(alerts[0].occurrenceCount).toBe(1);
    expect(alerts[0].medicalAdvice).toBeDefined();
  });

  it("deduplicates same anomaly type + metric", () => {
    const anomaly1 = makeAnomaly();
    processAnomalies([anomaly1]);

    // Same type + metric, different timestamp
    const anomaly2 = makeAnomaly();
    const alerts = processAnomalies([anomaly2]);

    // Should update existing, not create new
    expect(alerts).toHaveLength(1);
    expect(alerts[0].occurrenceCount).toBe(2);
  });

  it("creates separate alerts for different metrics", () => {
    const hrAnomaly = makeAnomaly({ type: "heart-rate-high", metric: "heart-rate" });
    const spo2Anomaly = makeAnomaly({
      id: "anomaly-spo2",
      type: "spo2-crisis",
      severity: "red",
      title: "🔴 血氧严重偏低",
      description: "血氧 88%",
      metric: "spo2",
      currentValue: 88,
      referenceRange: "≥95%",
      medicalAdvice: "请立即就医。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    });

    processAnomalies([hrAnomaly]);
    const alerts = processAnomalies([spo2Anomaly]);

    // Should now have at least 2 alerts
    const allAlerts = getAlerts();
    expect(allAlerts.length).toBeGreaterThanOrEqual(2);
  });

  it("escalates yellow to red when severity increases", () => {
    // First, create a yellow alert
    const yellow = makeAnomaly({ severity: "yellow", type: "heart-rate-high", metric: "heart-rate" });
    processAnomalies([yellow]);

    // Then, a red anomaly for the same metric
    const red = makeAnomaly({ severity: "red", type: "heart-rate-high", metric: "heart-rate" });
    const alerts = processAnomalies([red]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe("red");
    expect(alerts[0].occurrenceCount).toBe(2);
  });

  it("returns empty array for no anomalies", () => {
    const alerts = processAnomalies([]);
    expect(alerts).toHaveLength(0);
  });
});

// ── Alert Actions ──────────────────────────────────────────────────

describe("acknowledgeAlert", () => {
  it("marks an alert as acknowledged", () => {
    const anomaly = makeAnomaly();
    const [created] = processAnomalies([anomaly]);

    const updated = acknowledgeAlert(created.id);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe("acknowledged");
    expect(updated!.acknowledgedAt).toBeDefined();
  });

  it("returns null for non-existent alert", () => {
    const result = acknowledgeAlert("non-existent-id");
    expect(result).toBeNull();
  });
});

describe("acknowledgeAllAlerts", () => {
  it("acknowledges all active alerts", () => {
    const a1 = makeAnomaly({ type: "heart-rate-high", metric: "heart-rate" });
    const a2 = makeAnomaly({
      id: "anomaly-spo2-2",
      type: "spo2-low",
      severity: "yellow",
      title: "🟡 血氧偏低",
      description: "血氧 93%",
      metric: "spo2",
      currentValue: 93,
      referenceRange: "≥95%",
    });
    processAnomalies([a1]);
    processAnomalies([a2]);

    const count = acknowledgeAllAlerts();
    expect(count).toBeGreaterThanOrEqual(1);

    const allAlerts = getAlerts();
    const active = allAlerts.filter((a) => a.status === "active");
    expect(active).toHaveLength(0);
  });
});

describe("dismissAlert", () => {
  it("resolves an alert", () => {
    const anomaly = makeAnomaly();
    const [created] = processAnomalies([anomaly]);

    const resolved = dismissAlert(created.id);
    expect(resolved).not.toBeNull();
    expect(resolved!.status).toBe("resolved");
    expect(resolved!.resolvedAt).toBeDefined();
  });
});

// ── resolveInactiveAlerts ──────────────────────────────────────────

describe("resolveInactiveAlerts", () => {
  it("resolves alerts whose anomalies are no longer active", () => {
    const anomaly = makeAnomaly();
    processAnomalies([anomaly]);

    // Call resolve with empty keys (no anomalies active anymore)
    const resolved = resolveInactiveAlerts([]);
    expect(resolved.length).toBeGreaterThanOrEqual(1);
    expect(resolved[0].status).toBe("resolved");
  });
});

// ── Query ──────────────────────────────────────────────────────────

describe("getAlerts", () => {
  it("filters by level", () => {
    const red = makeAnomaly({ severity: "red", type: "heart-rate-high", metric: "heart-rate" });
    const yellow = makeAnomaly({
      id: "anomaly-yellow",
      severity: "yellow",
      type: "spo2-low",
      title: "🟡 血氧偏低",
      description: "血氧 93%",
      metric: "spo2",
      currentValue: 93,
      referenceRange: "≥95%",
    });
    processAnomalies([red]);
    processAnomalies([yellow]);

    const redAlerts = getAlerts({ level: "red" });
    expect(redAlerts.every((a) => a.level === "red")).toBe(true);

    const yellowAlerts = getAlerts({ level: "yellow" });
    expect(yellowAlerts.every((a) => a.level === "yellow")).toBe(true);
  });

  it("filters by status", () => {
    const anomaly = makeAnomaly();
    const [created] = processAnomalies([anomaly]);
    acknowledgeAlert(created.id);

    const active = getAlerts({ status: "active" });
    expect(active).toHaveLength(0);

    const acknowledged = getAlerts({ status: "acknowledged" });
    expect(acknowledged.length).toBeGreaterThanOrEqual(1);
  });

  it("returns all alerts without filter", () => {
    const anomaly = makeAnomaly();
    processAnomalies([anomaly]);
    const all = getAlerts();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getAlertStats", () => {
  it("returns correct statistics", () => {
    const anomaly = makeAnomaly();
    processAnomalies([anomaly]);

    const stats = getAlertStats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.red).toBeGreaterThanOrEqual(1);
    expect(typeof stats.active).toBe("number");
    expect(typeof stats.resolved).toBe("number");
  });
});

describe("hasActiveRedAlert", () => {
  it("returns true when active red alert exists", () => {
    const anomaly = makeAnomaly({ severity: "red" });
    processAnomalies([anomaly]);
    expect(hasActiveRedAlert()).toBe(true);
  });

  it("returns false when no red alert exists", () => {
    const anomaly = makeAnomaly({ severity: "yellow" });
    processAnomalies([anomaly]);
    const all = getAlerts();
    // Acknowledge any active alerts
    for (const a of all) {
      if (a.status === "active") dismissAlert(a.id);
    }
    expect(hasActiveRedAlert()).toBe(false);
  });
});

// ── Push Notifications ─────────────────────────────────────────────

describe("push notification integration", () => {
  it("getPendingPushAlerts returns unsent alerts", () => {
    const anomaly = makeAnomaly({ severity: "red" });
    const [created] = processAnomalies([anomaly]);

    const pending = getPendingPushAlerts();
    expect(pending.some((a) => a.id === created.id)).toBe(true);
    expect(pending.every((a) => !a.pushSent)).toBe(true);
  });

  it("markPushSent updates push status", () => {
    const anomaly = makeAnomaly({ severity: "red" });
    const [created] = processAnomalies([anomaly]);

    markPushSent([created.id]);

    const pending = getPendingPushAlerts();
    expect(pending.some((a) => a.id === created.id)).toBe(false);
  });

  it("buildPushPayload creates valid payload", () => {
    const anomaly = makeAnomaly({ severity: "red" });
    const [created] = processAnomalies([anomaly]);

    const payload = buildPushPayload(created);
    expect(payload.title).toBeTruthy();
    expect(payload.body).toBeTruthy();
    expect(payload.data.alertId).toBe(created.id);
    expect(payload.data.level).toBe("red");
    expect(payload.urgency).toBe("high");
  });

  it("buildPushPayload sets normal urgency for yellow alerts", () => {
    const anomaly = makeAnomaly({ severity: "yellow" });
    const [created] = processAnomalies([anomaly]);

    const payload = buildPushPayload(created);
    expect(payload.urgency).toBe("normal");
  });

  it("truncates long alert descriptions in push body", () => {
    const anomaly = makeAnomaly({
      description: "A".repeat(200) + " very long description that should be truncated",
    });
    const [created] = processAnomalies([anomaly]);

    const payload = buildPushPayload(created);
    expect(payload.body.length).toBeLessThanOrEqual(124); // 120 chars + "…"
  });
});

// ── clearResolvedAlerts ────────────────────────────────────────────

describe("clearResolvedAlerts", () => {
  it("removes resolved alerts", () => {
    const anomaly = makeAnomaly();
    const [created] = processAnomalies([anomaly]);
    dismissAlert(created.id);

    const count = clearResolvedAlerts();
    expect(count).toBeGreaterThanOrEqual(1);

    const all = getAlerts();
    expect(all.some((a) => a.id === created.id)).toBe(false);
  });

  it("keeps active and acknowledged alerts", () => {
    const a1 = makeAnomaly({ type: "heart-rate-high", metric: "heart-rate" });
    const a2 = makeAnomaly({
      id: "anomaly-spo2-3",
      type: "spo2-low",
      severity: "yellow",
      title: "🟡 血氧偏低",
      description: "血氧 93%",
      metric: "spo2",
      currentValue: 93,
      referenceRange: "≥95%",
    });
    const [created1] = processAnomalies([a1]);
    processAnomalies([a2]);
    dismissAlert(created1.id);

    const before = getAlerts().length;
    clearResolvedAlerts();
    const after = getAlerts().length;

    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });
});

// ── Mock Data ──────────────────────────────────────────────────────

describe("generateMockAlertHistory", () => {
  it("generates the requested number of alerts", () => {
    const alerts = generateMockAlertHistory(7);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.length).toBeLessThanOrEqual(15);
  });

  it("generates alerts with all required fields", () => {
    const alerts = generateMockAlertHistory(5);
    for (const alert of alerts) {
      expect(alert.id).toBeTruthy();
      expect(alert.level).toMatch(/^(green|yellow|red)$/);
      expect(alert.title).toBeTruthy();
      expect(alert.description).toBeTruthy();
      expect(alert.status).toMatch(/^(active|acknowledged|resolved)$/);
    }
  });
});

/**
 * HealthGuard Alert Management Service
 *
 * Converts detected anomalies into user-facing alerts with:
 * - Deduplication (same anomaly type + metric = single alert)
 * - Lifecycle management (active → acknowledged → resolved)
 * - Escalation (yellow → red if condition worsens)
 * - Alert history (localStorage-backed for MVP)
 * - Push notification trigger points
 */

import type { AnomalyResult, AnomalySeverity } from "./anomalyDetection";
import { isEscalating } from "./anomalyDetection";
import type { AlertLevel } from "./types";

// ── Types ──────────────────────────────────────────────────────────

export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface ManagedAlert {
  /** Unique alert ID */
  id: string;
  /** Reference to the anomaly that generated this alert */
  anomalyId: string;
  /** Alert severity level */
  level: AlertLevel;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Timestamp when the alert was first created */
  createdAt: string;
  /** Timestamp of last update */
  updatedAt: string;
  /** The metric this alert relates to */
  source: string;
  /** Current lifecycle status */
  status: AlertStatus;
  /** When the alert was acknowledged (ISO 8601) */
  acknowledgedAt?: string;
  /** When the alert was resolved (ISO 8601) */
  resolvedAt?: string;
  /** Medical advice for red alerts */
  medicalAdvice?: string;
  /** Number of times this alert has been re-triggered */
  occurrenceCount: number;
  /** Whether push notification was sent */
  pushSent: boolean;
  /** Deduplication key matching anomaly type:metric */
  dedupKey: string;
}

export interface AlertFilter {
  level?: AlertLevel | "all";
  status?: AlertStatus | "all";
  metric?: string | "all";
  /** Filter alerts newer than this ISO timestamp */
  since?: string;
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  red: number;
  yellow: number;
  green: number;
}

// ── Storage ────────────────────────────────────────────────────────

const STORAGE_KEY = "healthguard-alerts";
const MAX_ALERTS = 200; // Keep history manageable

/** Get localStorage reference, works in browser and test (globalThis mock) */
function getStorage(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch { /* not available */ }
  try {
    const ls = (globalThis as Record<string, unknown>).window as Record<string, unknown> | undefined;
    if (ls && typeof (ls as Record<string, unknown>).localStorage !== "undefined") {
      return (ls as Record<string, Storage>).localStorage;
    }
  } catch { /* not available */ }
  return null;
}

function loadAlerts(): ManagedAlert[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ManagedAlert[];
  } catch {
    storage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveAlerts(alerts: ManagedAlert[]): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    // Prune old resolved alerts beyond the limit
    const pruned = pruneAlerts(alerts);
    storage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    console.warn("Failed to save alerts to localStorage");
  }
}

/**
 * Remove oldest resolved alerts when exceeding MAX_ALERTS.
 * Active and acknowledged alerts are always preserved.
 */
function pruneAlerts(alerts: ManagedAlert[]): ManagedAlert[] {
  if (alerts.length <= MAX_ALERTS) return alerts;

  const active = alerts.filter((a) => a.status !== "resolved");
  const resolved = alerts.filter((a) => a.status === "resolved");

  // Keep all non-resolved + most recent resolved up to limit
  const slotsForResolved = MAX_ALERTS - active.length;
  if (slotsForResolved <= 0) {
    // Edge case: more active alerts than limit — keep newest
    return [...active.slice(-MAX_ALERTS)];
  }

  const keptResolved = resolved
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, slotsForResolved);

  return [...active, ...keptResolved];
}

// ── Deduplication ──────────────────────────────────────────────────

/**
 * Generate a deduplication key from an anomaly.
 * Same type + same metric = same alert (updated instead of duplicated).
 */
function dedupKey(anomaly: AnomalyResult): string {
  return `${anomaly.type}:${anomaly.metric}`;
}

/**
 * Check if a new anomaly should be treated as the same alert as an existing one.
 */
function isSameAlert(existing: ManagedAlert, anomaly: AnomalyResult): boolean {
  return existing.anomalyId === anomaly.id || dedupKey(anomaly) === existing.dedupKey;
}

function dedupKeyFromAlert(alert: ManagedAlert): string {
  return alert.dedupKey;
}

// ── Alert Generation ───────────────────────────────────────────────

/**
 * Process detected anomalies and update the alert store.
 *
 * Rules:
 * - New anomaly → create alert
 * - Same anomaly recurring → update existing alert, increment count
 * - Anomaly resolved (no longer detected) → resolve alert
 * - Yellow anomaly → red for same metric → escalate existing alert
 *
 * @returns The new/updated alerts created in this cycle
 */
export function processAnomalies(anomalies: AnomalyResult[]): ManagedAlert[] {
  const existingAlerts = loadAlerts();
  const now = new Date().toISOString();
  const updated: ManagedAlert[] = [];

  for (const anomaly of anomalies) {
    const key = dedupKey(anomaly);
    const existingIdx = existingAlerts.findIndex(
      (a) => dedupKeyFromAlert(a) === key && a.status !== "resolved"
    );

    if (existingIdx >= 0) {
      // Update existing alert
      const existing = existingAlerts[existingIdx];
      const escalated = shouldEscalate(existing, anomaly);
      const updatedAlert: ManagedAlert = {
        ...existing,
        level: escalated ? anomaly.severity : existing.level,
        description: anomaly.description,
        updatedAt: now,
        occurrenceCount: existing.occurrenceCount + 1,
        anomalyId: anomaly.id,
        medicalAdvice: anomaly.medicalAdvice || existing.medicalAdvice,
      };
      existingAlerts[existingIdx] = updatedAlert;
      updated.push(updatedAlert);
    } else {
      // Create new alert
      const newAlert: ManagedAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        anomalyId: anomaly.id,
        level: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        createdAt: now,
        updatedAt: now,
        source: anomaly.metric,
        status: "active",
        medicalAdvice: anomaly.medicalAdvice,
        occurrenceCount: 1,
        pushSent: false,
        dedupKey: key,
      };
      existingAlerts.push(newAlert);
      updated.push(newAlert);
    }
  }

  // Check for escalation across multiple anomalies
  if (isEscalating(anomalies)) {
    const escalationAlert = createEscalationAlert(anomalies, now);
    existingAlerts.push(escalationAlert);
    updated.push(escalationAlert);
  }

  saveAlerts(existingAlerts);
  return updated;
}

/**
 * Auto-resolve alerts that are no longer being detected.
 * Call this periodically or when health data returns to normal.
 */
export function resolveInactiveAlerts(activeAnomalyKeys: string[]): ManagedAlert[] {
  const existingAlerts = loadAlerts();
  const now = new Date().toISOString();
  const resolved: ManagedAlert[] = [];

  for (const alert of existingAlerts) {
    if (alert.status === "active" || alert.status === "acknowledged") {
      const key = dedupKeyFromAlert(alert);
      if (!activeAnomalyKeys.includes(key)) {
        alert.status = "resolved";
        alert.resolvedAt = now;
        alert.updatedAt = now;
        resolved.push(alert);
      }
    }
  }

  if (resolved.length > 0) {
    saveAlerts(existingAlerts);
  }

  return resolved;
}

// ── Alert Actions ──────────────────────────────────────────────────

/**
 * Mark an alert as acknowledged by the user.
 */
export function acknowledgeAlert(alertId: string): ManagedAlert | null {
  const alerts = loadAlerts();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  alerts[idx] = {
    ...alerts[idx],
    status: "acknowledged",
    acknowledgedAt: now,
    updatedAt: now,
  };
  saveAlerts(alerts);
  return alerts[idx];
}

/**
 * Mark all active alerts as acknowledged.
 */
export function acknowledgeAllAlerts(): number {
  const alerts = loadAlerts();
  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < alerts.length; i++) {
    if (alerts[i].status === "active") {
      alerts[i] = {
        ...alerts[i],
        status: "acknowledged",
        acknowledgedAt: now,
        updatedAt: now,
      };
      count++;
    }
  }

  if (count > 0) saveAlerts(alerts);
  return count;
}

/**
 * Manually dismiss/resolve an alert.
 */
export function dismissAlert(alertId: string): ManagedAlert | null {
  const alerts = loadAlerts();
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx < 0) return null;

  const now = new Date().toISOString();
  alerts[idx] = {
    ...alerts[idx],
    status: "resolved",
    resolvedAt: now,
    updatedAt: now,
  };
  saveAlerts(alerts);
  return alerts[idx];
}

/**
 * Clear all resolved alerts from history.
 */
export function clearResolvedAlerts(): number {
  const alerts = loadAlerts();
  const kept = alerts.filter((a) => a.status !== "resolved");
  const removed = alerts.length - kept.length;
  saveAlerts(kept);
  return removed;
}

// ── Query ──────────────────────────────────────────────────────────

/**
 * Get alerts with optional filtering.
 */
export function getAlerts(filter?: AlertFilter): ManagedAlert[] {
  let alerts = loadAlerts();

  if (filter?.level && filter.level !== "all") {
    alerts = alerts.filter((a) => a.level === filter.level);
  }
  if (filter?.status && filter.status !== "all") {
    alerts = alerts.filter((a) => a.status === filter.status);
  }
  if (filter?.metric && filter.metric !== "all") {
    alerts = alerts.filter((a) => a.source === filter.metric);
  }
  if (filter?.since) {
    alerts = alerts.filter((a) => new Date(a.createdAt) >= new Date(filter.since!));
  }

  // Sort newest first
  return alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Get alert statistics.
 */
export function getAlertStats(): AlertStats {
  const alerts = loadAlerts();
  return {
    total: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    acknowledged: alerts.filter((a) => a.status === "acknowledged").length,
    resolved: alerts.filter((a) => a.status === "resolved").length,
    red: alerts.filter((a) => a.level === "red").length,
    yellow: alerts.filter((a) => a.level === "yellow").length,
    green: alerts.filter((a) => a.level === "green").length,
  };
}

/**
 * Check if there are any active red alerts (for dashboard banner).
 */
export function hasActiveRedAlert(): boolean {
  const alerts = loadAlerts();
  return alerts.some((a) => a.level === "red" && (a.status === "active" || a.status === "acknowledged"));
}

/**
 * Get active alerts that should trigger a push notification.
 */
export function getPendingPushAlerts(): ManagedAlert[] {
  return loadAlerts().filter(
    (a) => a.status === "active" && !a.pushSent && (a.level === "red" || a.level === "yellow")
  );
}

/**
 * Mark push notifications as sent for given alert IDs.
 */
export function markPushSent(alertIds: string[]): void {
  const alerts = loadAlerts();
  let changed = false;
  for (const alert of alerts) {
    if (alertIds.includes(alert.id) && !alert.pushSent) {
      alert.pushSent = true;
      changed = true;
    }
  }
  if (changed) saveAlerts(alerts);
}

// ── Internal Helpers ───────────────────────────────────────────────

function shouldEscalate(existing: ManagedAlert, anomaly: AnomalyResult): boolean {
  const severityRank: Record<AnomalySeverity, number> = { green: 0, yellow: 1, red: 2 };
  return severityRank[anomaly.severity] > severityRank[existing.level as AnomalySeverity];
}

function createEscalationAlert(anomalies: AnomalyResult[], now: string): ManagedAlert {
  const redAlerts = anomalies.filter((a) => a.severity === "red");
  const metrics = [...new Set(anomalies.map((a) => a.metric))].join("、");

  return {
    id: `alert-${Date.now()}-escalation`,
    anomalyId: "escalation",
    level: "red",
    title: "🔴 多项健康指标异常",
    description: `检测到${anomalies.length}项异常（涉及${metrics}），其中${redAlerts.length}项为红色预警。建议综合评估健康状况。`,
    createdAt: now,
    updatedAt: now,
    source: "escalation",
    status: "active",
    medicalAdvice: "多项指标同时异常需引起重视。建议尽快进行综合体检或咨询全科医生，排查潜在系统性问题。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    occurrenceCount: 1,
    pushSent: false,
    dedupKey: "escalation:multi-metric",
  };
}

// ── Push Notification Integration Point ────────────────────────────

/**
 * Prepare a push notification payload from an alert.
 * Integration point: call the actual push service (Firebase/APNs/etc.) with this payload.
 */
export function buildPushPayload(alert: ManagedAlert): PushNotificationPayload {
  return {
    title: alert.title,
    body: alert.description.slice(0, 120) + (alert.description.length > 120 ? "…" : ""),
    data: {
      alertId: alert.id,
      level: alert.level,
      metric: alert.source,
    },
    urgency: alert.level === "red" ? "high" : "normal",
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data: Record<string, string>;
  urgency: "high" | "normal";
}

// ── Mock Data Generator (for development/testing) ─────────────────

/**
 * Generate synthetic alert history for development and demo purposes.
 */
export function generateMockAlertHistory(daysBack: number = 7): ManagedAlert[] {
  const alerts: ManagedAlert[] = [];
  const now = Date.now();
  const scenarios = [
    { level: "red" as AlertLevel, title: "🔴 心率异常偏高", source: "heart-rate", desc: "静息心率 108 bpm，超出正常范围（60-100 bpm）。可能与睡眠不足有关。" },
    { level: "yellow" as AlertLevel, title: "🟡 睡眠质量下降趋势", source: "trend", desc: "连续3天深睡时长低于45分钟。本周平均睡眠评分较上周下降8%。" },
    { level: "green" as AlertLevel, title: "🟢 血压恢复正常", source: "blood-pressure", desc: "上周血压偏高已恢复至正常水平。继续保持健康的作息和饮食习惯。" },
    { level: "yellow" as AlertLevel, title: "🟡 血氧偏低", source: "spo2", desc: "血氧饱和度 93%，略低于正常范围。建议休息并观察。" },
    { level: "red" as AlertLevel, title: "🔴 血氧严重偏低", source: "spo2", desc: "夜间血氧降至 88%，低于危险阈值。需警惕睡眠呼吸暂停。" },
    { level: "yellow" as AlertLevel, title: "🟡 心率偏高", source: "heart-rate", desc: "静息心率 102 bpm，略高于正常。可能与咖啡因摄入或压力有关。" },
  ];

  for (let i = 0; i < Math.min(daysBack * 2, 15); i++) {
    const scenario = scenarios[i % scenarios.length];
    const ts = new Date(now - i * 8 * 60 * 60 * 1000).toISOString(); // every ~8 hours
    const status: AlertStatus = i < 2 ? "active" : i < 4 ? "acknowledged" : "resolved";

    alerts.push({
      id: `mock-alert-${i}`,
      anomalyId: `mock-anomaly-${i}`,
      level: scenario.level,
      title: scenario.title,
      description: scenario.desc,
      createdAt: ts,
      updatedAt: ts,
      source: scenario.source,
      status,
      acknowledgedAt: status !== "active" ? new Date(new Date(ts).getTime() + 3600000).toISOString() : undefined,
      resolvedAt: status === "resolved" ? new Date(new Date(ts).getTime() + 7200000).toISOString() : undefined,
      occurrenceCount: 1,
      pushSent: status !== "active",
      medicalAdvice: scenario.level === "red" ? "建议休息并观察。如持续异常请咨询医生。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。" : undefined,
      dedupKey: `mock:${scenario.source}:${i}`,
    });
  }

  return alerts;
}

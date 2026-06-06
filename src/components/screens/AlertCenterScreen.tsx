"use client";

import React, { useState, useMemo } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { useToast } from "@/components/ui/Toast";
import {
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  dismissAlert,
  clearResolvedAlerts,
  getAlertStats,
  generateMockAlertHistory,
  type ManagedAlert,
  type AlertFilter,
} from "@/lib/alertService";
import type { AlertLevel } from "@/lib/types";

const levelStyles: Record<AlertLevel, { border: string; badgeBg: string; badgeColor: string; badgeText: string }> = {
  red: { border: "#ef4444", badgeBg: "#fee2e2", badgeColor: "#b91c1c", badgeText: "红色预警" },
  yellow: { border: "#f59e0b", badgeBg: "#fef3c7", badgeColor: "#b45309", badgeText: "黄色预警" },
  green: { border: "#22c55e", badgeBg: "#dcfce7", badgeColor: "#15803d", badgeText: "已恢复" },
};

const statusLabels: Record<string, string> = {
  active: "未读",
  acknowledged: "已读",
  resolved: "已解除",
};

/** Map raw source/metric identifiers to user-facing display labels */
const sourceLabels: Record<string, string> = {
  "heart-rate": "Apple Watch",
  "blood-pressure": "Apple Watch",
  spo2: "Apple Watch",
  trend: "趋势检测",
  escalation: "综合评估",
};

/**
 * Alert Center Screen — displays alerts from the alert management service.
 * Falls back to generated mock alerts when no real alerts exist (demo mode).
 */
export function AlertCenterScreen() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<AlertLevel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "acknowledged" | "resolved">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load alerts, fall back to mock data if empty
  const alerts = useMemo(() => {
    const realAlerts = getAlerts();
    if (realAlerts.length === 0) {
      // Seed with mock data for demo/development
      return generateMockAlertHistory(7);
    }
    return realAlerts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const stats = useMemo(() => {
    try {
      return getAlertStats();
    } catch {
      return { total: alerts.length, active: 0, acknowledged: 0, resolved: 0, red: 0, yellow: 0, green: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Filter alerts
  const filtered = useMemo(() => {
    const filterObj: AlertFilter = {};
    if (filter !== "all") filterObj.level = filter;
    if (statusFilter !== "all") filterObj.status = statusFilter;

    if (filter === "all" && statusFilter === "all") {
      // Apply both filters manually since getAlerts handles OR, we want AND
      return alerts.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    let result = alerts;
    if (filter !== "all") result = result.filter((a) => a.level === filter);
    if (statusFilter !== "all") result = result.filter((a) => a.status === statusFilter);
    return result.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [alerts, filter, statusFilter]);

  const counts = {
    all: alerts.length,
    active: alerts.filter((a) => a.status === "active").length,
    red: alerts.filter((a) => a.level === "red" && a.status !== "resolved").length,
    yellow: alerts.filter((a) => a.level === "yellow" && a.status !== "resolved").length,
    green: alerts.filter((a) => a.level === "green").length,
  };

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId);
    setRefreshKey((k) => k + 1);
    showToast("已标记为已读");
  };

  const handleAcknowledgeAll = () => {
    const count = acknowledgeAllAlerts();
    setRefreshKey((k) => k + 1);
    showToast(count > 0 ? `已标记 ${count} 条为已读` : "没有未读告警");
  };

  const handleDismiss = (alertId: string) => {
    dismissAlert(alertId);
    setRefreshKey((k) => k + 1);
    showToast("告警已解除");
  };

  const handleClearResolved = () => {
    const removed = clearResolvedAlerts();
    setRefreshKey((k) => k + 1);
    showToast(removed > 0 ? `已清除 ${removed} 条历史告警` : "没有可清除的告警");
  };

  const hasResolved = alerts.some((a) => a.status === "resolved");

  return (
    <div>
      <TopNav
        title="告警中心"
        action={counts.active > 0 ? { label: "✓ 全部已读", onClick: handleAcknowledgeAll } : undefined}
      />
      <div className="screen-container animate-in">
        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            fontSize: "12px",
            color: "#6b7280",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Dot color="#ef4444" />红色=需关注 <Dot color="#f59e0b" />黄色=注意 <Dot color="#22c55e" />绿色=正常波动
        </div>

        {/* Level Filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          {(["all", "red", "yellow", "green"] as const).map((lvl) => (
            <FilterChip
              key={lvl}
              active={filter === lvl}
              onClick={() => setFilter(lvl)}
              label={
                lvl === "all"
                  ? "全部"
                  : lvl === "red"
                    ? "🔴 红色"
                    : lvl === "yellow"
                      ? "🟡 黄色"
                      : "🟢 绿色"
              }
              count={lvl === "all" ? counts.all : lvl === "red" ? counts.red : lvl === "yellow" ? counts.yellow : counts.green}
            />
          ))}
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {(["all", "active", "acknowledged", "resolved"] as const).map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={s === "all" ? "全部状态" : statusLabels[s]}
              count={undefined}
              size="sm"
            />
          ))}
          {hasResolved && (
            <button
              onClick={handleClearResolved}
              style={{
                marginLeft: "auto",
                fontSize: "12px",
                color: "#9ca3af",
                background: "none",
                border: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              🗑 清除已解除
            </button>
          )}
        </div>

        {/* Alert List */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
              没有此类告警
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>
              当前没有符合条件的告警记录
            </div>
          </div>
        ) : (
          filtered.map((alert) => {
            const s = levelStyles[alert.level];
            const isActive = alert.status === "active";
            return (
              <div
                key={alert.id}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "10px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  borderLeft: `4px solid ${s.border}`,
                  opacity: alert.status === "resolved" ? 0.65 : 1,
                  transition: "box-shadow 100ms ease, opacity 200ms ease",
                }}
                role="article"
                aria-label={`${alert.level} alert: ${alert.title}`}
              >
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "6px",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    {alert.title}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: s.badgeBg,
                      color: s.badgeColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.badgeText}
                  </span>
                </div>

                {/* Description */}
                <div
                  style={{
                    fontSize: "13px",
                    color: "#6b7280",
                    lineHeight: 1.5,
                    marginBottom: "6px",
                  }}
                >
                  {alert.description}
                </div>

                {/* Medical Advice for Red Alerts */}
                {alert.medicalAdvice && alert.level === "red" && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#b91c1c",
                      background: "#fef2f2",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      marginBottom: "8px",
                      lineHeight: 1.5,
                    }}
                  >
                    🏥 {alert.medicalAdvice}
                  </div>
                )}

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}
                >
                  <span>
                    🕐 {formatTime(alert.createdAt)}
                    {alert.source && (
                      <span style={{ marginLeft: "8px" }}>
                        · {sourceLabels[alert.source] || alert.source}
                      </span>
                    )}
                    {alert.occurrenceCount > 1 && (
                      <span style={{ marginLeft: "8px" }}>
                        · 重复{alert.occurrenceCount}次
                      </span>
                    )}
                    {alert.status !== "active" && (
                      <span style={{ marginLeft: "8px" }}>
                        · {statusLabels[alert.status]}
                      </span>
                    )}
                  </span>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "6px" }}>
                    {isActive && (
                      <ActionBtn
                        label="已读"
                        onClick={() => handleAcknowledge(alert.id)}
                      />
                    )}
                    {alert.status !== "resolved" && (
                      <ActionBtn
                        label="解除"
                        onClick={() => handleDismiss(alert.id)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        marginRight: "4px",
      }}
    />
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  size = "md",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number | undefined;
  size?: "sm" | "md";
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: size === "sm" ? "4px 10px" : "6px 14px",
        borderRadius: "20px",
        fontSize: size === "sm" ? "11px" : "13px",
        fontWeight: 500,
        border: `1px solid ${active ? "transparent" : "#e5e7eb"}`,
        background: active ? "#3b82f6" : "#fff",
        color: active ? "#fff" : "#6b7280",
        cursor: "pointer",
        transition: "all 100ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{ fontSize: "11px", marginLeft: "2px" }}>{count}</span>
      )}
    </button>
  );
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        fontSize: "11px",
        padding: "3px 10px",
        borderRadius: "6px",
        border: "1px solid #e5e7eb",
        background: "#f9fafb",
        color: "#6b7280",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;

    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${month}月${day}日 ${hours}:${mins}`;
  } catch {
    return iso;
  }
}

"use client";

import React, { useMemo, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { mockMetrics, mockUser, mockTrends, mockDailyHealthData } from "@/data/mockData";
import { computeHealthScore } from "@/lib/healthScoreEngine";
import { useToast } from "@/components/ui/Toast";
import { useAnomalyMonitor, useNotificationPermission } from "@/hooks/useAnomalyMonitor";
import type { DetectionInput } from "@/lib/anomalyDetection";

export function DashboardScreen() {
  const { navigate } = useApp();
  const { showToast } = useToast();

  // ── M4: Anomaly Detection & Alerting Integration ─────────────────
  const { state: monitorState, runDetection } = useAnomalyMonitor();
  const { isSupported: pushSupported, isGranted: pushGranted, requestPermission } =
    useNotificationPermission();

  // Request push notification permission on mount (one-time)
  useEffect(() => {
    if (pushSupported && !pushGranted && Notification.permission === "default") {
      // Defer to user interaction — don't auto-prompt on first load
      // User can enable via settings or the alert center
    }
  }, [pushSupported, pushGranted]);

  // Run initial detection using mock daily health data
  useEffect(() => {
    // Build DetectionInput from mock data
    const input: DetectionInput = {
      heartRate: 72,
      spo2: 98,
      hrv: 45,
      source: "Apple Watch",
      isSleepHours: false,
      recentHistory: {
        heartRate: mockTrends["heart-rate"]?.values.map((v) => ({
          timestamp: new Date(Date.now() - (6 - ["一","二","三","四","五","六","日"].indexOf(v.day)) * 86400000).toISOString(),
          value: v.value,
        })) || [],
        spo2: [],
      },
    };
    runDetection(input);
  }, [runDetection]);

  // Live alert counts from the anomaly monitor
  const redAlertCount = monitorState.alerts.filter(
    (a) => a.level === "red" && a.status !== "resolved"
  ).length;
  const activeAlertCount = monitorState.alerts.filter(
    (a) => a.status === "active"
  ).length;

  // Compute live health score from mock data
  const scoreResult = useMemo(
    () => computeHealthScore(mockDailyHealthData),
    []
  );

  const handleMetricClick = (type: string) => {
    showToast(`${type} 详情页面开发中`);
  };

  return (
    <div className="screen-container animate-in">
      {/* Greeting */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#111827" }}>
            你好，{mockUser.name} 👋
          </h2>
          <p style={{ fontSize: "13px", color: "#6b7280" }}>
            2026-06-04 周四 · 上午 9:30
          </p>
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("alert-center")}
            ariaLabel="告警中心"
          >
            <span style={{ fontSize: "20px", position: "relative" }}>
              🔔
              {(redAlertCount > 0 || activeAlertCount > 0) && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-4px",
                    minWidth: "16px",
                    height: "16px",
                    background: "#ef4444",
                    borderRadius: "8px",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                  data-testid="alert-dot"
                >
                  {redAlertCount > 0 ? redAlertCount : activeAlertCount}
                </span>
              )}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("settings")}
            ariaLabel="设置"
          >
            <span style={{ fontSize: "24px" }}>⚙️</span>
          </Button>
        </div>
      </div>

      {/* Alert Banner — live from anomaly monitor */}
      {monitorState.activeRedAlert && (
        <div
          className="alert-banner danger"
          style={{
            background: "#fee2e2",
            borderLeft: "4px solid #ef4444",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
          role="alert"
        >
          <span style={{ fontSize: "20px" }}>⚠️</span>
          <div>
            <strong style={{ display: "block", marginBottom: "2px", fontSize: "14px" }}>
              发现{redAlertCount}项红色预警
            </strong>
            <span style={{ fontSize: "14px", color: "#374151" }}>
              {monitorState.alerts
                .filter((a) => a.level === "red" && a.status !== "resolved")
                .slice(0, 2)
                .map((a) => a.title.replace(/^[🔴🟡🟢]\s*/, ""))
                .join(" · ")}
               — 请查看告警中心
            </span>
          </div>
        </div>
      )}

      {/* Health Score Mini */}
      <Card
        onClick={() => navigate("health-score")}
        style={{
          background: "linear-gradient(135deg, #eff6ff, #f0fdf4)",
          border: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <ScoreRing
            value={scoreResult.overall}
            size={72}
            strokeWidth={6}
            color={
              scoreResult.overall >= 80 ? "#22c55e"
              : scoreResult.overall >= 60 ? "#3b82f6"
              : scoreResult.overall >= 40 ? "#f59e0b"
              : "#ef4444"
            }
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
              综合健康评分
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
              {scoreResult.overall >= 80 ? "优秀" : scoreResult.overall >= 60 ? "良好"
                : scoreResult.overall >= 40 ? "一般" : "需关注"}
              {scoreResult.weeklyChange !== 0 && (
                <> · 比上周 {scoreResult.weeklyChange > 0 ? "+" : ""}{scoreResult.weeklyChange} {
                  scoreResult.weeklyChange > 0 ? "↑" : "↓"
                }</>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              {scoreResult.dimensions.slice(0, 3).map((dim) => (
                <Chip
                  key={dim.name}
                  label={`${dim.icon}${dim.trend === "up" ? "↑" : dim.trend === "down" ? "↓" : "→"}`}
                  color={dim.status === "excellent" || dim.status === "good" ? "green" : "yellow"}
                />
              ))}
            </div>
          </div>
          <span style={{ color: "#d1d5db", fontSize: "20px" }}>›</span>
        </div>
      </Card>

      {/* Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {mockMetrics.map((metric) => (
          <MetricCard
            key={metric.type}
            {...metric}
            onClick={() => handleMetricClick(metric.type)}
          />
        ))}
      </div>

      {/* Stress Assessment */}
      <Card>
        <CardTitle>🧠 压力评估</CardTitle>
        <div style={{ marginTop: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "6px",
            }}
          >
            <span>放松</span>
            <span>中等</span>
            <span>高压力</span>
          </div>
          <ProgressBar value={45} color="mid" />
          <div style={{ textAlign: "center", marginTop: "4px" }}>
            <span style={{ fontSize: "13px", color: "#f59e0b", fontWeight: 600 }}>
              中等 · 45%
            </span>
          </div>
        </div>
      </Card>

      {/* Today Summary */}
      <Card>
        <CardTitle>📋 今日摘要</CardTitle>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <SummaryItem status="normal">心率 72 bpm — 正常范围</SummaryItem>
          <SummaryItem status="normal">血压 120/80 — 理想血压</SummaryItem>
          <SummaryItem status="normal">血氧 98% — 正常</SummaryItem>
          <SummaryItem status="caution">压力中等 — 建议适当休息</SummaryItem>
        </ul>
      </Card>

      {/* Mini Trend */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <CardTitle>📈 最近7天趋势</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("trends")}>
            更多 →
          </Button>
        </div>
        <MiniTrendChart data={mockTrends["heart-rate"]} />
        <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "8px" }}>
          ❤️ 心率趋势 · 正常波动范围
        </p>
      </Card>

      {/* CTA */}
      <Button variant="accent" onClick={() => navigate("check-prepare")}>
        📹 开始检测
      </Button>
      <p
        style={{
          fontSize: "12px",
          color: "#9ca3af",
          textAlign: "center",
          marginTop: "8px",
        }}
      >
        只需30秒 · 非接触式 · 数据仅本地处理
      </p>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function ScoreRing({
  value,
  size,
  strokeWidth,
  color,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontSize: size > 72 ? "42px" : "22px",
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            color,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function Chip({ label, color }: { label: string; color: "green" | "yellow" }) {
  const bg = color === "green" ? "#dcfce7" : "#fef3c7";
  const c = color === "green" ? "#15803d" : "#b45309";
  return (
    <span
      style={{
        fontSize: "11px",
        padding: "2px 8px",
        borderRadius: "999px",
        background: bg,
        color: c,
      }}
    >
      {label}
    </span>
  );
}

function SummaryItem({
  status,
  children,
}: {
  status: "normal" | "caution" | "abnormal";
  children: React.ReactNode;
}) {
  const colors = { normal: "#22c55e", caution: "#f59e0b", abnormal: "#ef4444" };
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "14px",
        color: "#374151",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: colors[status],
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {children}
    </li>
  );
}

function MiniTrendChart({
  data,
}: {
  data: { values: { day: string; value: number }[]; color: string };
}) {
  const maxVal = Math.max(...data.values.map((v) => v.value));
  return (
    <div
      style={{
        height: "120px",
        display: "flex",
        alignItems: "flex-end",
        gap: "12px",
        padding: "8px 0",
      }}
      aria-label={`7天趋势图，最高值${maxVal}`}
    >
      {data.values.map((item, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            height: "100%",
          }}
        >
          <div
            style={{
              width: "100%",
              height: `${(item.value / maxVal) * 100}%`,
              borderRadius: "4px 4px 0 0",
              background: data.color,
              minHeight: "4px",
              transition: "height 500ms ease",
            }}
          />
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>{item.day}</span>
        </div>
      ))}
    </div>
  );
}

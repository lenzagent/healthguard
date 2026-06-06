"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { mockDailySummary } from "@/data/mockData";
import type { DailySummary, SummaryClickEvent } from "@/lib/types";

/** Track which sections the user has viewed for analytics */
function useSectionTracker(summaryId: string, source: "push" | "in-app") {
  const [viewedSections, setViewedSections] = useState<Set<string>>(new Set());
  const [startTime] = useState(Date.now());

  const markViewed = useCallback((section: string) => {
    setViewedSections((prev) => {
      if (prev.has(section)) return prev;
      return new Set([...prev, section]);
    });
  }, []);

  // Send click event when component unmounts
  useEffect(() => {
    return () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const event: Partial<SummaryClickEvent> = {
        summaryId,
        source,
        sectionsViewed: [...viewedSections],
        timeSpentSeconds: timeSpent,
      };
      // Fire-and-forget analytics
      fetch("/api/summary/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {
        // Silently fail — analytics should never block UX
      });
    };
  }, [summaryId, source, viewedSections, startTime]);

  return { viewedSections, markViewed };
}

export function DailySummaryScreen() {
  const { state, navigate, toggleSummaryEnabled } = useApp();
  const [summary, setSummary] = useState<DailySummary>(mockDailySummary);
  const [loading, setLoading] = useState(false);
  const { markViewed } = useSectionTracker(summary.id, "in-app");

  // In MVP, use mock data. Post-MVP: fetch from API
  const refreshSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/summary/generate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      // Keep existing mock data on error
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <TopNav
        title="📋 每日健康摘要"
        showBack
        action={
          loading
            ? undefined
            : { label: "🔄", onClick: refreshSummary }
        }
      />
      <div className="screen-container animate-in" style={{ paddingBottom: "80px" }}>
        {loading && (
          <div
            style={{
              textAlign: "center",
              padding: "24px",
              color: "#6b7280",
            }}
          >
            <span style={{ fontSize: "32px" }}>⏳</span>
            <p style={{ marginTop: "8px" }}>AI 正在为你生成个性化摘要...</p>
          </div>
        )}

        {/* Greeting Banner */}
        <GreetingCard summary={summary} />

        {/* Overall Health Score */}
        <HealthScoreSnapshot
          score={summary.healthScore}
          change={summary.healthScoreChange}
          message={summary.overallMessage}
          onView={() => markViewed("health-score")}
        />

        {/* Sleep Analysis */}
        <SleepSection
          sleep={summary.sleep}
          onView={() => markViewed("sleep")}
        />

        {/* Exercise Recommendation */}
        <ExerciseSection
          exercise={summary.exercise}
          onView={() => markViewed("exercise")}
        />

        {/* Trends */}
        <TrendsSection
          trends={summary.trends}
          onView={() => markViewed("trends")}
        />

        {/* Anomalies */}
        {summary.anomalies.length > 0 && (
          <AnomaliesSection
            anomalies={summary.anomalies}
            onView={() => markViewed("anomalies")}
          />
        )}

        {/* Disclaimer */}
        <Disclaimer text={summary.disclaimer} />

        {/* CTA */}
        <div style={{ marginTop: "24px", display: "flex", gap: "8px" }}>
          <Button
            variant="secondary"
            onClick={() => navigate("health-score")}
            style={{ flex: 1 }}
          >
            📊 查看详细评分
          </Button>
          <Button
            variant="accent"
            onClick={() => navigate("settings")}
            style={{ flex: 1 }}
          >
            ⚙️ 推送设置
          </Button>
        </div>

        {/* Summary settings */}
        <SummarySettings
          preferences={state.summaryPreferences}
          onToggle={toggleSummaryEnabled}
        />
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function GreetingCard({ summary }: { summary: DailySummary }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)",
        borderRadius: "16px",
        padding: "24px 20px",
        marginBottom: "16px",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#111827",
          margin: 0,
          marginBottom: "8px",
        }}
      >
        {summary.greeting}
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "#4b5563",
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {summary.overallMessage}
      </p>
      <p
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          margin: 0,
          marginTop: "8px",
        }}
      >
        生成时间：{new Date(summary.generatedAt).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

function HealthScoreSnapshot({
  score,
  change,
  message,
  onView,
}: {
  score: number;
  change: number;
  message: string;
  onView: () => void;
}) {
  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  const label =
    score >= 80 ? "优秀" : score >= 60 ? "良好" : score >= 40 ? "一般" : "需关注";

  return (
    <Card onClick={onView}>
      <CardTitle>🏥 今日健康评分</CardTitle>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginTop: "12px",
        }}
      >
        {/* Score Ring */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: `conic-gradient(${color} ${score}%, #e5e7eb ${score}% 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                fontWeight: 800,
                color,
                fontFamily: "var(--font-mono)",
              }}
            >
              {score}
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "4px",
            }}
          >
            <StatusBadge status={label} color={color} />
            <ChangeChip value={change} />
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "#6b7280",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
        </div>
      </div>
    </Card>
  );
}

function SleepSection({
  sleep,
  onView,
}: {
  sleep: DailySummary["sleep"];
  onView: () => void;
}) {
  const qualityColors: Record<string, string> = {
    excellent: "#22c55e",
    good: "#3b82f6",
    fair: "#f59e0b",
    poor: "#ef4444",
  };
  const color = qualityColors[sleep.quality] || "#3b82f6";

  return (
    <Card onClick={onView}>
      <CardTitle>😴 昨晚睡眠分析</CardTitle>
      <div style={{ marginTop: "12px" }}>
        {/* Sleep metrics row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <MiniStat
            label="睡眠时长"
            value={`${sleep.durationHours}h`}
            color={color}
          />
          <MiniStat
            label="深睡时长"
            value={`${sleep.deepSleepMinutes}min`}
            sub={`目标 ≥${sleep.deepSleepTarget}min`}
            color={sleep.deepSleepMinutes >= sleep.deepSleepTarget ? "#22c55e" : "#f59e0b"}
          />
          <MiniStat
            label="较7日均值"
            value={`${sleep.comparisonPercent > 0 ? "+" : ""}${sleep.comparisonPercent}%`}
            color={sleep.comparisonPercent >= 0 ? "#22c55e" : "#f59e0b"}
          />
        </div>

        {/* Deep sleep progress bar */}
        <div style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "#9ca3af",
              marginBottom: "4px",
            }}
          >
            <span>深睡进度</span>
            <span>
              {sleep.deepSleepMinutes}/{sleep.deepSleepTarget} min
            </span>
          </div>
          <ProgressBar
            value={Math.min((sleep.deepSleepMinutes / sleep.deepSleepTarget) * 100, 100)}
            color={
              sleep.deepSleepMinutes >= sleep.deepSleepTarget ? "normal" : "mid"
            }
          />
        </div>

        {/* AI Insights */}
        <InsightBox type="info">{sleep.insights}</InsightBox>
        <InsightBox type="tip">{sleep.suggestion}</InsightBox>
      </div>
    </Card>
  );
}

function ExerciseSection({
  exercise,
  onView,
}: {
  exercise: DailySummary["exercise"];
  onView: () => void;
}) {
  const intensityColors: Record<string, string> = {
    low: "#22c55e",
    moderate: "#3b82f6",
    vigorous: "#f59e0b",
  };
  const intensityLabels: Record<string, string> = {
    low: "低强度",
    moderate: "中等强度",
    vigorous: "高强度",
  };

  return (
    <Card onClick={onView}>
      <CardTitle>🏃 今日运动建议</CardTitle>
      <div style={{ marginTop: "12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              background: "#eff6ff",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "28px", fontWeight: 800, color: "#3b82f6" }}>
              {exercise.recommendedMinutes}
            </span>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              推荐分钟
            </span>
          </div>
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              flex: 1,
            }}
          >
            <span style={{ fontSize: "16px", fontWeight: 600, color: "#15803d" }}>
              {exercise.recommendedType}
            </span>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              推荐类型
            </span>
          </div>
          <div
            style={{
              background: "#fef3c7",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: intensityColors[exercise.intensity],
              }}
            >
              {intensityLabels[exercise.intensity]}
            </span>
            <span
              style={{
                display: "block",
                fontSize: "12px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              强度
            </span>
          </div>
        </div>

        <InsightBox type="info">{exercise.reason}</InsightBox>

        {exercise.caution && (
          <InsightBox type="warning">{exercise.caution}</InsightBox>
        )}
      </div>
    </Card>
  );
}

function TrendsSection({
  trends,
  onView,
}: {
  trends: DailySummary["trends"];
  onView: () => void;
}) {
  const directionIcons: Record<string, string> = {
    up: "📈",
    down: "📉",
    stable: "📊",
  };
  const directionColors: Record<string, string> = {
    up: "#22c55e",
    down: "#ef4444",
    stable: "#3b82f6",
  };

  return (
    <Card onClick={onView}>
      <CardTitle>📈 趋势延续提醒</CardTitle>
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {trends.map((trend) => (
          <div
            key={trend.metricName}
            style={{
              background: "#f9fafb",
              borderRadius: "10px",
              padding: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px",
              }}
            >
              <span style={{ fontSize: "18px" }}>{trend.metricIcon}</span>
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                {trend.metricName}
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: directionColors[trend.direction],
                }}
              >
                {directionIcons[trend.direction]}{" "}
                {trend.direction === "up"
                  ? "上升"
                  : trend.direction === "down"
                    ? "下降"
                    : "稳定"}
              </span>
            </div>
            <p
              style={{
                fontSize: "13px",
                color: "#4b5563",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {trend.description}
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "#3b82f6",
                margin: "4px 0 0",
              }}
            >
              💡 {trend.suggestion}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AnomaliesSection({
  anomalies,
  onView,
}: {
  anomalies: DailySummary["anomalies"];
  onView: () => void;
}) {
  const levelStyles: Record<string, { bg: string; border: string; icon: string }> = {
    green: { bg: "#f0fdf4", border: "#22c55e", icon: "🟢" },
    yellow: { bg: "#fef3c7", border: "#f59e0b", icon: "🟡" },
    red: { bg: "#fee2e2", border: "#ef4444", icon: "🔴" },
  };

  return (
    <Card onClick={onView}>
      <CardTitle>⚠️ 异常指标关注</CardTitle>
      <div
        style={{
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {anomalies.map((anomaly) => {
          const style = levelStyles[anomaly.alertLevel] || levelStyles.yellow;
          return (
            <div
              key={anomaly.metricName}
              style={{
                background: style.bg,
                borderLeft: `4px solid ${style.border}`,
                borderRadius: "8px",
                padding: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>{anomaly.metricIcon}</span>
                <span style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                  {anomaly.metricName}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: style.border,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {anomaly.currentValue}
                </span>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  margin: "0 0 4px",
                }}
              >
                正常范围：{anomaly.normalRange}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#374151",
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                {anomaly.description}
              </p>
              <p
                style={{
                  fontSize: "13px",
                  color: "#b45309",
                  margin: "4px 0 0",
                }}
              >
                💡 {anomaly.recommendation}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Disclaimer({ text }: { text: string }) {
  return (
    <div
      style={{
        background: "#f9fafb",
        borderRadius: "10px",
        padding: "12px 14px",
        marginTop: "16px",
        border: "1px solid #f3f4f6",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          color: "#9ca3af",
          margin: 0,
          lineHeight: 1.5,
          textAlign: "center",
        }}
      >
        ⚕️ {text}
      </p>
    </div>
  );
}

function SummarySettings({
  preferences,
  onToggle,
}: {
  preferences: { enabled: boolean; pushTime: string };
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        marginTop: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div>
        <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
          🔔 每日推送
        </span>
        <span
          style={{
            display: "block",
            fontSize: "12px",
            color: "#9ca3af",
            marginTop: "2px",
          }}
        >
          每天 {preferences.pushTime} 推送
        </span>
      </div>
      <ToggleSwitch enabled={preferences.enabled} onToggle={onToggle} />
    </div>
  );
}

// ── Atomic UI Helpers ───────────────────────────────────────

function MiniStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <span
        style={{
          display: "block",
          fontSize: "20px",
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: "11px", color: "#9ca3af" }}>{label}</span>
      {sub && (
        <span style={{ display: "block", fontSize: "10px", color: "#d1d5db" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function InsightBox({
  type,
  children,
}: {
  type: "info" | "tip" | "warning";
  children: React.ReactNode;
}) {
  const styles: Record<string, { bg: string; emoji: string; color: string }> = {
    info: { bg: "#eff6ff", emoji: "📊", color: "#3b82f6" },
    tip: { bg: "#f0fdf4", emoji: "💡", color: "#15803d" },
    warning: { bg: "#fef3c7", emoji: "⚠️", color: "#b45309" },
  };
  const s = styles[type];
  return (
    <div
      style={{
        background: s.bg,
        borderRadius: "8px",
        padding: "10px 12px",
        marginBottom: "8px",
        fontSize: "13px",
        color: s.color,
        lineHeight: 1.5,
      }}
    >
      <span style={{ marginRight: "4px" }}>{s.emoji}</span>
      {children}
    </div>
  );
}

function StatusBadge({ status, color }: { status: string; color: string }) {
  return (
    <span
      style={{
        fontSize: "12px",
        fontWeight: 600,
        padding: "2px 10px",
        borderRadius: "999px",
        background: `${color}18`,
        color,
      }}
    >
      {status}
    </span>
  );
}

function ChangeChip({ value }: { value: number }) {
  const isPositive = value > 0;
  return (
    <span
      style={{
        fontSize: "12px",
        fontWeight: 500,
        color: isPositive ? "#15803d" : value < 0 ? "#b91c1c" : "#6b7280",
      }}
    >
      {isPositive ? "↑" : value < 0 ? "↓" : "→"} {Math.abs(value)}
    </span>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-label={enabled ? "关闭每日推送" : "开启每日推送"}
      aria-pressed={enabled}
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "999px",
        border: "none",
        cursor: "pointer",
        background: enabled ? "#3b82f6" : "#d1d5db",
        position: "relative",
        transition: "background 200ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: enabled ? "23px" : "3px",
          width: "22px",
          height: "22px",
          background: "#fff",
          borderRadius: "50%",
          transition: "left 200ms ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      />
    </button>
  );
}

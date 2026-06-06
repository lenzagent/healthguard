"use client";

import React, { useMemo } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { mockDailyHealthData } from "@/data/mockData";
import { computeHealthScore } from "@/lib/healthScoreEngine";
import type { ScoreStatus, TrendDirection } from "@/lib/types";

function statusColor(status: ScoreStatus): string {
  switch (status) {
    case "excellent": return "#22c55e";
    case "good": return "#3b82f6";
    case "fair": return "#f59e0b";
    case "poor": return "#ef4444";
  }
}

function trendArrow(trend: TrendDirection): string {
  switch (trend) {
    case "up": return "↑";
    case "down": return "↓";
    case "stable": return "→";
  }
}

function trendColor(trend: TrendDirection): string {
  switch (trend) {
    case "up": return "#22c55e";
    case "down": return "#ef4444";
    case "stable": return "#9ca3af";
  }
}

export function HealthScoreScreen() {
  const result = useMemo(
    () => computeHealthScore(mockDailyHealthData),
    []
  );

  // ── Insufficient data state ──────────────────────────────────
  if (result.insufficientData) {
    return (
      <div>
        <TopNav title="综合健康评分" />
        <div className="screen-container animate-in">
          <Card>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 0",
                gap: "16px",
              }}
            >
              <span style={{ fontSize: "48px" }}>📊</span>
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>
                数据不足
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  textAlign: "center",
                  lineHeight: 1.6,
                  padding: "0 16px",
                }}
              >
                {result.explanation}
              </p>
              <div
                style={{
                  background: "#f0fdf4",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "13px",
                  color: "#15803d",
                }}
              >
                已同步 {result.dataDays} 天数据 · 至少需要 3 天
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const { overall, weeklyChange, dimensions, globalFlags, explanation, dataDays } = result;

  const strokeColor = overall >= 80 ? "#22c55e" : overall >= 60 ? "#3b82f6" : overall >= 40 ? "#f59e0b" : "#ef4444";
  const statusText = overall >= 80 ? "优秀" : overall >= 60 ? "良好" : overall >= 40 ? "一般" : "需关注";

  return (
    <div>
      <TopNav title="综合健康评分" />
      <div className="screen-container animate-in">
        {/* Score Ring */}
        <Card>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
            <div style={{ position: "relative", width: "140px", height: "140px" }}>
              <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="70" cy="70" r="60" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="70" cy="70" r="60" fill="none" stroke={strokeColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="377"
                  strokeDashoffset={377 * (1 - overall / 100)}
                  style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.34,1.56,0.64,1)" }}
                />
              </svg>
              <div
                style={{
                  position: "absolute", inset: 0, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "42px", fontWeight: 800,
                    fontFamily: "var(--font-mono)", color: "#111827",
                  }}
                >
                  {overall}
                </span>
                <span style={{ fontSize: "13px", color: "#6b7280" }}>综合健康分</span>
              </div>
            </div>
            <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
              {statusText}
              {weeklyChange !== 0 && (
                <> · 较上周 {weeklyChange > 0 ? `+${weeklyChange}` : weeklyChange} 分</>
              )}
            </span>
          </div>
          <p
            style={{
              fontSize: "13px", color: "#6b7280", textAlign: "center", marginTop: "8px",
            }}
          >
            基于最近{dataDays}天数据综合评估 · 每日更新
          </p>
        </Card>

        {/* Dimension Breakdown */}
        <Card>
          <CardTitle>📊 评分构成</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            {dimensions.map((dim) => {
              const maxScore = Math.round(dim.weight * 100);
              return (
                <div key={dim.name}>
                  <div
                    style={{
                      display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "4px 0", fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "#4b5563" }}>
                      {dim.icon} {dim.nameZh}
                      <span style={{ fontSize: "11px", color: trendColor(dim.trend), marginLeft: "6px" }}>
                        {trendArrow(dim.trend)} {dim.trendDelta > 0 ? `+${dim.trendDelta}` : dim.trendDelta}
                      </span>
                    </span>
                    <span style={{
                      fontWeight: 600, fontFamily: "var(--font-mono)",
                      color: statusColor(dim.status),
                    }}>
                      {dim.rawScore}/{maxScore}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%", height: "6px", background: "#e5e7eb",
                      borderRadius: "999px", overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${dim.rawScore}%`,
                        height: "100%", borderRadius: "999px",
                        background: statusColor(dim.status),
                        transition: "width 500ms ease",
                      }}
                    />
                  </div>
                  {/* Flags for this dimension */}
                  {dim.flags.length > 0 && (
                    <div style={{ marginTop: "4px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {dim.flags.map((flag, fi) => (
                        <span
                          key={fi}
                          style={{
                            fontSize: "11px", padding: "2px 6px", borderRadius: "4px",
                            background: dim.status === "poor" ? "#fee2e2" : "#fef3c7",
                            color: dim.status === "poor" ? "#991b1b" : "#92400e",
                          }}
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Global Flags */}
        {globalFlags.length > 0 && (
          <Card>
            <CardTitle>⚠️ 关注事项</CardTitle>
            <ul style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {globalFlags.map((flag, i) => (
                <li
                  key={i}
                  style={{
                    fontSize: "13px", color: "#374151", display: "flex",
                    gap: "8px", alignItems: "flex-start",
                  }}
                >
                  <span style={{ flexShrink: 0 }}>•</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* AI Insight */}
        <div
          style={{
            background: "#eff6ff", borderRadius: "12px", padding: "16px",
            fontSize: "14px", color: "#1e40af", lineHeight: 1.6,
          }}
        >
          <strong style={{ display: "block", marginBottom: "4px" }}>💡 AI健康洞察</strong>
          {explanation}
          <div
            style={{
              fontSize: "11px", color: "#93c5fd", marginTop: "8px",
              borderTop: "1px solid #bfdbfe", paddingTop: "8px",
            }}
          >
            本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案
          </div>
        </div>
      </div>
    </div>
  );
}

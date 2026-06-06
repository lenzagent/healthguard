"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { mockReportComparison, mockReportRecords } from "@/data/mockData";

const METRIC_COLORS: Record<string, string> = {
  BMI: "#3b82f6",
  "总胆固醇 (TC)": "#ef4444",
  "甘油三酯 (TG)": "#f97316",
  "LDL-C": "#8b5cf6",
  "空腹血糖 (FPG)": "#ec4899",
  "尿酸 (UA)": "#f59e0b",
  "ALT": "#06b6d4",
  "HDL-C": "#22c55e",
};

function TrendMiniChart({
  label,
  data,
  unit,
  color,
  invertGood,
}: {
  label: string;
  data: { date: string; value: number }[];
  unit: string;
  color: string;
  invertGood?: boolean;
}) {
  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1;
  const range = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(" ");

  const first = values[0];
  const last = values[values.length - 1];
  const delta = last - first;
  const trend = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const isBad = invertGood ? delta < 0 : delta > 0;
  const trendColor = delta === 0 ? "#6b7280" : isBad ? "#ef4444" : "#22c55e";

  return (
    <div style={{
      background: "#fff", borderRadius: "8px", padding: "12px",
      border: "1px solid #f3f4f6", marginBottom: "8px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 600, color: trendColor }}>
          {trend} {Math.abs(delta).toFixed(1)} {unit}
        </span>
      </div>
      <div style={{ height: "60px", position: "relative" }}>
        <svg width="100%" height="60" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2px" }}>
          {data.map((d, i) => (
            <span key={i} style={{ fontSize: "10px", color: "#9ca3af" }}>
              {d.date.slice(0, 4)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportCompareScreen() {
  const { navigate } = useApp();
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const comparison = mockReportComparison;

  const metrics = comparison.indicators.filter((name) =>
    comparison.timeline.every((t) => name in t.values)
  );

  return (
    <div>
      <TopNav title="历年报告对比" showBack />
      <div className="screen-container animate-in">
        {/* Report selector */}
        <div style={{
          display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto",
        }}>
          {comparison.reports.map((report, i) => (
            <div key={report.id} style={{
              padding: "8px 14px", borderRadius: "8px", background: i === 0 ? "#eff6ff" : "#f3f4f6",
              border: i === 0 ? "1px solid #3b82f6" : "1px solid transparent",
              fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap",
              color: i === 0 ? "#1e40af" : "#6b7280",
            }}>
              {report.title.replace("年度体检报告", "")}
            </div>
          ))}
        </div>

        {/* Trend charts */}
        <Card>
          <CardTitle>📈 核心指标趋势</CardTitle>
          <div style={{ marginTop: "12px" }}>
            {metrics.map((metric) => {
              const data = comparison.timeline.map((t) => ({
                date: t.label,
                value: t.values[metric] || 0,
              }));
              const color = METRIC_COLORS[metric] || "#3b82f6";
              const invertGood = metric === "BMI" || metric.includes("LDL");
              return (
                <div
                  key={metric}
                  onClick={() => setSelectedMetric(selectedMetric === metric ? null : metric)}
                  style={{ cursor: "pointer" }}
                >
                  <TrendMiniChart
                    label={metric}
                    data={data}
                    unit=""
                    color={color}
                    invertGood={invertGood}
                  />
                </div>
              );
            })}
          </div>
        </Card>

        {/* AI Trend Analysis */}
        <Card>
          <CardTitle>🤖 AI趋势分析</CardTitle>
          <div style={{ marginTop: "10px", fontSize: "14px", color: "#4b5563", lineHeight: 1.7 }}>
            <p>{comparison.trendAnalysis}</p>
          </div>
        </Card>

        {/* Key findings */}
        <Card>
          <CardTitle>⚠️ 重点关注</CardTitle>
          <div style={{ marginTop: "10px" }}>
            {[
              { icon: "📈", text: "甘油三酯三年涨幅75%——恶化最快的指标", color: "#ef4444" },
              { icon: "📈", text: "ALT三年涨幅72.7%——与脂肪肝进展一致", color: "#ef4444" },
              { icon: "📈", text: "LDL-C三年涨幅44%——心血管风险持续增加", color: "#f59e0b" },
              { icon: "📊", text: "2024→2025年恶化加速——与运动量骤降时间吻合", color: "#f59e0b" },
              { icon: "✅", text: "血糖仍在正常范围但缓慢上升——需预防糖尿病", color: "#3b82f6" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: "10px",
                padding: "10px 0", borderBottom: i < 4 ? "1px solid #f3f4f6" : "none",
                fontSize: "14px", color: "#374151",
              }}>
                <span style={{ fontSize: "18px" }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <button
            onClick={() => navigate("report-summary")}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px", border: "none",
              background: "#3b82f6", color: "#fff", fontSize: "14px", fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🏥 导出医生摘要
          </button>
          <button
            onClick={() => navigate("report-result")}
            style={{
              flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #d1d5db",
              background: "#fff", color: "#374151", fontSize: "14px", fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← 返回最新报告
          </button>
        </div>

        <div style={{
          background: "#fef3c7", borderRadius: "8px", padding: "10px 14px",
          fontSize: "12px", color: "#92400e", textAlign: "center",
        }}>
          ⚠️ 本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。<br />
          如有健康问题，请咨询专业医生。
        </div>
      </div>
    </div>
  );
}

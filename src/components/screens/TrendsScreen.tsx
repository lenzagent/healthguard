"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { mockTrends } from "@/data/mockData";
import type { TrendData } from "@/lib/types";

const metrics = [
  { key: "heart-rate", label: "❤️ 心率" },
  { key: "blood-pressure", label: "🩸 血压" },
  { key: "spo2", label: "🫁 血氧" },
  { key: "stress", label: "🧠 压力" },
];

const timeRanges = ["7天", "30天", "90天"];

export function TrendsScreen() {
  const { navigate } = useApp();
  const [selectedMetric, setSelectedMetric] = useState("heart-rate");
  const [selectedTime, setSelectedTime] = useState("7天");
  const data: TrendData = mockTrends[selectedMetric] || mockTrends["heart-rate"];

  return (
    <div>
      <TopNav title="📊 健康趋势" action={{ label: "⚙️", onClick: () => navigate("settings") }} showBack={false} />
      <div className="screen-container animate-in">
        {/* Metric selector */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", overflowX: "auto", paddingBottom: "4px" }} role="tablist" aria-label="选择健康指标">
          {metrics.map((m) => (
            <button
              key={m.key}
              role="tab"
              aria-selected={selectedMetric === m.key}
              onClick={() => setSelectedMetric(m.key)}
              style={{
                padding: "8px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 500,
                border: "none", cursor: "pointer", whiteSpace: "nowrap",
                background: selectedMetric === m.key ? "#eff6ff" : "#f3f4f6",
                color: selectedMetric === m.key ? "#3b82f6" : "#6b7280",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Time range */}
        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "#f3f4f6", borderRadius: "8px", padding: "4px" }}>
          {timeRanges.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTime(t)}
              style={{
                flex: 1, padding: "8px 12px", fontSize: "13px", fontWeight: 500,
                border: "none", cursor: "pointer", borderRadius: "6px",
                background: selectedTime === t ? "#fff" : "none",
                color: selectedTime === t ? "#111827" : "#6b7280",
                boxShadow: selectedTime === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Chart */}
        <Card>
          <CardTitle>{data.title} · 最近{selectedTime}</CardTitle>
          <div style={{ marginTop: "12px" }}>
            <Chart data={data} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            <span>6月1日</span><span>6月2日</span><span>6月3日</span><span>6月4日</span>
          </div>
        </Card>

        {/* Stats */}
        <Card>
          <CardTitle>📊 统计摘要</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", textAlign: "center", marginTop: "12px" }}>
            <StatBox label="平均值" value={data.avg} unit={data.unit} />
            <StatBox label="最低值" value={data.min} unit={data.unit} />
            <StatBox label="最高值" value={data.max} unit={data.unit} />
          </div>
        </Card>

        {/* Insight */}
        <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "16px", fontSize: "14px", color: "#1e40af", lineHeight: 1.6 }}>
          <strong style={{ display: "block", marginBottom: "4px" }}>💡 本周洞察</strong>
          心率整体稳定在正常范围。周五出现偏高（108 bpm），可能与工作压力相关。建议关注周五的压力管理。
        </div>
      </div>
    </div>
  );
}

function Chart({ data }: { data: TrendData }) {
  const maxVal = Math.max(...data.values.map((v) => v.value));
  return (
    <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "12px", padding: "8px 0" }} aria-label={`${data.title}趋势图`}>
      {data.values.map((item, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", height: "100%" }}>
          <div style={{ width: "100%", height: `${(item.value / maxVal) * 100}%`, borderRadius: "4px 4px 0 0", background: data.color, minHeight: "4px", transition: "height 500ms ease" }}
            title={`${item.day}: ${item.value} ${data.unit}`} />
          <span style={{ fontSize: "10px", color: "#9ca3af" }}>{item.day}</span>
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#9ca3af" }}>{unit}</div>
      <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

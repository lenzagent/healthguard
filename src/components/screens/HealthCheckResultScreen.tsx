"use client";

import React, { useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/Button";
import { generateResultData } from "@/data/mockData";
import type { MetricStatus } from "@/lib/types";

export function HealthCheckResultScreen() {
  const { navigate, switchTab } = useApp();
  const result = useMemo(() => generateResultData(), []);

  const getStatus = (key: string): MetricStatus => {
    if (key === "hr") return result.metrics.hr <= 100 ? "normal" : result.metrics.hr > 110 ? "abnormal" : "caution";
    if (key === "spo2") return result.metrics.spo2 >= 95 ? "normal" : result.metrics.spo2 >= 90 ? "caution" : "abnormal";
    if (key === "stress") return result.metrics.stress <= 30 ? "normal" : result.metrics.stress <= 60 ? "caution" : "abnormal";
    return "normal";
  };

  return (
    <div className="screen-container animate-in">
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: "64px", marginBottom: "12px" }}>{result.emoji}</div>
        <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#111827" }}>{result.title}</h2>
        <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>{result.subtitle}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <ResultMetric icon="❤️" value={result.metrics.hr} unit="bpm" label="心率" color="#ef4444" status={getStatus("hr")} />
        <ResultMetric icon="🩸" value={result.metrics.bp} unit="mmHg" label="血压" color="#3b82f6" status="normal" />
        <ResultMetric icon="🫁" value={result.metrics.spo2} unit="%" label="血氧" color="#06b6d4" status={getStatus("spo2")} />
        <ResultMetric icon="🧠" value={result.metrics.stress} unit="%" label="压力指数" color="#f59e0b" status={getStatus("stress")} />
      </div>

      <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "16px", fontSize: "14px", color: "#1e40af", lineHeight: 1.6, marginBottom: "16px" }}>
        <strong style={{ display: "block", marginBottom: "4px" }}>💡 健康建议</strong>
        {result.advice}
      </div>

      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <Button variant="secondary" onClick={() => switchTab("home")}>🏠 返回首页</Button>
        </div>
        <div style={{ flex: 1 }}>
          <Button variant="primary" onClick={() => navigate("check-prepare")}>🔄 重新检测</Button>
        </div>
      </div>
    </div>
  );
}

function ResultMetric({ icon, value, unit, label, color, status }: {
  icon: string; value: number | string; unit: string; label: string; color: string; status: MetricStatus;
}) {
  const badges: Record<MetricStatus, { text: string; bg: string; tc: string }> = {
    normal: { text: "正常", bg: "#dcfce7", tc: "#15803d" },
    caution: { text: "注意", bg: "#fef3c7", tc: "#b45309" },
    abnormal: { text: "异常", bg: "#fee2e2", tc: "#b91c1c" },
  };
  const b = badges[status];
  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: "20px" }}>{icon}</div>
      <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--font-mono)", color }}>{value}</div>
      <div style={{ fontSize: "12px", color: "#9ca3af" }}>{unit}</div>
      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{label}</div>
      <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "999px", marginTop: "4px", background: b.bg, color: b.tc }}>{b.text}</span>
    </div>
  );
}

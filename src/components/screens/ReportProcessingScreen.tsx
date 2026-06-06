"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { ProgressBar } from "@/components/ui/ProgressBar";

const stages = [
  { pct: 25, status: "正在识别体检报告...", sub: "OCR文字识别中" },
  { pct: 55, status: "正在提取指标数据...", sub: "识别到血常规、生化全套等12项" },
  { pct: 80, status: "正在进行AI分析...", sub: "对比日常穿戴数据中" },
  { pct: 95, status: "正在生成解读报告...", sub: "整合建议与趋势预测" },
];

export function ReportProcessingScreen() {
  const { navigate } = useApp();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 8 + 2;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("report-result"), 500);
          return 100;
        }
        return next;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [navigate]);

  const currentStage = stages.filter((s) => progress >= s.pct).pop();

  return (
    <div>
      <TopNav title="正在分析..." showBack={false} />
      <div className="screen-container animate-in">
        <div style={{ textAlign: "center", padding: "32px 16px" }}>
          <div style={{
            width: "48px", height: "48px", border: "4px solid #e5e7eb",
            borderTopColor: "#3b82f6", borderRadius: "50%",
            animation: "spin 800ms linear infinite", margin: "0 auto 16px",
          }} />
          <div style={{ fontSize: "15px", color: "#4b5563", fontWeight: 500 }}>
            {currentStage?.status || "准备中..."}
          </div>
          <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "4px" }}>
            {currentStage?.sub || ""}
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <ProgressBar value={progress} color="low" label={`识别进度 ${Math.round(progress)}%`} />
          <span style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px", display: "block" }}>
            {Math.round(progress)}%
          </span>
        </div>
        <p style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center", marginTop: "16px" }}>
          ⏱️ 预计需要 3-5 秒
        </p>
      </div>
    </div>
  );
}

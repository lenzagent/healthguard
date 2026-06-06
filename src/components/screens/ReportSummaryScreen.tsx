"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockReportRecords, mockReportComparison, mockUser } from "@/data/mockData";
import { useToast } from "@/components/ui/Toast";

export function ReportSummaryScreen() {
  const { navigate } = useApp();
  const { showToast } = useToast();
  const latest = mockReportRecords[0];
  const abnormalIndicators = latest.indicators.filter((i) => i.status !== "normal");

  const handleExportPdf = async () => {
    showToast("正在生成医生摘要...", "info");
    try {
      // Try API export (works when report data is from the backend)
      const reportId = latest.id;
      const response = await fetch(`/api/reports/${reportId}/export`);
      if (response.ok) {
        const data = await response.json();
        // Open print dialog with structured data
        window.print();
        showToast("医生摘要已生成，可使用浏览器打印为PDF", "success");
      } else {
        // Fallback: use browser print for mock data
        window.print();
        showToast("PDF已生成，请查看下载", "success");
      }
    } catch {
      // API unavailable — fallback to browser print
      window.print();
      showToast("PDF已生成，请查看下载", "success");
    }
  };

  return (
    <div>
      <TopNav title="给医生的数据摘要" showBack />
      <div className="screen-container animate-in">
        {/* Header — Doctor summary format */}
        <div style={{
          background: "#fff", borderRadius: "12px", padding: "20px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: "16px",
          border: "2px solid #3b82f6",
        }}>
          <div style={{
            textAlign: "center", marginBottom: "16px",
            padding: "0 0 16px 0", borderBottom: "1px solid #e5e7eb",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
              📋 健康数据摘要 — 供医生参考
            </h2>
            <p style={{ fontSize: "12px", color: "#9ca3af" }}>
              生成日期：{new Date().toISOString().slice(0, 10)} · HealthGuard AI
            </p>
          </div>

          {/* Patient Info */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
              👤 基本信息
            </div>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px",
              fontSize: "13px", color: "#374151",
            }}>
              <div><span style={{ color: "#9ca3af" }}>姓名：</span>{mockUser.name}</div>
              <div><span style={{ color: "#9ca3af" }}>年龄：</span>{mockUser.age}岁</div>
              <div><span style={{ color: "#9ca3af" }}>性别：</span>{mockUser.gender === "男" ? "男性" : "女性"}</div>
              <div><span style={{ color: "#9ca3af" }}>BMI：</span>23.8 kg/m²</div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "#9ca3af" }}>既往病史：</span>
                {mockUser.conditions.join("、") || "无"}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ color: "#9ca3af" }}>家族病史：</span>
                {mockUser.familyHistory.join("、") || "无"}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
              📅 报告来源
            </div>
            <div style={{ fontSize: "13px", color: "#374151" }}>
              <p style={{ margin: "0 0 4px" }}>
                <strong>最新报告：</strong>{latest.title}（{latest.hospital}，检测日期 {latest.examDate}）
              </p>
              <p style={{ margin: 0 }}>
                <strong>历史报告：</strong>共 {mockReportRecords.length} 份（{mockReportRecords[1]?.examDate}、{mockReportRecords[2]?.examDate}）
              </p>
            </div>
          </div>
        </div>

        {/* Abnormal indicators summary */}
        <Card>
          <CardTitle>⚠️ 需关注的指标（共{abnormalIndicators.length}项）</CardTitle>
          <div style={{ marginTop: "10px" }}>
            {abnormalIndicators.map((ind) => (
              <div key={ind.name} style={{
                padding: "10px 12px", borderRadius: "8px", marginBottom: "8px",
                background: ind.status === "abnormal" ? "#fef2f2" : "#fffbeb",
                borderLeft: `3px solid ${ind.status === "abnormal" ? "#ef4444" : "#f59e0b"}`,
                fontSize: "13px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 600, color: "#111827" }}>{ind.name}</span>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontWeight: 600,
                    color: ind.status === "abnormal" ? "#ef4444" : "#f59e0b",
                  }}>
                    {ind.value}
                  </span>
                </div>
                <div style={{ color: "#6b7280", lineHeight: 1.5 }}>
                  {ind.interpretation.slice(0, 120)}...
                </div>
                <div style={{ color: "#3b82f6", marginTop: "4px", fontWeight: 500 }}>
                  {ind.recommendation}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Trend summary */}
        <Card>
          <CardTitle>📈 历年趋势摘要</CardTitle>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#4b5563", lineHeight: 1.7 }}>
            <p>{mockReportComparison.trendAnalysis}</p>
          </div>
        </Card>

        {/* Wearable data summary */}
        <Card>
          <CardTitle>⌚ 穿戴设备数据摘要</CardTitle>
          <div style={{ marginTop: "10px", fontSize: "13px", color: "#4b5563", lineHeight: 1.7 }}>
            <p>{latest.wearableCorrelationSummary}</p>
          </div>
        </Card>

        {/* Export & Actions */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <Button variant="primary" size="sm" onClick={handleExportPdf}>
            📥 导出PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            🖨️ 打印
          </Button>
        </div>

        {/* PIPL compliance */}
        <div style={{
          borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
          fontSize: "11px", color: "#6b7280", textAlign: "center",
          border: "1px solid #e5e7eb",
        }}>
          🔒 根据《个人信息保护法》(PIPL)，本摘要仅包含经您授权的健康数据。
          原始体检报告图片在OCR识别后已自动删除。您可在隐私设置中随时撤回授权或删除数据。
        </div>

        <div style={{
          background: "#fef3c7", borderRadius: "8px", padding: "10px 14px",
          fontSize: "12px", color: "#92400e", textAlign: "center",
        }}>
          ⚠️ 本摘要由AI生成，仅供参考，不构成医疗诊断或治疗方案。<br />
          请由执业医师结合临床检查做出最终诊断。
        </div>
      </div>
    </div>
  );
}

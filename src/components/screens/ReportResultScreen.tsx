"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockReportIndicators, mockReportRecords, mockReportCategories } from "@/data/mockData";
import { useToast } from "@/components/ui/Toast";
import type { ReportIndicator, ReportCategoryId } from "@/lib/types";

const statusStyles: Record<string, { bg: string; border: string; color: string; label: string }> = {
  normal: { bg: "#f0fdf4", border: "#22c55e", color: "#22c55e", label: "正常" },
  borderline: { bg: "#fffbeb", border: "#f59e0b", color: "#f59e0b", label: "边缘" },
  abnormal: { bg: "#fef2f2", border: "#ef4444", color: "#ef4444", label: "异常" },
};

function groupByCategory(indicators: ReportIndicator[]): Map<ReportCategoryId, ReportIndicator[]> {
  const groups = new Map<ReportCategoryId, ReportIndicator[]>();
  for (const ind of indicators) {
    const list = groups.get(ind.category) || [];
    list.push(ind);
    groups.set(ind.category, list);
  }
  return groups;
}

export function ReportResultScreen() {
  const { navigate } = useApp();
  const { showToast } = useToast();
  const [expandedIndicator, setExpandedIndicator] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"indicators" | "correlation" | "advice">("indicators");

  const record = mockReportRecords[0]; // Latest report
  const categories = mockReportCategories;
  const grouped = groupByCategory(record.indicators);

  return (
    <div>
      <TopNav
        title="报告解读"
        showBack
        action={{ label: "📤 导出", onClick: () => navigate("report-summary") }}
      />
      <div className="screen-container animate-in">
        {/* Report Header */}
        <Card>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📋</div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>{record.title}</h2>
            <p style={{ fontSize: "13px", color: "#6b7280" }}>
              检测日期：{record.examDate} · {record.hospital}
            </p>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              OCR识别准确率 {record.ocrAccuracy}%
            </p>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div style={{
          display: "flex", gap: "4px", marginBottom: "16px",
          background: "#f3f4f6", borderRadius: "10px", padding: "3px",
        }}>
          {([
            ["indicators", "🩺 指标解读"],
            ["correlation", "🔗 关联分析"],
            ["advice", "💡 AI建议"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: "8px",
                border: "none", fontSize: "13px", fontWeight: 600,
                cursor: "pointer", transition: "all 150ms ease",
                background: activeTab === key ? "#fff" : "transparent",
                color: activeTab === key ? "#111827" : "#6b7280",
                boxShadow: activeTab === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content: Indicators */}
        {activeTab === "indicators" && (
          <>
            {Array.from(grouped.entries()).map(([catId, indicators]) => {
              const cat = categories.find((c) => c.id === catId);
              if (!cat) return null;
              const abnormalCount = indicators.filter((i) => i.status !== "normal").length;
              return (
                <Card key={catId}>
                  <CardTitle>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{cat.icon} {cat.name}</span>
                      {abnormalCount > 0 && (
                        <span style={{
                          fontSize: "11px", background: "#fef2f2", color: "#ef4444",
                          padding: "2px 8px", borderRadius: "20px", fontWeight: 500,
                        }}>
                          {abnormalCount}项需关注
                        </span>
                      )}
                    </span>
                  </CardTitle>
                  <div style={{ marginTop: "10px" }}>
                    {indicators.map((ind) => {
                      const s = statusStyles[ind.status];
                      const isExpanded = expandedIndicator === ind.name;
                      return (
                        <div key={ind.name} style={{ marginBottom: "6px" }}>
                          <div
                            onClick={() => setExpandedIndicator(isExpanded ? null : ind.name)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 12px", borderRadius: "8px",
                              fontSize: "14px", background: s.bg, borderLeft: `3px solid ${s.border}`,
                              cursor: "pointer", transition: "all 150ms ease",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 500, color: "#111827" }}>{ind.name}</span>
                              <span style={{ fontSize: "12px", color: "#9ca3af", display: "block" }}>{ind.range}</span>
                            </div>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: s.color, marginRight: "8px" }}>
                              {ind.value}
                            </span>
                            <span style={{
                              fontSize: "10px", fontWeight: 500, padding: "2px 6px", borderRadius: "4px",
                              background: s.border, color: "#fff",
                            }}>
                              {s.label}
                            </span>
                          </div>
                          {isExpanded && (
                            <div style={{
                              margin: "4px 8px 10px", padding: "12px 14px",
                              background: "#f9fafb", borderRadius: "8px",
                              fontSize: "13px", lineHeight: 1.7, color: "#374151",
                              animation: "fadeSlideIn 200ms ease",
                            }}>
                              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                                📖 通俗解释
                              </div>
                              <p style={{ margin: "0 0 12px 0" }}>{ind.interpretation}</p>
                              {ind.wearableCorrelation && (
                                <>
                                  <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                                    ⌚ 穿戴数据关联
                                  </div>
                                  <p style={{ margin: "0 0 12px 0", color: "#3b82f6" }}>{ind.wearableCorrelation}</p>
                                </>
                              )}
                              <div style={{ fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
                                💡 建议
                              </div>
                              <p style={{ margin: 0 }}>{ind.recommendation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </>
        )}

        {/* Tab Content: Correlation */}
        {activeTab === "correlation" && (
          <Card>
            <CardTitle>🔗 穿戴数据关联分析</CardTitle>
            <div style={{ marginTop: "12px", fontSize: "14px", color: "#4b5563", lineHeight: 1.7 }}>
              <p>{record.wearableCorrelationSummary}</p>
            </div>
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "8px" }}>
                关键发现
              </div>
              {[
                { icon: "🚶", text: "日均步数从10,200降至8,200步（降幅19.6%）→ 与血脂升高和脂肪肝恶化相关", color: "#f59e0b" },
                { icon: "🍔", text: "外卖频率增至每周4.2次 → 高油高盐饮食是尿酸和血脂升高的主要诱因", color: "#ef4444" },
                { icon: "🏃", text: "运动消耗减少约300大卡/天 → 能量正平衡导致BMI逐年上升", color: "#f59e0b" },
                { icon: "❤️", text: "心率和血氧与体检结果高度一致 → 设备数据可作为日常监测的可靠参考", color: "#22c55e" },
                { icon: "🩸", text: "血压30天趋势平稳（117/75 mmHg均值） → 与体检118/76 mmHg一致", color: "#22c55e" },
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "10px",
                  padding: "10px 0", borderBottom: "1px solid #f3f4f6",
                  fontSize: "13px", color: "#374151",
                }}>
                  <span style={{ fontSize: "18px" }}>{item.icon}</span>
                  <span>{item.text}</span>
                  <span style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: item.color, flexShrink: 0, marginTop: "5px",
                  }} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tab Content: AI Advice */}
        {activeTab === "advice" && (
          <>
            <Card>
              <CardTitle>💡 AI综合建议</CardTitle>
              <p style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.7, marginTop: "8px" }}>
                {record.aiSummary}
              </p>
            </Card>
            <Card>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", marginBottom: "12px" }}>
                📋 行动计划
              </div>
              <ol style={{ margin: 0, paddingLeft: "20px", lineHeight: 2, fontSize: "14px", color: "#374151" }}>
                {record.aiRecommendations.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ol>
            </Card>
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              <Button variant="secondary" size="sm" onClick={() => navigate("report-compare")}>
                📊 对比历年报告
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("report-summary")}>
                🏥 导出医生摘要
              </Button>
            </div>
          </>
        )}

        {/* AI Disclaimer — always visible */}
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

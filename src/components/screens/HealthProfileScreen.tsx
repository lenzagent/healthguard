"use client";

import React from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { mockUser } from "@/data/mockData";
import { useToast } from "@/components/ui/Toast";

export function HealthProfileScreen() {
  const { showToast } = useToast();
  return (
    <div>
      <TopNav title="健康档案" />
      <div className="screen-container animate-in">
        <Card>
          <CardTitle>👤 基本信息</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
            <InputField label="昵称" value={mockUser.name} readOnly />
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}><InputField label="年龄" value={String(mockUser.age)} readOnly /></div>
              <div style={{ flex: 1 }}><InputField label="性别" value={mockUser.gender} readOnly /></div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1 }}><InputField label="身高 (cm)" value={String(mockUser.height)} /></div>
              <div style={{ flex: 1 }}><InputField label="体重 (kg)" value={String(mockUser.weight)} /></div>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>🏥 健康背景</CardTitle>
          <div style={{ marginTop: "12px" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>既往病史</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {mockUser.conditions.map((c) => (
                <span key={c} style={{ padding: "4px 12px", background: "#fef3c7", borderRadius: "20px", fontSize: "13px", color: "#92400e" }}>{c}</span>
              ))}
              <span style={{ padding: "4px 12px", background: "#f3f4f6", borderRadius: "20px", fontSize: "13px", color: "#6b7280" }}>+ 添加</span>
            </div>
          </div>
          <div style={{ marginTop: "12px" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>家族病史</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {mockUser.familyHistory.map((c) => (
                <span key={c} style={{ padding: "4px 12px", background: "#fee2e2", borderRadius: "20px", fontSize: "13px", color: "#b91c1c" }}>{c}</span>
              ))}
              <span style={{ padding: "4px 12px", background: "#f3f4f6", borderRadius: "20px", fontSize: "13px", color: "#6b7280" }}>+ 添加</span>
            </div>
          </div>
        </Card>

        <Button variant="primary" onClick={() => showToast("✅ 健康档案已保存", "success")}>保存</Button>
        <p style={{ fontSize: "11px", color: "#9ca3af", textAlign: "center", marginTop: "8px" }}>
          此信息帮助AI提供更精准的个性化健康洞察
        </p>
      </div>
    </div>
  );
}

function InputField({ label, value, readOnly = false }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <div>
      <label style={{ fontSize: "13px", color: "#6b7280", display: "block", marginBottom: "4px" }}>{label}</label>
      <input
        type="text"
        defaultValue={value}
        readOnly={readOnly}
        style={{
          width: "100%", minHeight: "44px", border: "1px solid #e5e7eb",
          borderRadius: "8px", padding: "0 12px", fontSize: "15px",
          fontFamily: readOnly ? "var(--font-sans)" : "var(--font-mono)",
          background: readOnly ? "#f9fafb" : "#fff",
        }}
      />
    </div>
  );
}

"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function HealthCheckPrepareScreen() {
  const { navigate } = useApp();
  return (
    <div>
      <TopNav title="健康检测" />
      <div className="screen-container animate-in">
        <Card>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
            📋 检测前准备
          </h3>
          <ul style={listStyle}>
            <li style={itemStyle}><span style={iconStyle}>💡</span> 请确保面部光线充足</li>
            <li style={itemStyle}><span style={iconStyle}>📷</span> 正对摄像头，保持面部居中</li>
            <li style={itemStyle}><span style={iconStyle}>🧘</span> 保持放松，正常呼吸</li>
            <li style={itemStyle}><span style={iconStyle}>⏱️</span> 检测过程约30秒</li>
          </ul>
        </Card>
        <div style={cameraStyle}>
          <div style={{ color: "#6b7280", textAlign: "center" }}>
            <span style={{ fontSize: "80px", display: "block", marginBottom: "12px" }}>😊</span>
            <span style={{ fontSize: "14px" }}>将面部置于此区域</span>
          </div>
        </div>
        <Button variant="accent" onClick={() => navigate("check-monitoring")}>
          ✅ 开始检测
        </Button>
      </div>
    </div>
  );
}

const listStyle: React.CSSProperties = { listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" };
const itemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "#374151" };
const iconStyle: React.CSSProperties = { fontSize: "16px", width: "24px", textAlign: "center" };
const cameraStyle: React.CSSProperties = {
  background: "#000", borderRadius: "16px", aspectRatio: "4/3",
  position: "relative", overflow: "hidden", marginBottom: "16px",
  display: "flex", alignItems: "center", justifyContent: "center",
};

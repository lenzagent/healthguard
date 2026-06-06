"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function OnboardingScreen() {
  const { navigate, setPrivacyConsent } = useApp();

  const handleStart = () => {
    navigate("consent");
  };

  return (
    <div className="screen-container animate-in">
      <div style={{ textAlign: "center", padding: "40px 20px 20px" }}>
        <div style={{ fontSize: "72px", marginBottom: "20px" }}>💚</div>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          AI健康监测
        </h1>
        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: 1.6 }}>
          通过摄像头进行非接触式
          <br />
          心率、血压、血氧、情绪压力分析
        </p>
      </div>

      <Card>
        <CardTitle>✨ 核心功能</CardTitle>
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          <li style={summaryItemStyle}>
            <span style={iconStyle}>📹</span> 30秒快速面部扫描检测
          </li>
          <li style={summaryItemStyle}>
            <span style={iconStyle}>📊</span> 多维度健康数据可视化
          </li>
          <li style={summaryItemStyle}>
            <span style={iconStyle}>📈</span> 长期健康趋势追踪
          </li>
          <li style={summaryItemStyle}>
            <span style={iconStyle}>🔒</span> 数据本地处理，隐私优先
          </li>
        </ul>
      </Card>

      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
        }}
        role="region"
        aria-label="隐私承诺"
      >
        <h2 style={{ fontSize: "15px", fontWeight: 600, color: "#15803d", marginBottom: "8px" }}>
          🔐 隐私优先承诺
        </h2>
        <ul style={{ fontSize: "13px", color: "#374151", paddingLeft: "20px", lineHeight: 1.8 }}>
          <li>
            面部视频仅在本地处理，<strong>不上传服务器</strong>
          </li>
          <li>健康数据加密存储，您可随时导出或删除</li>
          <li>我们不会将您的健康数据用于广告或第三方分享</li>
        </ul>
      </div>

      <Button variant="primary" onClick={handleStart}>
        开始使用 →
      </Button>
      <p
        style={{
          textAlign: "center",
          marginTop: "8px",
          fontSize: "12px",
          color: "#6b7280",
        }}
      >
        点击&quot;开始使用&quot;即表示您同意我们的隐私政策
      </p>
    </div>
  );
}

const summaryItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "14px",
  color: "#374151",
};

const iconStyle: React.CSSProperties = {
  fontSize: "16px",
  width: "24px",
  textAlign: "center",
};

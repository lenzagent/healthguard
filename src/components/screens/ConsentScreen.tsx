"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function ConsentScreen() {
  const { navigate, setPrivacyConsent } = useApp();
  const { showToast } = useToast();

  const handleConsent = (accepted: boolean) => {
    if (accepted) {
      setPrivacyConsent(true);
      navigate("camera-permission");
      showToast("✅ 隐私同意已记录", "success");
    } else {
      navigate("onboarding");
      showToast("您可以在设置中随时更改隐私偏好", "warning");
    }
  };

  return (
    <div>
      <TopNav title="隐私与数据授权" />
      <div className="screen-container animate-in">
        <Card>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>
            📜 数据处理说明
          </h2>
          <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.8 }}>
            <p style={{ marginBottom: "12px" }}>
              <strong>我们收集什么：</strong>
            </p>
            <ul style={{ paddingLeft: "20px", marginBottom: "12px" }}>
              <li>摄像头捕捉的面部光电容积描记信号（PPG）</li>
              <li>您主动填写的健康档案信息（可选）</li>
              <li>检测得出的生理指标：心率、血压、血氧、心率变异性</li>
            </ul>
            <p style={{ marginBottom: "12px" }}>
              <strong>我们不做什么：</strong>
            </p>
            <ul style={{ paddingLeft: "20px", marginBottom: "12px" }}>
              <li>❌ 不存储或上传您的面部图像/视频</li>
              <li>❌ 不与第三方分享您的健康数据</li>
              <li>❌ 不将数据用于广告或营销</li>
              <li>❌ 不代替专业医疗诊断</li>
            </ul>
            <p style={{ marginBottom: "12px" }}>
              <strong>您的权利：</strong>
            </p>
            <ul style={{ paddingLeft: "20px" }}>
              <li>随时查看、导出或删除您的所有数据</li>
              <li>随时撤回同意（撤回后功能受限）</li>
              <li>数据存储在您的设备或您选择的加密云存储</li>
            </ul>
          </div>
        </Card>

        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <div style={{ flex: 1 }}>
            <Button variant="secondary" onClick={() => handleConsent(false)}>
              暂不使用
            </Button>
          </div>
          <div style={{ flex: 1 }}>
            <Button variant="primary" onClick={() => handleConsent(true)}>
              同意并继续
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

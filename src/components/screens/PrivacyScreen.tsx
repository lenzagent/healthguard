"use client";

import React from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function PrivacyScreen() {
  const { showToast } = useToast();
  return (
    <div>
      <TopNav title="隐私与数据管理" />
      <div className="screen-container animate-in">
        <Card>
          <CardTitle>📋 数据收集范围</CardTitle>
          <div style={{ fontSize: "14px", color: "#4b5563", lineHeight: 1.8, marginTop: "8px" }}>
            <p>✅ <strong>正在收集：</strong></p>
            <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
              <li>生理指标：心率、血压、血氧、心率变异性</li>
              <li>情绪压力评估分数</li>
              <li>检测时间戳</li>
            </ul>
            <p>🛡️ <strong>未收集：</strong></p>
            <ul style={{ paddingLeft: "20px" }}>
              <li>面部图像/视频（仅实时分析）</li>
              <li>位置信息</li>
              <li>身份信息（除您主动填写的以外）</li>
            </ul>
          </div>
        </Card>
        <Card>
          <CardTitle>📤 导出我的数据</CardTitle>
          <p style={{ fontSize: "14px", color: "#6b7280", margin: "12px 0" }}>选择导出格式，生成包含所有健康数据的文件。</p>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant="secondary" size="sm" onClick={() => showToast("JSON导出功能开发中")}>JSON</Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("PDF导出功能开发中")}>PDF报告</Button>
            <Button variant="secondary" size="sm" onClick={() => showToast("CSV导出功能开发中")}>CSV</Button>
          </div>
        </Card>
        <Card style={{ border: "1px solid #fecaca" }}>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#b91c1c", marginBottom: "8px" }}>⚠️ 危险操作</div>
          <Button variant="danger" size="sm" onClick={() => showToast("🗑️ 所有健康数据已删除", "danger")}>🗑️ 删除所有健康数据</Button>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>此操作不可撤销，所有检测记录将被永久删除。</p>
        </Card>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { TopNav } from "@/components/navigation/TopNav";
import { useToast } from "@/components/ui/Toast";

export function SettingsScreen() {
  const { navigate, state, toggleSummaryEnabled, setSummaryPushTime } = useApp();
  const { showToast } = useToast();
  const { summaryPreferences } = state;

  return (
    <div>
      <TopNav title="⚙️ 设置" showBack={false} />
      <div className="screen-container animate-in">
        <SettingsGroup title="个人">
          <SettingsItem label="健康档案" right="小明 · 30岁" onClick={() => navigate("health-profile")} />
          <SettingsItem label="设备连接中心" right="2个已连接" onClick={() => navigate("device-connect")} />
          <SettingsItem label="隐私与数据管理" onClick={() => navigate("privacy")} />
        </SettingsGroup>

        <SettingsGroup title="数据与报告">
          <SettingsItem label="体检报告解读" right="1份历史报告" onClick={() => navigate("report-upload")} />
          <SettingsItem label="告警中心" right="3条未读" onClick={() => navigate("alert-center")} />
        </SettingsGroup>

        <SettingsGroup title="检测">
          <SettingsItem label="摄像头设置" onClick={() => showToast("摄像头设置功能开发中")} />
          <SettingsItem label="检测灵敏度" right="自定义" onClick={() => navigate("threshold-settings")} />
        </SettingsGroup>

        <SettingsGroup title="显示">
          <ToggleItem label="深色模式" />
          <ToggleItem label="色觉辅助模式" />
        </SettingsGroup>

        <SettingsGroup title="通知">
          <ToggleItem label="定期检测提醒" defaultOn />
          <ToggleItem label="异常告警通知" defaultOn />
          <ToggleItem label="健康周报推送" />
          <SummaryPushItem
            enabled={summaryPreferences.enabled}
            pushTime={summaryPreferences.pushTime}
            onToggle={toggleSummaryEnabled}
            onTimeChange={setSummaryPushTime}
            onViewSummary={() => navigate("daily-summary")}
          />
        </SettingsGroup>

        <SettingsGroup title="关于">
          <SettingsItem label="版本信息" right="v1.0.0-beta" onClick={() => showToast("版本 1.0.0-beta")} />
          <SettingsItem label="帮助与反馈" onClick={() => showToast("帮助文档开发中")} />
        </SettingsGroup>

        <p style={{ textAlign: "center", fontSize: "12px", color: "#d1d5db", marginTop: "24px" }}>
          HealthGuard AI健康监测<br />
          本产品不提供医疗诊断，仅供参考
        </p>
      </div>
    </div>
  );
}

function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", paddingLeft: "4px" }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SettingsItem({ label, right, onClick }: { label: string; right?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "#fff", border: "none",
        borderBottom: "1px solid #f3f4f6", cursor: "pointer",
        fontSize: "15px", fontFamily: "var(--font-sans)", color: "#111827",
        width: "100%", textAlign: "left", borderRadius: "0",
        transition: "background 100ms ease",
      }}
    >
      {label}
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {right && <span style={{ fontSize: "14px", color: "#9ca3af" }}>{right}</span>}
        <span style={{ color: "#d1d5db", fontSize: "16px" }}>›</span>
      </span>
    </button>
  );
}

function ToggleItem({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6",
      fontSize: "15px", color: "#111827",
    }}>
      {label}
      <button
        onClick={() => setOn(!on)}
        aria-label={`切换${label}`}
        aria-pressed={on}
        style={{
          width: "48px", height: "28px", borderRadius: "999px", border: "none",
          cursor: "pointer", background: on ? "#3b82f6" : "#d1d5db",
          position: "relative", transition: "background 200ms ease",
        }}
      >
        <span style={{
          position: "absolute", top: "3px", left: on ? "23px" : "3px",
          width: "22px", height: "22px", background: "#fff", borderRadius: "50%",
          transition: "left 200ms ease", boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }} />
      </button>
    </div>
  );
}

function SummaryPushItem({
  enabled,
  pushTime,
  onToggle,
  onTimeChange,
  onViewSummary,
}: {
  enabled: boolean;
  pushTime: string;
  onToggle: () => void;
  onTimeChange: (time: string) => void;
  onViewSummary: () => void;
}) {
  const [showTimePicker, setShowTimePicker] = useState(false);

  const timeOptions: string[] = [];
  for (let h = 6; h <= 22; h++) {
    for (const m of [0, 30]) {
      const hh = h.toString().padStart(2, "0");
      const mm = m.toString().padStart(2, "0");
      timeOptions.push(`${hh}:${mm}`);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px",
          background: "#fff",
          borderBottom: "1px solid #f3f4f6",
          fontSize: "15px",
          color: "#111827",
        }}
      >
        <div style={{ flex: 1 }}>
          <button
            onClick={onViewSummary}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              fontSize: "15px",
              color: "#111827",
              cursor: "pointer",
              fontFamily: "var(--font-sans)",
              textAlign: "left",
            }}
          >
            每日健康摘要推送 →
          </button>
          <span
            style={{
              display: "block",
              fontSize: "12px",
              color: enabled ? "#3b82f6" : "#d1d5db",
              marginTop: "2px",
            }}
          >
            {enabled ? `每天 ${pushTime} 推送` : "已关闭"}
          </span>
          {enabled && (
            <button
              onClick={() => setShowTimePicker(!showTimePicker)}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontSize: "12px",
                color: "#3b82f6",
                cursor: "pointer",
                marginTop: "4px",
                display: "block",
              }}
            >
              {showTimePicker ? "收起时间选择" : "更改推送时间"}
            </button>
          )}
          {showTimePicker && enabled && (
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              {timeOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    onTimeChange(t);
                    setShowTimePicker(false);
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: t === pushTime ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    background: t === pushTime ? "#eff6ff" : "#fff",
                    fontSize: "12px",
                    color: t === pushTime ? "#3b82f6" : "#374151",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                    fontWeight: t === pushTime ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          aria-label={enabled ? "关闭每日推送" : "开启每日推送"}
          aria-pressed={enabled}
          style={{
            width: "48px",
            height: "28px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: enabled ? "#3b82f6" : "#d1d5db",
            position: "relative",
            transition: "background 200ms ease",
            flexShrink: 0,
            marginLeft: "8px",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: enabled ? "23px" : "3px",
              width: "22px",
              height: "22px",
              background: "#fff",
              borderRadius: "50%",
              transition: "left 200ms ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          />
        </button>
      </div>
    </div>
  );
}

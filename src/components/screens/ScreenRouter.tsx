"use client";

import React, { Suspense, lazy } from "react";
import { useApp } from "@/context/AppContext";
import type { ScreenId } from "@/lib/types";

/** Lazy-loaded screens — only the active screen's JS is downloaded */
const OnboardingScreen = lazy(() => import("./OnboardingScreen").then((m) => ({ default: m.OnboardingScreen })));
const DashboardScreen = lazy(() => import("./DashboardScreen").then((m) => ({ default: m.DashboardScreen })));
const ConsentScreen = lazy(() => import("./ConsentScreen").then((m) => ({ default: m.ConsentScreen })));
const CameraPermissionScreen = lazy(() => import("./CameraPermissionScreen").then((m) => ({ default: m.CameraPermissionScreen })));
const HealthCheckPrepareScreen = lazy(() => import("./HealthCheckPrepareScreen").then((m) => ({ default: m.HealthCheckPrepareScreen })));
const HealthCheckMonitoringScreen = lazy(() => import("./HealthCheckMonitoringScreen").then((m) => ({ default: m.HealthCheckMonitoringScreen })));
const HealthCheckResultScreen = lazy(() => import("./HealthCheckResultScreen").then((m) => ({ default: m.HealthCheckResultScreen })));
const TrendsScreen = lazy(() => import("./TrendsScreen").then((m) => ({ default: m.TrendsScreen })));
const SettingsScreen = lazy(() => import("./SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const PrivacyScreen = lazy(() => import("./PrivacyScreen").then((m) => ({ default: m.PrivacyScreen })));
const DeviceConnectScreen = lazy(() => import("./DeviceConnectScreen").then((m) => ({ default: m.DeviceConnectScreen })));
const HealthScoreScreen = lazy(() => import("./HealthScoreScreen").then((m) => ({ default: m.HealthScoreScreen })));
const ReportUploadScreen = lazy(() => import("./ReportUploadScreen").then((m) => ({ default: m.ReportUploadScreen })));
const ReportProcessingScreen = lazy(() => import("./ReportProcessingScreen").then((m) => ({ default: m.ReportProcessingScreen })));
const ReportResultScreen = lazy(() => import("./ReportResultScreen").then((m) => ({ default: m.ReportResultScreen })));
const AlertCenterScreen = lazy(() => import("./AlertCenterScreen").then((m) => ({ default: m.AlertCenterScreen })));
const HealthProfileScreen = lazy(() => import("./HealthProfileScreen").then((m) => ({ default: m.HealthProfileScreen })));
const ThresholdSettingsScreen = lazy(() => import("./ThresholdSettingsScreen").then((m) => ({ default: m.ThresholdSettingsScreen })));
const DailySummaryScreen = lazy(() => import("./DailySummaryScreen").then((m) => ({ default: m.DailySummaryScreen })));
const ReportCompareScreen = lazy(() => import("./ReportCompareScreen").then((m) => ({ default: m.ReportCompareScreen })));
const ReportSummaryScreen = lazy(() => import("./ReportSummaryScreen").then((m) => ({ default: m.ReportSummaryScreen })));

const ScreenFallback = () => (
  <div className="screen-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
    <div style={{ textAlign: "center", color: "#6b7280" }}>
      <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#3b82f6", borderRadius: "50%", margin: "0 auto 12px" }} />
      <p style={{ fontSize: 14 }}>加载中...</p>
    </div>
  </div>
);

const screenMap: Record<ScreenId, React.ComponentType> = {
  onboarding: OnboardingScreen,
  consent: ConsentScreen,
  "camera-permission": CameraPermissionScreen,
  dashboard: DashboardScreen,
  "check-prepare": HealthCheckPrepareScreen,
  "check-monitoring": HealthCheckMonitoringScreen,
  "check-result": HealthCheckResultScreen,
  trends: TrendsScreen,
  settings: SettingsScreen,
  privacy: PrivacyScreen,
  "device-connect": DeviceConnectScreen,
  "health-score": HealthScoreScreen,
  "report-upload": ReportUploadScreen,
  "report-processing": ReportProcessingScreen,
  "report-result": ReportResultScreen,
  "alert-center": AlertCenterScreen,
  "health-profile": HealthProfileScreen,
  "threshold-settings": ThresholdSettingsScreen,
  "daily-summary": DailySummaryScreen,
  "report-compare": ReportCompareScreen,
  "report-summary": ReportSummaryScreen,
};

export function ScreenRouter() {
  const { state } = useApp();
  const Screen = screenMap[state.currentScreen];

  if (!Screen) {
    return (
      <div className="screen-container" style={{ textAlign: "center", padding: "40px" }}>
        <p>Screen not found: {state.currentScreen}</p>
      </div>
    );
  }

  return (
    <div key={state.currentScreen}>
      <Suspense fallback={<ScreenFallback />}>
        <Screen />
      </Suspense>
    </div>
  );
}

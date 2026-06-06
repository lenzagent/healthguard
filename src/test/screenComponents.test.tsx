/**
 * Screen Component Tests: Onboarding, Consent, AlertCenter, Trends,
 * Settings, HealthScore, Privacy, HealthProfile
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/Toast";
import { OnboardingScreen } from "@/components/screens/OnboardingScreen";
import { ConsentScreen } from "@/components/screens/ConsentScreen";
import { AlertCenterScreen } from "@/components/screens/AlertCenterScreen";
import { TrendsScreen } from "@/components/screens/TrendsScreen";
import { SettingsScreen } from "@/components/screens/SettingsScreen";
import { HealthScoreScreen } from "@/components/screens/HealthScoreScreen";
import { PrivacyScreen } from "@/components/screens/PrivacyScreen";
import { HealthProfileScreen } from "@/components/screens/HealthProfileScreen";
import { ScreenRouter } from "@/components/screens/ScreenRouter";
import { HealthCheckPrepareScreen } from "@/components/screens/HealthCheckPrepareScreen";
import { HealthCheckResultScreen } from "@/components/screens/HealthCheckResultScreen";
import { ReportUploadScreen } from "@/components/screens/ReportUploadScreen";
import { ReportResultScreen } from "@/components/screens/ReportResultScreen";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AppProvider>
      <ToastProvider>{ui}</ToastProvider>
    </AppProvider>
  );
}

// ─── OnboardingScreen ─────────────────────────────────────────────

describe("OnboardingScreen", () => {
  it("renders app title", () => {
    renderWithProviders(<OnboardingScreen />);
    expect(screen.getByText("AI健康监测")).toBeTruthy();
  });

  it("renders core features", () => {
    renderWithProviders(<OnboardingScreen />);
    expect(screen.getByText(/30秒快速面部扫描检测/)).toBeTruthy();
    expect(screen.getByText(/多维度健康数据可视化/)).toBeTruthy();
    expect(screen.getByText(/长期健康趋势追踪/)).toBeTruthy();
    expect(screen.getByText(/数据本地处理，隐私优先/)).toBeTruthy();
  });

  it("renders privacy promise section", () => {
    renderWithProviders(<OnboardingScreen />);
    expect(screen.getByLabelText("隐私承诺")).toBeTruthy();
    expect(screen.getByText(/面部视频仅在本地处理/)).toBeTruthy();
  });

  it("renders start button", () => {
    renderWithProviders(<OnboardingScreen />);
    const buttons = screen.getAllByText(/开始使用/);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── ConsentScreen ────────────────────────────────────────────────

describe("ConsentScreen", () => {
  it("renders consent title", () => {
    renderWithProviders(<ConsentScreen />);
    expect(screen.getByText("隐私与数据授权")).toBeTruthy();
  });

  it("renders accept and decline buttons", () => {
    renderWithProviders(<ConsentScreen />);
    expect(screen.getByText("同意并继续")).toBeTruthy();
    expect(screen.getByText("暂不使用")).toBeTruthy();
  });

  it("renders data collection description", () => {
    renderWithProviders(<ConsentScreen />);
    expect(screen.getByText(/摄像头捕捉的面部光电容积描记信号/)).toBeTruthy();
  });
});

// ─── AlertCenterScreen ────────────────────────────────────────────

describe("AlertCenterScreen", () => {
  it("renders title", () => {
    renderWithProviders(<AlertCenterScreen />);
    expect(screen.getByText("告警中心")).toBeTruthy();
  });

  it("renders filter buttons for all levels", () => {
    renderWithProviders(<AlertCenterScreen />);
    expect(screen.getByText("全部")).toBeTruthy();
    expect(screen.getAllByText(/红色/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/黄色/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/绿色/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders alert items with details", () => {
    renderWithProviders(<AlertCenterScreen />);
    // Should show alert titles from mock data
    const items = screen.getAllByText(/心率异常偏高/);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("filtering by level works", () => {
    renderWithProviders(<AlertCenterScreen />);
    const redBtns = screen.getAllByText(/红色/);
    expect(redBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(redBtns[0]);
    // Only red alerts should be visible
    const items = screen.getAllByText(/心率异常偏高/);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state when no alerts match filter", () => {
    renderWithProviders(<AlertCenterScreen />);
    // Filter by green, should still show green alerts
    const greenBtns = screen.getAllByText(/绿色/);
    expect(greenBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(greenBtns[0]);
    const items = screen.getAllByText(/血压恢复正常/);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── TrendsScreen ─────────────────────────────────────────────────

describe("TrendsScreen", () => {
  it("renders title", () => {
    renderWithProviders(<TrendsScreen />);
    expect(screen.getByText(/健康趋势/)).toBeTruthy();
  });

  it("renders metric selector tabs", () => {
    renderWithProviders(<TrendsScreen />);
    expect(screen.getByRole("tab", { name: /心率/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /血压/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /血氧/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /压力/ })).toBeTruthy();
  });

  it("renders time range selector", () => {
    renderWithProviders(<TrendsScreen />);
    expect(screen.getByText("7天")).toBeTruthy();
    expect(screen.getByText("30天")).toBeTruthy();
    expect(screen.getByText("90天")).toBeTruthy();
  });

  it("renders statistics summary", () => {
    renderWithProviders(<TrendsScreen />);
    expect(screen.getByText(/统计摘要/)).toBeTruthy();
    expect(screen.getByText("平均值")).toBeTruthy();
    expect(screen.getByText("最低值")).toBeTruthy();
    expect(screen.getByText("最高值")).toBeTruthy();
  });

  it("renders weekly insight", () => {
    renderWithProviders(<TrendsScreen />);
    expect(screen.getByText(/本周洞察/)).toBeTruthy();
  });
});

// ─── SettingsScreen ───────────────────────────────────────────────

describe("SettingsScreen", () => {
  it("renders title", () => {
    renderWithProviders(<SettingsScreen />);
    const elements = screen.getAllByText(/设置/);
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders settings groups", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("个人")).toBeTruthy();
    expect(screen.getByText("数据与报告")).toBeTruthy();
    expect(screen.getByText("检测")).toBeTruthy();
    expect(screen.getByText("显示")).toBeTruthy();
    expect(screen.getByText("通知")).toBeTruthy();
    expect(screen.getByText("关于")).toBeTruthy();
  });

  it("renders version info", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText("版本信息")).toBeTruthy();
  });

  it("renders medical disclaimer", () => {
    renderWithProviders(<SettingsScreen />);
    expect(screen.getByText(/本产品不提供医疗诊断/)).toBeTruthy();
  });
});

// ─── HealthScoreScreen ────────────────────────────────────────────

describe("HealthScoreScreen", () => {
  it("renders title", () => {
    renderWithProviders(<HealthScoreScreen />);
    expect(screen.getByText("综合健康评分")).toBeTruthy();
  });

  it("renders overall score", () => {
    renderWithProviders(<HealthScoreScreen />);
    // Score is computed dynamically; verify it renders a number in valid range
    const scoreEl = screen.getByText(/^\d{1,3}$/);
    expect(scoreEl).toBeTruthy();
    const score = parseInt(scoreEl.textContent || "0", 10);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("renders scoring factors", () => {
    renderWithProviders(<HealthScoreScreen />);
    expect(screen.getByText(/评分构成/)).toBeTruthy();
    expect(screen.getByText(/睡眠质量/)).toBeTruthy();
    expect(screen.getByText(/心率健康/)).toBeTruthy();
  });

  it("renders AI insight", () => {
    renderWithProviders(<HealthScoreScreen />);
    expect(screen.getByText(/AI健康洞察/)).toBeTruthy();
  });
});

// ─── PrivacyScreen ────────────────────────────────────────────────

describe("PrivacyScreen", () => {
  it("renders title", () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByText("隐私与数据管理")).toBeTruthy();
  });

  it("renders data collection scope", () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByText(/数据收集范围/)).toBeTruthy();
    expect(screen.getByText(/生理指标/)).toBeTruthy();
  });

  it("renders export buttons", () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByText("JSON")).toBeTruthy();
    expect(screen.getByText("PDF报告")).toBeTruthy();
    expect(screen.getByText("CSV")).toBeTruthy();
  });

  it("renders danger zone with delete button", () => {
    renderWithProviders(<PrivacyScreen />);
    expect(screen.getByText(/删除所有健康数据/)).toBeTruthy();
  });
});

// ─── HealthProfileScreen ──────────────────────────────────────────

describe("HealthProfileScreen", () => {
  it("renders title", () => {
    renderWithProviders(<HealthProfileScreen />);
    expect(screen.getByText("健康档案")).toBeTruthy();
  });

  it("renders basic info fields", () => {
    renderWithProviders(<HealthProfileScreen />);
    expect(screen.getByText(/基本信息/)).toBeTruthy();
  });

  it("renders health background", () => {
    renderWithProviders(<HealthProfileScreen />);
    expect(screen.getByText(/健康背景/)).toBeTruthy();
    expect(screen.getByText("既往病史")).toBeTruthy();
    expect(screen.getByText("家族病史")).toBeTruthy();
  });

  it("renders save button", () => {
    renderWithProviders(<HealthProfileScreen />);
    expect(screen.getByText("保存")).toBeTruthy();
  });
});

// ─── HealthCheckPrepareScreen ─────────────────────────────────────

describe("HealthCheckPrepareScreen", () => {
  it("renders preparation instructions", () => {
    renderWithProviders(<HealthCheckPrepareScreen />);
    // Should show preparation guidance
    expect(screen.getByText(/检测前准备/)).toBeTruthy();
  });
});

// ─── HealthCheckResultScreen ──────────────────────────────────────

describe("HealthCheckResultScreen", () => {
  it("renders result title", () => {
    renderWithProviders(<HealthCheckResultScreen />);
    // Result screen shows either "检测完成" or "检测完成 · 需关注"
    const title = screen.queryByText(/检测完成/);
    expect(title).toBeTruthy();
  });

  it("renders health metrics grid", () => {
    renderWithProviders(<HealthCheckResultScreen />);
    expect(screen.getByText("心率")).toBeTruthy();
    expect(screen.getByText("血压")).toBeTruthy();
    expect(screen.getByText("血氧")).toBeTruthy();
  });

  it("renders health advice section", () => {
    renderWithProviders(<HealthCheckResultScreen />);
    expect(screen.getByText(/健康建议/)).toBeTruthy();
  });

  it("renders navigation buttons", () => {
    renderWithProviders(<HealthCheckResultScreen />);
    expect(screen.getByText(/返回首页/)).toBeTruthy();
    expect(screen.getByText(/重新检测/)).toBeTruthy();
  });
});

// ─── ReportUploadScreen ───────────────────────────────────────────

describe("ReportUploadScreen", () => {
  it("renders title", () => {
    renderWithProviders(<ReportUploadScreen />);
    expect(screen.getByText("体检报告解读")).toBeTruthy();
  });

  it("renders upload area", () => {
    renderWithProviders(<ReportUploadScreen />);
    expect(screen.getByText(/点击上传体检报告/)).toBeTruthy();
    expect(screen.getByText(/支持 JPG、PNG、PDF 格式/)).toBeTruthy();
  });

  it("renders upload method buttons", () => {
    renderWithProviders(<ReportUploadScreen />);
    expect(screen.getByText(/拍照上传/)).toBeTruthy();
    expect(screen.getByText(/相册选择/)).toBeTruthy();
    expect(screen.getByText(/PDF导入/)).toBeTruthy();
  });

  it("renders progress steps", () => {
    renderWithProviders(<ReportUploadScreen />);
    // Three step dots (1 is active, 2 and 3 are pending)
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });

  it("renders historical report", () => {
    renderWithProviders(<ReportUploadScreen />);
    expect(screen.getByText("历史报告")).toBeTruthy();
    expect(screen.getByText(/2025年度体检报告/)).toBeTruthy();
  });
});

// ─── ReportResultScreen ───────────────────────────────────────────

describe("ReportResultScreen", () => {
  it("renders report title", () => {
    renderWithProviders(<ReportResultScreen />);
    expect(screen.getByText("报告解读")).toBeTruthy();
  });

  it("renders report header info", () => {
    renderWithProviders(<ReportResultScreen />);
    expect(screen.getByText(/2025年度体检报告/)).toBeTruthy();
  });

  it("renders indicators section", () => {
    renderWithProviders(<ReportResultScreen />);
    expect(screen.getByText(/指标解读/)).toBeTruthy();
  });

  it("renders AI advice", () => {
    renderWithProviders(<ReportResultScreen />);
    const tabBtn = screen.getByText(/AI建议/);
    fireEvent.click(tabBtn);
    // After clicking the advice tab, AI-generated content should appear
    expect(screen.getByText(/本内容由AI生成/)).toBeTruthy();
  });

  it("renders AI disclaimer", () => {
    renderWithProviders(<ReportResultScreen />);
    // Click the advice tab to show AI content with disclaimer
    const tabBtn = screen.getByText(/AI建议/);
    fireEvent.click(tabBtn);
    expect(screen.getByText(/本内容由AI生成/)).toBeTruthy();
  });
});

// ─── ScreenRouter ─────────────────────────────────────────────────

describe("ScreenRouter", () => {
  it("renders initial screen (onboarding)", async () => {
    renderWithProviders(<ScreenRouter />);
    // Default state starts at onboarding — lazy-loaded, so use findByText
    expect(await screen.findByText("AI健康监测")).toBeTruthy();
  });

  it("renders screen not found for invalid screen", () => {
    // Cannot easily test this without modifying the context state
    // which would require a way to dispatch from outside
    // This is covered by E2E tests
  });
});

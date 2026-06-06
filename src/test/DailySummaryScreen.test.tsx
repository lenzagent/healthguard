import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DailySummaryScreen } from "@/components/screens/DailySummaryScreen";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/components/ui/Toast";

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <AppProvider>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </AppProvider>
  );
}

describe("DailySummaryScreen", () => {
  it("renders the greeting with personalized message", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/早上好/)).toBeTruthy();
    expect(getByText(/小明/)).toBeTruthy();
  });

  it("renders the health score snapshot", () => {
    const { getByText, getAllByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getAllByText(/今日健康评分/).length).toBeGreaterThanOrEqual(1);
    const scores = getByText("78");
    expect(scores).toBeTruthy();
  });

  it("renders the sleep analysis section", () => {
    const { getByText, getAllByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/昨晚睡眠分析/)).toBeTruthy();
    expect(getAllByText(/睡眠时长/).length).toBeGreaterThanOrEqual(1);
    expect(getByText("7.5h")).toBeTruthy();
  });

  it("renders the exercise recommendation section", () => {
    const { getByText, getAllByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/今日运动建议/)).toBeTruthy();
    expect(getByText("45")).toBeTruthy();
    expect(getAllByText(/有氧运动/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the trends section", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/趋势延续提醒/)).toBeTruthy();
    expect(getByText("睡眠质量")).toBeTruthy();
    expect(getByText("静息心率")).toBeTruthy();
  });

  it("renders the anomalies section with yellow alert", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/异常指标关注/)).toBeTruthy();
    expect(getByText("108 bpm")).toBeTruthy();
  });

  it("renders the AI disclaimer", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/本内容由AI生成/)).toBeTruthy();
    expect(getByText(/仅供参考/)).toBeTruthy();
  });

  it("renders the CTA buttons", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/查看详细评分/)).toBeTruthy();
    expect(getByText(/推送设置/)).toBeTruthy();
  });

  it("renders the daily push toggle summary settings", () => {
    const { getByText } = renderWithProviders(<DailySummaryScreen />);
    expect(getByText(/每日推送/)).toBeTruthy();
    expect(getByText(/每天 08:00 推送/)).toBeTruthy();
  });
});

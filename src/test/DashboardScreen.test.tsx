import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DashboardScreen } from "@/components/screens/DashboardScreen";
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

describe("DashboardScreen", () => {
  it("renders the user greeting with mock user name", () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    expect(getByText(/你好/)).toBeTruthy();
    expect(getByText(/小明/)).toBeTruthy();
  });

  it("renders all three metric cards", () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    expect(getByText("心率")).toBeTruthy();
    expect(getByText("血压")).toBeTruthy();
    expect(getByText("血氧")).toBeTruthy();
  });

  it("renders the start detection CTA button", () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    expect(getByText(/开始检测/)).toBeTruthy();
  });

  it("renders health score section", () => {
    const { getByText } = renderWithProviders(<DashboardScreen />);
    expect(getByText("综合健康评分")).toBeTruthy();
  });

  it("renders the alert bell button", () => {
    const { container } = renderWithProviders(<DashboardScreen />);
    // The bell button is always rendered as part of the header
    const bellBtn = container.querySelector('[aria-label="告警中心"]');
    expect(bellBtn).toBeTruthy();
  });
});

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ReportUploadScreen } from "@/components/screens/ReportUploadScreen";
import { ReportProcessingScreen } from "@/components/screens/ReportProcessingScreen";
import { ReportResultScreen } from "@/components/screens/ReportResultScreen";
import { ReportCompareScreen } from "@/components/screens/ReportCompareScreen";
import { ReportSummaryScreen } from "@/components/screens/ReportSummaryScreen";
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

describe("ReportUploadScreen", () => {
  it("renders the upload zone with CTA text", () => {
    const { getByText } = renderWithProviders(<ReportUploadScreen />);
    expect(getByText(/点击上传体检报告/)).toBeTruthy();
  });

  it("renders three upload method buttons", () => {
    const { getByText } = renderWithProviders(<ReportUploadScreen />);
    expect(getByText("拍照上传")).toBeTruthy();
    expect(getByText("相册选择")).toBeTruthy();
    expect(getByText("PDF导入")).toBeTruthy();
  });

  it("renders PIPL privacy commitment", () => {
    const { getByText } = renderWithProviders(<ReportUploadScreen />);
    expect(getByText(/隐私保护承诺/)).toBeTruthy();
  });

  it("renders step indicator (Step 1 active)", () => {
    const { container } = renderWithProviders(<ReportUploadScreen />);
    const stepDots = container.querySelectorAll('[style*="border-radius: 50%"]');
    expect(stepDots.length).toBeGreaterThanOrEqual(3);
  });

  it("renders historical reports from mock data", () => {
    const { getByText } = renderWithProviders(<ReportUploadScreen />);
    expect(getByText(/2025年度体检报告/)).toBeTruthy();
    expect(getByText(/2024年度体检报告/)).toBeTruthy();
  });

  it("shows compare button when multiple reports exist", () => {
    const { getByText } = renderWithProviders(<ReportUploadScreen />);
    expect(getByText(/对比历年报告/)).toBeTruthy();
  });
});

describe("ReportProcessingScreen", () => {
  it("renders processing title", () => {
    const { getByText } = renderWithProviders(<ReportProcessingScreen />);
    expect(getByText("正在分析...")).toBeTruthy();
  });

  it("renders estimated time", () => {
    const { getByText } = renderWithProviders(<ReportProcessingScreen />);
    expect(getByText(/预计需要/)).toBeTruthy();
  });

  it("renders progress bar", () => {
    const { container } = renderWithProviders(<ReportProcessingScreen />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeTruthy();
  });
});

describe("ReportResultScreen", () => {
  it("renders the report title", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    expect(getByText("2025年度体检报告")).toBeTruthy();
  });

  it("renders OCR accuracy info", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    expect(getByText(/OCR识别准确率/)).toBeTruthy();
  });

  it("renders three tab buttons", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    expect(getByText(/指标解读/)).toBeTruthy();
    expect(getByText(/关联分析/)).toBeTruthy();
    expect(getByText(/AI建议/)).toBeTruthy();
  });

  it("renders AI disclaimer", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    expect(getByText(/本内容由AI生成，仅供参考/)).toBeTruthy();
  });

  it("renders report indicators grouped by category", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    // Category headers
    expect(getByText(/一般检查/)).toBeTruthy();
    expect(getByText(/血常规/)).toBeTruthy();
    expect(getByText(/肝功能/)).toBeTruthy();
    expect(getByText(/血脂/)).toBeTruthy();
  });

  it("renders abnormal count badges on categories with issues", () => {
    const { getAllByText } = renderWithProviders(<ReportResultScreen />);
    const badges = getAllByText(/项需关注/);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders hospital and exam date info", () => {
    const { getByText } = renderWithProviders(<ReportResultScreen />);
    expect(getByText(/某三甲医院体检中心/)).toBeTruthy();
    expect(getByText(/2025-11-20/)).toBeTruthy();
  });
});

describe("ReportCompareScreen", () => {
  it("renders the comparison title", () => {
    const { getByText } = renderWithProviders(<ReportCompareScreen />);
    expect(getByText("历年报告对比")).toBeTruthy();
  });

  it("renders AI trend analysis", () => {
    const { getByText } = renderWithProviders(<ReportCompareScreen />);
    expect(getByText(/AI趋势分析/)).toBeTruthy();
  });

  it("renders key findings section", () => {
    const { getByText } = renderWithProviders(<ReportCompareScreen />);
    expect(getByText(/重点关注/)).toBeTruthy();
  });

  it("renders trend charts for key metrics", () => {
    const { getAllByText } = renderWithProviders(<ReportCompareScreen />);
    expect(getAllByText(/甘油三酯/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/总胆固醇/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders AI disclaimer", () => {
    const { getByText } = renderWithProviders(<ReportCompareScreen />);
    expect(getByText(/本内容由AI生成，仅供参考/)).toBeTruthy();
  });
});

describe("ReportSummaryScreen", () => {
  it("renders the doctor summary title", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/给医生的数据摘要/)).toBeTruthy();
  });

  it("renders patient basic info", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/基本信息/)).toBeTruthy();
    expect(getByText(/小明/)).toBeTruthy();
  });

  it("renders abnormal indicators section", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/需关注的指标/)).toBeTruthy();
  });

  it("renders PIPL compliance notice", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/个人信息保护法/)).toBeTruthy();
  });

  it("renders export PDF button", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/导出PDF/)).toBeTruthy();
  });

  it("renders medical disclaimer", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/本摘要由AI生成/)).toBeTruthy();
  });

  it("renders trend summary section", () => {
    const { getByText } = renderWithProviders(<ReportSummaryScreen />);
    expect(getByText(/历年趋势摘要/)).toBeTruthy();
  });
});

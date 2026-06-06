/**
 * E2E Journey 3: Upload Medical Report → AI Interpretation → View Correlated Analysis
 *
 * Covers: ReportUpload → ReportProcessing → ReportResult with AI analysis
 */
import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Journey 3: Medical Report AI Interpretation", () => {
  test("should upload report and view AI interpretation", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Complete onboarding
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();

    // Navigate to reports tab
    await page.getByLabel("报告").click();

    // Step 1: Report Upload screen
    await expect(page.getByText("体检报告解读")).toBeVisible();

    // Verify upload area
    await expect(
      page.getByText(/点击上传体检报告/)
    ).toBeVisible();

    // Verify format support text
    await expect(
      page.getByText(/支持 JPG、PNG、PDF 格式/)
    ).toBeVisible();

    // Verify upload methods
    await expect(page.getByText(/拍照上传/)).toBeVisible();
    await expect(page.getByText(/相册选择/)).toBeVisible();
    await expect(page.getByText(/PDF导入/)).toBeVisible();

    // Step 2: Click upload area — consent dialog appears
    // Prepare a minimal 1x1 PNG test file for the file chooser
    const testDir = path.resolve(__dirname, "..", "test-results");
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const testPng = path.join(testDir, "test-report.png");
    // Minimal valid 1x1 white PNG (67 bytes)
    const minimalPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      "base64"
    );
    fs.writeFileSync(testPng, minimalPng);

    const fileChooserPromise = page.waitForEvent("filechooser");
    await page.getByLabel("点击上传体检报告").click();

    // Handle consent dialog
    await expect(page.getByText(/隐私保护授权/)).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: /全部同意并继续/ }).click();

    // Handle file chooser — provide test PNG
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(testPng);

    // Step 3: Report Processing (AI analysis)
    await expect(page.getByText(/正在分析/)).toBeVisible({ timeout: 10000 });

    // Wait for processing
    await page.waitForTimeout(3000);

    // Step 4: Report Result with AI interpretation
    await expect(page.getByText("报告解读")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/2025年度体检报告/)).toBeVisible();

    // Verify indicators section
    await expect(page.getByText(/指标解读/)).toBeVisible();

    // Step 5: Switch to AI Advice tab and verify content
    await page.getByRole("button", { name: /AI建议/ }).click();
    await expect(page.getByText(/AI综合建议/)).toBeVisible();
    await expect(page.getByText(/行动计划/)).toBeVisible();

    // Step 6: Verify AI disclaimer is shown
    await expect(
      page.getByText(/AI生成，仅供参考/)
    ).toBeVisible();
    await expect(
      page.getByText(/不构成医疗诊断或治疗方案/)
    ).toBeVisible();
  });

  test("should view historical report", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Navigate to reports
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();
    await page.getByLabel("报告").click();

    // Check historical report entry
    await expect(page.getByText("历史报告")).toBeVisible();
    await expect(page.getByText(/2025年度体检报告/)).toBeVisible();
  });
});

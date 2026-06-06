/**
 * E2E Journey 1: New User Registration → Privacy Consent → First Check → View Results
 *
 * Covers: Onboarding → Consent → CameraPermission → HealthCheckPrepare →
 * HealthCheckMonitoring → HealthCheckResult
 */
import { test, expect } from "@playwright/test";

test.describe("Journey 1: New User Onboarding to First Health Check", () => {
  test("should complete full onboarding and first check flow", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Step 1: Onboarding screen
    await expect(page.getByText("AI健康监测")).toBeVisible();
    await expect(page.getByText(/30秒快速面部扫描/)).toBeVisible();

    // Click start
    await page.getByRole("button", { name: /开始使用/ }).click();

    // Step 2: Privacy Consent screen
    await expect(page.getByText("隐私与数据授权")).toBeVisible();
    await expect(page.getByText(/数据处理说明/)).toBeVisible();

    // Accept consent
    await page.getByRole("button", { name: /同意并继续/ }).click();

    // Step 3: Camera Permission — grant access
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();

    // Camera permission navigates to dashboard; click "开始检测" CTA
    await page.getByRole("button", { name: /开始检测/ }).click();

    // Step 4: Health Check Preparation
    await expect(page.getByText(/检测前准备/)).toBeVisible({
      timeout: 10000,
    });

    // Start check
    await page.getByRole("button", { name: /开始检测/ }).click();

    // Step 5: Health Check Monitoring (camera scan simulation)
    await expect(page.getByText(/正在检测/)).toBeVisible({ timeout: 10000 });

    // Wait for monitoring to auto-complete (30s countdown)
    await expect(page.getByText(/检测完成/)).toBeVisible({ timeout: 40000 });

    // Verify result sections visible
    await expect(page.getByText(/心率/)).toBeVisible();
    await expect(page.getByText(/血压/)).toBeVisible();
    await expect(page.getByText(/血氧/)).toBeVisible();
    await expect(page.getByText(/健康建议/)).toBeVisible();

    // Should see navigation buttons
    await expect(page.getByText(/返回首页/)).toBeVisible();
    await expect(page.getByText(/重新检测/)).toBeVisible();
  });

  test("should show privacy commitment on onboarding (mobile)", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration
    await expect(
      page.getByLabel("隐私承诺")
    ).toBeVisible();
    await expect(
      page.getByText(/面部视频仅在本地处理/)
    ).toBeVisible();
    await expect(
      page.getByText(/不上传服务器/)
    ).toBeVisible();
  });
});

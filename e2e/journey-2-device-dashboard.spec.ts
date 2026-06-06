/**
 * E2E Journey 2: Device Connection → Data Sync → View Dashboard
 *
 * Covers: DeviceConnect → Dashboard with connected devices data
 */
import { test, expect } from "@playwright/test";

test.describe("Journey 2: Device Connection to Dashboard", () => {
  test("should connect device and view dashboard", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Navigate to settings via onboarding skip
    // For testing, we navigate directly or click through onboarding
    // First, complete onboarding quickly
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();

    // Navigate to settings tab
    await page.locator(".bottom-nav-item").filter({ hasText: /设置/ }).click();

    // Navigate to device connect
    await page.getByText("设备连接中心").click();

    // Step 1: Device Connect screen
    await expect(page.getByText("设备连接中心")).toBeVisible();
    await expect(page.getByText(/已连接/).first()).toBeVisible();

    // Should show device brands
    await expect(page.getByText("Apple Health")).toBeVisible();
    await expect(page.getByText("华为运动健康")).toBeVisible();

    // Step 2: Connect a new device
    const xiaomiBtn = page.getByText("小米健康");
    await expect(xiaomiBtn).toBeVisible();
    await xiaomiBtn.click();

    // Should show connection toast
    await expect(page.getByText(/已连接小米健康/)).toBeVisible({ timeout: 5000 });

    // Step 3: Trigger data sync and verify sync started
    await page.getByRole("button", { name: /立即同步数据/ }).click();
    await expect(page.getByText(/正在同步最近/)).toBeVisible({ timeout: 5000 });

    // Step 4: Navigate back to dashboard
    await page.getByLabel("返回").click();
    // Should be back on settings (verify by checking settings header)
    await expect(page.getByText("设置").first()).toBeVisible({ timeout: 5000 });
    // Now on settings, click home tab
    await page.getByLabel("首页").click({ force: true });

    // Verify dashboard with device data
    await expect(page.getByText(/你好/)).toBeVisible();
    await expect(page.getByText("综合健康评分")).toBeVisible();
    await expect(page.getByText("心率").first()).toBeVisible();
    await expect(page.getByText("血压").first()).toBeVisible();
    await expect(page.getByText("血氧").first()).toBeVisible();
  });

  test("should show PIPL compliance notice on sync", async ({ page }) => {
    // Navigate to device connect
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Navigate through settings
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();
    await page.getByLabel("设置").click();
    await page.getByText("设备连接中心").click();

    // Verify PIPL text
    await expect(
      page.getByText(/数据同步遵循PIPL合规/)
    ).toBeVisible();
  });
});

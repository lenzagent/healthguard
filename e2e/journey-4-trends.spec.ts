/**
 * E2E Journey 4: View Trends → Switch Metrics → Change Time Ranges
 *
 * Covers: TrendsScreen with metric switching and time range changes
 */
import { test, expect } from "@playwright/test";

test.describe("Journey 4: Health Trends Analysis", () => {
  test("should switch between health metrics", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Complete onboarding
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();

    // Navigate to trends tab
    await page.getByLabel("趋势").click();

    // Step 1: Default view is heart rate
    await expect(page.getByText(/健康趋势/)).toBeVisible();
    await expect(page.getByRole("tab", { selected: true })).toContainText(/心率/);

    // Step 2: Switch to blood pressure
    await page.getByRole("tab", { name: /血压/ }).click();
    await expect(page.getByRole("tab", { selected: true })).toContainText(/血压/);

    // Verify stats update for blood pressure
    const avgElements = page.getByText("平均值");
    await expect(avgElements).toBeVisible();

    // Step 3: Switch to SpO2
    await page.getByRole("tab", { name: /血氧/ }).click();
    await expect(page.getByRole("tab", { selected: true })).toContainText(/血氧/);

    // Step 4: Switch to stress
    await page.getByRole("tab", { name: /压力/ }).click();
    await expect(page.getByRole("tab", { selected: true })).toContainText(/压力/);
  });

  test("should change time ranges", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    // Navigate to trends
    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();
    await page.getByLabel("趋势").click();

    // Default is 7 days
    const sevenDayBtn = page.getByRole("button", { name: "7天" });
    await expect(sevenDayBtn).toBeVisible();

    // Switch to 30 days
    await page.getByRole("button", { name: "30天" }).click();

    // Switch to 90 days
    await page.getByRole("button", { name: "90天" }).click();
  });

  test("should show weekly insight", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();
    await page.getByLabel("趋势").click();

    // Verify insight section
    await expect(page.getByText(/本周洞察/)).toBeVisible();
  });

  test("should show statistics for each metric", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000); // Wait for Next.js hydration

    await page.getByRole("button", { name: /开始使用/ }).click();
    await page.getByRole("button", { name: /同意并继续/ }).click();
    // Camera permission — grant to reach dashboard
    await page.getByRole("button", { name: /允许摄像头访问/ }).click();
    await page.getByLabel("趋势").click();

    // Verify stat boxes
    await expect(page.getByText("平均值")).toBeVisible();
    await expect(page.getByText("最低值")).toBeVisible();
    await expect(page.getByText("最高值")).toBeVisible();
  });
});

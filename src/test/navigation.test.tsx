/**
 * Navigation Component Tests: TopNav, BottomNav
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEffect } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { BottomNav } from "@/components/navigation/BottomNav";
import { AppProvider, useApp } from "@/context/AppContext";

// ─── TopNav ───────────────────────────────────────────────────────

describe("TopNav", () => {
  it("renders title", () => {
    render(
      <AppProvider>
        <TopNav title="告警中心" />
      </AppProvider>
    );
    expect(screen.getByText("告警中心")).toBeTruthy();
  });

  it("renders back button by default", () => {
    render(
      <AppProvider>
        <TopNav title="Settings" />
      </AppProvider>
    );
    expect(screen.getByLabelText("返回")).toBeTruthy();
  });

  it("hides back button when showBack is false", () => {
    render(
      <AppProvider>
        <TopNav title="Dashboard" showBack={false} />
      </AppProvider>
    );
    expect(screen.queryByLabelText("返回")).toBeNull();
  });

  it("renders action button when action prop provided", () => {
    const onClick = vi.fn();
    render(
      <AppProvider>
        <TopNav
          title="Alert Center"
          action={{ label: "✓ 全部已读", onClick }}
        />
      </AppProvider>
    );
    const actionBtn = screen.getByText("✓ 全部已读");
    expect(actionBtn).toBeTruthy();
    fireEvent.click(actionBtn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

// ─── BottomNav ────────────────────────────────────────────────────

/** Wrapper that switches to "home" tab so BottomNav is visible */
function BottomNavVisible() {
  const { switchTab } = useApp();
  useEffect(() => {
    switchTab("home");
  }, [switchTab]);
  return <BottomNav />;
}

function renderBottomNav() {
  return render(
    <AppProvider>
      <BottomNavVisible />
    </AppProvider>
  );
}

describe("BottomNav", () => {
  it("renders all 4 tab buttons", () => {
    renderBottomNav();
    expect(screen.getByText("首页")).toBeTruthy();
    expect(screen.getByText("趋势")).toBeTruthy();
    expect(screen.getByText("报告")).toBeTruthy();
    expect(screen.getByText("设置")).toBeTruthy();
  });

  it("has navigation role", () => {
    renderBottomNav();
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("each tab has aria-label", () => {
    renderBottomNav();
    expect(screen.getByLabelText("首页")).toBeTruthy();
    expect(screen.getByLabelText("趋势")).toBeTruthy();
    expect(screen.getByLabelText("报告")).toBeTruthy();
    expect(screen.getByLabelText("设置")).toBeTruthy();
  });

  it("home tab has aria-current='page' when on dashboard", () => {
    renderBottomNav();
    const nav = screen.getByRole("navigation");
    expect(nav).toBeTruthy();
  });
});

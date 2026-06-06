"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import type { TabId } from "@/lib/types";

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: "home", label: "首页", icon: "🏠" },
  { id: "trends", label: "趋势", icon: "📊" },
  { id: "reports", label: "报告", icon: "📋" },
  { id: "settings", label: "设置", icon: "⚙️" },
];

const mainScreens = [
  "dashboard",
  "check-prepare",
  "trends",
  "report-upload",
  "settings",
];

export function BottomNav() {
  const { state, switchTab } = useApp();
  const visible = mainScreens.includes(state.currentScreen);

  if (!visible) return null;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="主导航">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${state.currentTab === tab.id ? "active" : ""}`}
          onClick={() => switchTab(tab.id)}
          aria-label={tab.label}
          aria-current={state.currentTab === tab.id ? "page" : undefined}
        >
          <span className="nav-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
      <style jsx>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: var(--max-app-width, 390px);
          height: var(--bottom-nav-height, 64px);
          background: #fff;
          border-top: 1px solid #e5e7eb;
          display: flex;
          z-index: 200;
        }
        @media (min-width: 768px) {
          .bottom-nav { max-width: 420px; }
        }
        @media (min-width: 1024px) {
          .bottom-nav { max-width: 480px; }
        }
        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          font-size: 11px;
          font-family: var(--font-sans);
          color: #9ca3af;
          cursor: pointer;
          gap: 4px;
          transition: color 100ms ease;
        }
        .bottom-nav-item.active {
          color: #3b82f6;
        }
        .nav-icon {
          font-size: 22px;
          line-height: 1;
        }
        @media (prefers-color-scheme: dark) {
          .bottom-nav {
            background: #1f2937;
            border-color: #374151;
          }
        }
      `}</style>
    </nav>
  );
}

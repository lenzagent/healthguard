"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

interface TopNavProps {
  title: string;
  showBack?: boolean;
  backTo?: string;
  action?: { label: string; onClick: () => void };
}

export function TopNav({ title, showBack = true, action }: TopNavProps) {
  const { goBack } = useApp();

  return (
    <div className="top-nav">
      <div className="top-nav-left">
        {showBack && (
          <button
            className="top-nav-back"
            onClick={goBack}
            aria-label="返回"
          >
            ←
          </button>
        )}
      </div>
      <span className="top-nav-title">{title}</span>
      <div className="top-nav-right">
        {action && (
          <button className="top-nav-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      <style jsx>{`
        .top-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 100;
          border-bottom: 1px solid #e5e7eb;
        }
        .top-nav-title {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }
        .top-nav-back {
          width: 36px;
          height: 36px;
          border: none;
          background: none;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #374151;
        }
        .top-nav-back:hover {
          background: #f3f4f6;
        }
        .top-nav-action {
          font-size: 14px;
          font-weight: 500;
          color: #3b82f6;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
        }
        .top-nav-action:hover {
          background: #eff6ff;
        }
        .top-nav-left, .top-nav-right {
          width: 48px;
          display: flex;
          align-items: center;
        }
        .top-nav-right {
          justify-content: flex-end;
        }
        @media (prefers-color-scheme: dark) {
          .top-nav {
            background: #1f2937;
            border-color: #374151;
          }
          .top-nav-title {
            color: #f3f4f6;
          }
        }
      `}</style>
    </div>
  );
}

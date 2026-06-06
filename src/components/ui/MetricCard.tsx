import React from "react";
import type { MetricStatus } from "@/lib/types";

interface MetricCardProps {
  icon: string;
  value: number | string;
  unit: string;
  label: string;
  status: MetricStatus;
  color?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

const statusStyles: Record<MetricStatus, { bg: string; color: string; text: string }> = {
  normal: { bg: "#dcfce7", color: "#15803d", text: "正常" },
  caution: { bg: "#fef3c7", color: "#b45309", text: "注意" },
  abnormal: { bg: "#fee2e2", color: "#b91c1c", text: "异常" },
};

export function MetricCard({
  icon,
  value,
  unit,
  label,
  status,
  color = "#111827",
  onClick,
  ariaLabel,
}: MetricCardProps) {
  const s = statusStyles[status];
  return (
    <button
      className="metric-card"
      onClick={onClick}
      aria-label={ariaLabel || `${label} ${value} ${unit} ${s.text}`}
    >
      <div className="metric-icon">{icon}</div>
      <div className="metric-value" style={{ color }}>
        {value}
      </div>
      <div className="metric-unit">{unit}</div>
      <div className="metric-label">{label}</div>
      <span className="metric-status" style={{ background: s.bg, color: s.color }}>
        {s.text}
      </span>
      <style jsx>{`
        .metric-card {
          background: #fff;
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          cursor: pointer;
          transition: box-shadow 100ms ease, transform 100ms ease;
          border: none;
          width: 100%;
          font-family: var(--font-sans);
        }
        .metric-card:hover,
        .metric-card:focus-visible {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
          outline: none;
        }
        .metric-card:focus-visible {
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        .metric-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }
        .metric-value {
          font-size: 28px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          font-family: var(--font-mono);
          line-height: 1.1;
        }
        .metric-unit {
          font-size: 11px;
          color: #9ca3af;
          font-weight: 400;
        }
        .metric-label {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .metric-status {
          display: inline-block;
          font-size: 10px;
          font-weight: 500;
          padding: 1px 6px;
          border-radius: 999px;
          margin-top: 4px;
        }
        @media (prefers-color-scheme: dark) {
          .metric-card {
            background: #1f2937;
            color: #f3f4f6;
          }
          .metric-label {
            color: #d1d5db;
          }
        }
      `}</style>
    </button>
  );
}

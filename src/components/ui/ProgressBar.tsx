import React from "react";

interface ProgressBarProps {
  value: number; // 0-100
  color?: "low" | "mid" | "high" | "normal";
  height?: number;
  label?: string;
}

const colorMap: Record<string, string> = { low: "#22c55e", mid: "#f59e0b", high: "#ef4444", normal: "#22c55e" };

export function ProgressBar({
  value,
  color = "low",
  height = 8,
  label,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || `${clampedValue}%`}
        style={{ height }}
      >
        <div
          className="progress-fill"
          style={{
            width: `${clampedValue}%`,
            background: colorMap[color],
          }}
        />
      </div>
      <style jsx>{`
        .progress-bar {
          width: 100%;
          background: #e5e7eb;
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @media (prefers-color-scheme: dark) {
          .progress-bar { background: #4b5563; }
        }
      `}</style>
    </div>
  );
}

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className = "", onClick, style }: CardProps) {
  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={style}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
      <style jsx>{`
        .card {
          background: #fff;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
          ${onClick ? "cursor: pointer; transition: box-shadow 100ms ease;" : ""}
        }
        .card:hover {
          ${onClick ? "box-shadow: 0 4px 12px rgba(0,0,0,0.08);" : ""}
        }
        @media (prefers-color-scheme: dark) {
          .card {
            background: #1f2937;
            color: #f3f4f6;
          }
        }
      `}</style>
    </div>
  );
}

export function CardHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="card-header">
      {children}
      <style jsx>{`
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="card-title">
      {children}
      <style jsx>{`
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        @media (prefers-color-scheme: dark) {
          .card-title { color: #f3f4f6; }
        }
      `}</style>
    </span>
  );
}

import React from "react";

type ButtonVariant = "primary" | "accent" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  ariaLabel?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "background:#2563eb;color:#fff;",
  accent: "background:#f97316;color:#fff;",
  secondary: "background:#f3f4f6;color:#374151;",
  danger: "background:#ef4444;color:#fff;",
  ghost: "background:none;color:#3b82f6;",
};

const hoverStyles: Record<ButtonVariant, string> = {
  primary: "#1d4ed8",
  accent: "#ea580c",
  secondary: "#e5e7eb",
  danger: "#dc2626",
  ghost: "#eff6ff",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  className = "",
  style,
  disabled,
  ariaLabel,
  fullWidth = variant !== "ghost",
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    minHeight: size === "sm" ? "36px" : "48px",
    padding: size === "sm" ? "8px 16px" : "12px 24px",
    fontSize: size === "sm" ? "14px" : "16px",
    fontWeight: 600,
    fontFamily: "var(--font-sans)",
    borderRadius: size === "sm" ? "8px" : "12px",
    border: "none",
    cursor: "pointer",
    transition: "all 100ms ease",
    width: fullWidth ? "100%" : undefined,
    ...style,
  };

  React.useEffect(() => {
    // CSS-in-JS hover effect handled via style tag
  }, []);

  return (
    <>
      <button
        className={`btn btn-${variant} btn-${size} ${className}`}
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        style={baseStyle}
      >
        {children}
      </button>
      <style jsx>{`
        .btn-primary { background: #2563eb; color: #fff; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-primary:active { background: #1e40af; transform: scale(0.98); }
        .btn-accent { background: #f97316; color: #fff; }
        .btn-accent:hover { background: #ea580c; }
        .btn-secondary { background: #f3f4f6; color: #374151; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; }
        .btn-ghost { background: none; color: #3b82f6; padding: 12px 16px; }
        .btn-ghost:hover { background: #eff6ff; }
        button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.3);
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}

/**
 * UI Component Tests: Button, Card, MetricCard, ProgressBar
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressBar } from "@/components/ui/ProgressBar";

// ─── Button ───────────────────────────────────────────────────────

describe("Button", () => {
  it("renders children text", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);
    fireEvent.click(screen.getByText("Submit"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText("Disabled").closest("button");
    expect(button?.disabled).toBe(true);
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    );
    fireEvent.click(screen.getByText("Disabled"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("sets aria-label when provided", () => {
    render(<Button ariaLabel="Close dialog">×</Button>);
    expect(screen.getByLabelText("Close dialog")).toBeTruthy();
  });

  it("renders all variants without crashing", () => {
    const variants = ["primary", "accent", "secondary", "danger", "ghost"] as const;
    for (const variant of variants) {
      const { unmount } = render(
        <Button variant={variant}>Variant {variant}</Button>
      );
      expect(screen.getByText(`Variant ${variant}`)).toBeTruthy();
      unmount();
    }
  });

  it("renders both sizes", () => {
    const { unmount } = render(<Button size="sm">Small</Button>);
    expect(screen.getByText("Small")).toBeTruthy();
    unmount();

    render(<Button size="md">Medium</Button>);
    expect(screen.getByText("Medium")).toBeTruthy();
  });
});

// ─── Card ─────────────────────────────────────────────────────────

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText("Card content")).toBeTruthy();
  });

  it("renders with role button when onClick provided", () => {
    render(<Card onClick={() => {}}>Clickable</Card>);
    const card = screen.getByText("Clickable").closest("div");
    expect(card?.getAttribute("role")).toBe("button");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Click</Card>);
    fireEvent.click(screen.getByText("Click"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick on Enter key", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Key Card</Card>);
    fireEvent.keyDown(screen.getByText("Key Card"), { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick on Space key", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick}>Space Card</Card>);
    fireEvent.keyDown(screen.getByText("Space Card"), { key: " " });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not have button role without onClick", () => {
    render(<Card>Plain</Card>);
    const card = screen.getByText("Plain").closest("div");
    expect(card?.getAttribute("role")).toBeNull();
  });
});

describe("CardTitle", () => {
  it("renders title text", () => {
    render(<CardTitle>Test Title</CardTitle>);
    expect(screen.getByText("Test Title")).toBeTruthy();
  });
});

// ─── MetricCard ────────────────────────────────────────────────────

describe("MetricCard", () => {
  it("renders all metric information", () => {
    render(
      <MetricCard
        icon="❤️"
        value={72}
        unit="bpm"
        label="心率"
        status="normal"
        color="#ef4444"
      />
    );
    expect(screen.getByText("72")).toBeTruthy();
    expect(screen.getByText("bpm")).toBeTruthy();
    expect(screen.getByText("心率")).toBeTruthy();
    expect(screen.getByText("正常")).toBeTruthy();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(
      <MetricCard
        icon="❤️"
        value={72}
        unit="bpm"
        label="心率"
        status="normal"
        onClick={onClick}
      />
    );
    fireEvent.click(screen.getByText("心率"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows correct status text for each status", () => {
    const statusTexts: Record<string, string> = {
      normal: "正常",
      caution: "注意",
      abnormal: "异常",
    };

    for (const [status, text] of Object.entries(statusTexts)) {
      const { unmount } = render(
        <MetricCard
          icon="❤️"
          value={100}
          unit="bpm"
          label="心率"
          status={status as "normal" | "caution" | "abnormal"}
        />
      );
      expect(screen.getByText(text)).toBeTruthy();
      unmount();
    }
  });
});

// ─── ProgressBar ───────────────────────────────────────────────────

describe("ProgressBar", () => {
  it("renders with correct aria attributes", () => {
    render(<ProgressBar value={45} color="mid" label="Stress Level" />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("45");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
  });

  it("clamps value to 0-100 range", () => {
    render(<ProgressBar value={150} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("clamps negative values to 0", () => {
    render(<ProgressBar value={-10} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });

  it("renders with label when provided", () => {
    render(<ProgressBar value={75} label="75%" />);
    expect(screen.getByLabelText("75%")).toBeTruthy();
  });

  it("uses default color when not specified", () => {
    render(<ProgressBar value={50} />);
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
});

"use client";

import React, { useState, useEffect } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  loadThresholds,
  saveThresholds,
  resetThresholds,
  validateUserThresholds,
  THRESHOLD_FIELDS,
  getActiveThresholds,
  type ThresholdFieldMeta,
} from "@/lib/thresholds";
import { DEFAULT_THRESHOLDS, type ThresholdConfig } from "@/lib/anomalyDetection";

export function ThresholdSettingsScreen() {
  const { showToast } = useToast();
  const [thresholds, setThresholds] = useState<Partial<ThresholdConfig>>({});
  const [validation, setValidation] = useState<{ errors: string[]; warnings: string[] }>({
    errors: [],
    warnings: [],
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = loadThresholds();
    if (saved) {
      setThresholds(saved);
    }
  }, []);

  const getValue = (group: string, key: string): number => {
    const g = (thresholds as Record<string, Record<string, number> | undefined>)[group];
    if (g && key in g) {
      return g[key];
    }
    // Fall back to default
    const dg = (DEFAULT_THRESHOLDS as unknown as Record<string, unknown>)[group];
    if (dg && typeof dg === "object" && key in (dg as Record<string, unknown>)) {
      return (dg as Record<string, number>)[key];
    }
    return 0;
  };

  const setValue = (group: string, key: string, value: number) => {
    setThresholds((prev) => {
      const groupData = (prev as Record<string, Record<string, number>>)[group] || {};
      return {
        ...prev,
        [group]: { ...groupData, [key]: value },
      };
    });
    setHasChanges(true);

    // Validate on change
    const updated = {
      ...thresholds,
      [group]: {
        ...((thresholds as Record<string, Record<string, number>>)[group] || {}),
        [key]: value,
      },
    };
    const result = validateUserThresholds(updated);
    setValidation({ errors: result.errors, warnings: result.warnings });
  };

  const handleResetToDefaults = () => {
    resetThresholds();
    setThresholds({});
    setHasChanges(false);
    setValidation({ errors: [], warnings: [] });
    showToast("已恢复默认阈值");
  };

  const handleResetGroup = (group: string) => {
    setThresholds((prev) => {
      const next = { ...prev };
      delete (next as Record<string, unknown>)[group];
      return next;
    });
    setHasChanges(true);
    showToast("已恢复默认值");
  };

  const handleSave = () => {
    const result = validateUserThresholds(thresholds);
    if (!result.valid) {
      showToast("请修正错误后再保存");
      return;
    }
    saveThresholds(thresholds);
    setHasChanges(false);
    showToast("✅ 阈值已保存");
  };

  return (
    <div>
      <TopNav title="⚙️ 检测灵敏度设置" />
      <div className="screen-container animate-in">
        {/* Info Banner */}
        <div
          style={{
            background: "#eff6ff",
            borderRadius: "10px",
            padding: "14px 16px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#1e40af",
            lineHeight: 1.5,
          }}
        >
          💡 调整检测阈值会影响预警的触发频率。阈值越宽松，预警越少；阈值越严格，预警越多。建议根据自身情况和医生建议设置。
        </div>

        {/* Validation Warnings */}
        {validation.warnings.length > 0 && (
          <div
            style={{
              background: "#fef3c7",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#92400e",
            }}
          >
            {validation.warnings.map((w, i) => (
              <div key={i} style={{ marginBottom: i < validation.warnings.length - 1 ? "6px" : 0 }}>
                ⚠️ {w}
              </div>
            ))}
          </div>
        )}

        {/* Validation Errors */}
        {validation.errors.length > 0 && (
          <div
            style={{
              background: "#fee2e2",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#b91c1c",
            }}
          >
            {validation.errors.map((e, i) => (
              <div key={i} style={{ marginBottom: i < validation.errors.length - 1 ? "6px" : 0 }}>
                ❌ {e}
              </div>
            ))}
          </div>
        )}

        {/* Threshold Groups */}
        {THRESHOLD_FIELDS.map(({ group, groupLabel, fields }) => (
          <div
            key={group}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
              }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#111827", margin: 0 }}>
                {groupLabel}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResetGroup(group)}
                ariaLabel={`恢复${groupLabel}默认值`}
              >
                <span style={{ fontSize: "12px" }}>恢复默认</span>
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {fields.map((field) => (
                <ThresholdSlider
                  key={field.key}
                  field={field}
                  value={getValue(group, field.key)}
                  onChange={(v) => setValue(group, field.key, v)}
                  isDefault={
                    !(
                      (thresholds as Record<string, Record<string, number>>)[group] &&
                      field.key in ((thresholds as Record<string, Record<string, number>>)[group] || {})
                    )
                  }
                />
              ))}
            </div>
          </div>
        ))}

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", marginTop: "20px", marginBottom: "40px" }}>
          <Button
            variant="ghost"
            onClick={handleResetToDefaults}
            ariaLabel="恢复全部默认值"
          >
            恢复全部默认值
          </Button>
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={!hasChanges || !validation.errors.length}
            ariaLabel="保存阈值设置"
          >
            💾 保存设置
          </Button>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "#9ca3af",
            marginTop: "8px",
          }}
        >
          本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案
        </p>
      </div>
    </div>
  );
}

// ── Threshold Slider ─────────────────────────────────────────────

function ThresholdSlider({
  field,
  value,
  onChange,
  isDefault,
}: {
  field: ThresholdFieldMeta;
  value: number;
  onChange: (v: number) => void;
  isDefault: boolean;
}) {
  const pct = ((value - field.min) / (field.max - field.min)) * 100;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "4px",
        }}
      >
        <div>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#374151" }}>
            {field.label}
          </span>
          {isDefault && (
            <span
              style={{
                fontSize: "10px",
                color: "#9ca3af",
                marginLeft: "8px",
                padding: "1px 6px",
                background: "#f3f4f6",
                borderRadius: "4px",
              }}
            >
              默认
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: isDefault ? "#6b7280" : "#3b82f6",
            fontFamily: "var(--font-mono)",
          }}
        >
          {value}
          <span style={{ fontSize: "12px", fontWeight: 400, marginLeft: "2px" }}>
            {field.unit}
          </span>
        </span>
      </div>

      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={`${field.label}: ${value} ${field.unit}`}
        style={{
          width: "100%",
          height: "6px",
          borderRadius: "3px",
          background: `linear-gradient(to right, #3b82f6 ${pct}%, #e5e7eb ${pct}%)`,
          appearance: "none",
          cursor: "pointer",
          margin: 0,
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#9ca3af",
          marginTop: "2px",
        }}
      >
        <span>{field.min}</span>
        <span style={{ fontSize: "11px", color: "#d1d5db" }}>{field.description}</span>
        <span>{field.max}</span>
      </div>
    </div>
  );
}

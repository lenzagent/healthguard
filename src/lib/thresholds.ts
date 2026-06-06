/**
 * HealthGuard User Threshold Configuration
 *
 * Manages user-customizable detection thresholds with localStorage persistence.
 * In MVP mode, thresholds are stored client-side only.
 * Post-MVP: sync to backend with user profile.
 */

import {
  DEFAULT_THRESHOLDS,
  validateThresholds,
  mergeThresholds,
  type ThresholdConfig,
} from "./anomalyDetection";

const STORAGE_KEY = "healthguard-thresholds";

/** Get localStorage reference, works in browser and test (globalThis mock) */
function getStorage(): Storage | null {
  try {
    const ls = globalThis.localStorage;
    if (ls) return ls;
  } catch { /* not available */ }
  return null;
}

// ── Persistence ───────────────────────────────────────────────────

/**
 * Load user thresholds from localStorage.
 * Returns undefined if no custom thresholds are saved.
 */
export function loadThresholds(): Partial<ThresholdConfig> | undefined {
  const storage = getStorage();
  if (!storage) return undefined;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    // Basic structural validation
    if (typeof parsed !== "object" || parsed === null) return undefined;
    return parsed as Partial<ThresholdConfig>;
  } catch {
    // Corrupted data — reset
    storage.removeItem(STORAGE_KEY);
    return undefined;
  }
}

/**
 * Save user thresholds to localStorage.
 * Only saves fields that differ from defaults to keep storage minimal.
 */
export function saveThresholds(thresholds: Partial<ThresholdConfig>): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  } catch {
    console.warn("Failed to save thresholds to localStorage");
  }
}

/**
 * Reset all thresholds to defaults.
 */
export function resetThresholds(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Silently fail
  }
}

// ── Active Thresholds ─────────────────────────────────────────────

/**
 * Get the currently active thresholds (defaults merged with user overrides).
 */
export function getActiveThresholds(): ThresholdConfig {
  const custom = loadThresholds();
  return mergeThresholds(custom);
}

// ── Validation with user-friendly messages ────────────────────────

export interface ThresholdValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate thresholds with additional user-friendly warnings.
 */
export function validateUserThresholds(
  thresholds: Partial<ThresholdConfig>
): ThresholdValidationResult {
  const errors = validateThresholds(thresholds);
  const warnings: string[] = [];

  // Add user-friendly warnings for aggressive thresholds
  if (thresholds.heartRate) {
    const hr = thresholds.heartRate;
    if (hr.max !== undefined && hr.max > 130) {
      warnings.push("心率上限设置较高，可能延迟发现心动过速");
    }
    if (hr.min !== undefined && hr.min < 40) {
      warnings.push("心率下限设置较低，可能遗漏心动过缓预警");
    }
    if (hr.yellowMax !== undefined && hr.yellowMax > 110) {
      warnings.push("黄色预警阈值设置较高，早期预警可能不够及时");
    }
  }

  if (thresholds.spo2) {
    const s = thresholds.spo2;
    if (s.red !== undefined && s.red < 88) {
      warnings.push("血氧危险阈值设置较低（<88%为临床低氧血症标准），请注意安全");
    }
    if (s.normal !== undefined && s.normal < 93) {
      warnings.push("血氧正常值设置较低，可能遗漏早期低血氧预警");
    }
  }

  if (thresholds.trend) {
    const t = thresholds.trend;
    if (t.driftStdDevThreshold !== undefined && t.driftStdDevThreshold > 3.5) {
      warnings.push("趋势漂移阈值设置较高，仅会检测到非常显著的变化趋势");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Metric Labels & Helpers ───────────────────────────────────────

export interface ThresholdFieldMeta {
  key: string;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

/**
 * Metadata for rendering threshold configuration UI fields.
 */
export const THRESHOLD_FIELDS: { group: string; groupLabel: string; fields: ThresholdFieldMeta[] }[] = [
  {
    group: "heartRate",
    groupLabel: "❤️ 心率阈值",
    fields: [
      { key: "min", label: "正常下限", description: "低于此值为异常", unit: "bpm", min: 30, max: 80, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.min },
      { key: "yellowMin", label: "黄色预警下限", description: "低于此值触发黄色预警", unit: "bpm", min: 30, max: 80, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.yellowMin },
      { key: "redMin", label: "红色预警下限", description: "低于此值触发红色预警", unit: "bpm", min: 25, max: 70, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.redMin },
      { key: "yellowMax", label: "黄色预警上限", description: "高于此值触发黄色预警", unit: "bpm", min: 80, max: 130, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.yellowMax },
      { key: "max", label: "正常上限", description: "高于此值为异常", unit: "bpm", min: 80, max: 160, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.max },
      { key: "redMax", label: "红色预警上限", description: "高于此值触发红色预警", unit: "bpm", min: 90, max: 180, step: 1, defaultValue: DEFAULT_THRESHOLDS.heartRate.redMax },
    ],
  },
  {
    group: "spo2",
    groupLabel: "🫁 血氧阈值",
    fields: [
      { key: "normal", label: "正常值下限", description: "低于此值为异常", unit: "%", min: 88, max: 99, step: 1, defaultValue: DEFAULT_THRESHOLDS.spo2.normal },
      { key: "yellow", label: "黄色预警阈值", description: "低于此值触发黄色预警", unit: "%", min: 85, max: 97, step: 1, defaultValue: DEFAULT_THRESHOLDS.spo2.yellow },
      { key: "red", label: "红色预警阈值", description: "低于此值触发红色预警", unit: "%", min: 80, max: 94, step: 1, defaultValue: DEFAULT_THRESHOLDS.spo2.red },
    ],
  },
  {
    group: "trend",
    groupLabel: "📈 趋势检测",
    fields: [
      { key: "windowDays", label: "检测窗口", description: "分析最近N天的趋势", unit: "天", min: 3, max: 30, step: 1, defaultValue: DEFAULT_THRESHOLDS.trend.windowDays },
      { key: "driftStdDevThreshold", label: "漂移敏感度", description: "偏离多少个标准差时触发预警（越小越敏感）", unit: "σ", min: 1.0, max: 5.0, step: 0.1, defaultValue: DEFAULT_THRESHOLDS.trend.driftStdDevThreshold },
      { key: "minDataPoints", label: "最少数据点", description: "至少需要多少个数据点才进行趋势分析", unit: "个", min: 2, max: 10, step: 1, defaultValue: DEFAULT_THRESHOLDS.trend.minDataPoints },
    ],
  },
  {
    group: "sleepApnea",
    groupLabel: "😴 睡眠呼吸",
    fields: [
      { key: "spo2DropThreshold", label: "血氧下降阈值", description: "夜间血氧下降超过此值视为异常", unit: "%", min: 2, max: 10, step: 1, defaultValue: DEFAULT_THRESHOLDS.sleepApnea.spo2DropThreshold },
      { key: "minSpo2DuringSleep", label: "夜间最低血氧", description: "睡眠期间血氧低于此值触发预警", unit: "%", min: 82, max: 96, step: 1, defaultValue: DEFAULT_THRESHOLDS.sleepApnea.minSpo2DuringSleep },
    ],
  },
];

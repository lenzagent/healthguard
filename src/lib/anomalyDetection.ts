/**
 * HealthGuard Anomaly Detection Engine
 *
 * Lightweight, local-only anomaly detection for real-time health monitoring.
 * Designed to run in-browser with <5 minute detection latency.
 *
 * Detection types:
 * - Threshold-based: heart rate, SpO2 against configured ranges
 * - Sliding window trend: multi-day drift detection
 * - Sleep apnea risk: SpO2 + HRV pattern scoring
 *
 * All detection is local — no health data leaves the device for anomaly detection.
 */

// ── Types ──────────────────────────────────────────────────────────

export type AnomalySeverity = "green" | "yellow" | "red";

export interface AnomalyResult {
  /** Unique identifier for this anomaly instance */
  id: string;
  /** Detection type category */
  type: "heart-rate-high" | "heart-rate-low" | "heart-rate-irregular"
    | "spo2-low" | "spo2-crisis"
    | "trend-drift-up" | "trend-drift-down"
    | "sleep-apnea-risk";
  /** Severity level */
  severity: AnomalySeverity;
  /** Human-readable title */
  title: string;
  /** Detailed description with medical disclaimer */
  description: string;
  /** The metric that triggered this anomaly */
  metric: string;
  /** Current value that triggered detection */
  currentValue: number;
  /** Reference range or baseline */
  referenceRange: string;
  /** Timestamp of detection (ISO 8601) */
  detectedAt: string;
  /** Source of data (device name or "trend-detection") */
  source: string;
  /** Whether this anomaly is currently active */
  active: boolean;
  /** Medical advice for red-level alerts */
  medicalAdvice?: string;
}

export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601
  value: number;
}

export interface DetectionInput {
  /** Current heart rate in bpm */
  heartRate?: number;
  /** Heart rate variability in ms (SDNN) */
  hrv?: number;
  /** Blood oxygen saturation % */
  spo2?: number;
  /** Systolic blood pressure */
  bloodPressureSystolic?: number;
  /** Diastolic blood pressure */
  bloodPressureDiastolic?: number;
  /** Whether current time is during typical sleep hours */
  isSleepHours?: boolean;
  /** Recent historical data for trend analysis */
  recentHistory?: {
    heartRate: TimeSeriesPoint[];
    spo2: TimeSeriesPoint[];
  };
  /** Device/source name */
  source?: string;
}

export interface ThresholdConfig {
  heartRate: {
    min: number;    // default 50
    max: number;    // default 100
    yellowMin: number; // default 55
    yellowMax: number; // default 95
    redMin: number;    // default 45
    redMax: number;    // default 120
  };
  spo2: {
    normal: number;   // default 95
    yellow: number;   // default 92
    red: number;      // default 90
  };
  trend: {
    windowDays: number;        // sliding window size, default 7
    driftStdDevThreshold: number; // number of std devs for drift, default 2.0
    minDataPoints: number;     // minimum points needed for trend analysis, default 3
  };
  sleepApnea: {
    spo2DropThreshold: number;  // SpO2 drop % for apnea flag, default 4
    minSpo2DuringSleep: number; // minimum acceptable SpO2 during sleep, default 90
  };
}

// ── Default Thresholds ────────────────────────────────────────────

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  heartRate: {
    min: 50,
    max: 100,
    yellowMin: 55,
    yellowMax: 95,
    redMin: 45,
    redMax: 120,
  },
  spo2: {
    normal: 95,
    yellow: 92,
    red: 90,
  },
  trend: {
    windowDays: 7,
    driftStdDevThreshold: 2.0,
    minDataPoints: 3,
  },
  sleepApnea: {
    spo2DropThreshold: 4,
    minSpo2DuringSleep: 90,
  },
};

// ── Utility ───────────────────────────────────────────────────────

let anomalyCounter = 0;
function generateAnomalyId(): string {
  anomalyCounter += 1;
  return `anomaly-${Date.now()}-${anomalyCounter}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function stdDev(values: number[], avg?: number): number {
  if (values.length < 2) return 0;
  const m = avg ?? mean(values);
  const squaredDiffs = values.map((v) => (v - m) ** 2);
  return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
}

/**
 * Simple linear regression slope over time-series data.
 * Returns slope per data point (positive = rising trend, negative = falling).
 */
function computeSlope(points: TimeSeriesPoint[]): number {
  if (points.length < 2) return 0;
  const n = points.length;
  const indices = points.map((_, i) => i);
  const values = points.map((p) => p.value);
  const xMean = mean(indices);
  const yMean = mean(values);
  const numerator = indices.reduce((sum, x, i) => sum + (x - xMean) * (values[i] - yMean), 0);
  const denominator = indices.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

// ── Detection Functions ───────────────────────────────────────────

/**
 * Detect heart rate anomalies: high, low, and irregular patterns.
 */
function detectHeartRateAnomalies(
  heartRate: number,
  hrv: number | undefined,
  thresholds: ThresholdConfig,
  source: string
): AnomalyResult[] {
  const results: AnomalyResult[] = [];
  const hr = thresholds.heartRate;

  // High heart rate
  if (heartRate > hr.redMax) {
    results.push({
      id: generateAnomalyId(),
      type: "heart-rate-high",
      severity: "red",
      title: "🔴 心率异常偏高",
      description: `当前静息心率 ${heartRate} bpm，远超正常范围（${hr.min}-${hr.max} bpm）。持续心动过速可能增加心脏负担。`,
      metric: "heart-rate",
      currentValue: heartRate,
      referenceRange: `${hr.min}-${hr.max} bpm`,
      detectedAt: nowISO(),
      source,
      active: true,
      medicalAdvice: "建议立即休息并保持平静。如持续超过120 bpm或伴有胸闷、气短等症状，请及时就医。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    });
  } else if (heartRate > hr.yellowMax) {
    results.push({
      id: generateAnomalyId(),
      type: "heart-rate-high",
      severity: "yellow",
      title: "🟡 心率偏高",
      description: `当前静息心率 ${heartRate} bpm，略高于正常范围（${hr.min}-${hr.max} bpm）。可能与疲劳、压力或咖啡因摄入有关。`,
      metric: "heart-rate",
      currentValue: heartRate,
      referenceRange: `${hr.min}-${hr.max} bpm`,
      detectedAt: nowISO(),
      source,
      active: true,
    });
  }

  // Low heart rate
  if (heartRate < hr.redMin) {
    results.push({
      id: generateAnomalyId(),
      type: "heart-rate-low",
      severity: "red",
      title: "🔴 心率异常偏低",
      description: `当前静息心率 ${heartRate} bpm，显著低于正常范围（${hr.min}-${hr.max} bpm）。心动过缓可能影响全身供血。`,
      metric: "heart-rate",
      currentValue: heartRate,
      referenceRange: `${hr.min}-${hr.max} bpm`,
      detectedAt: nowISO(),
      source,
      active: true,
      medicalAdvice: "如伴有头晕、乏力、眼前发黑等症状，请立即就医。运动员静息心率可低至40-60 bpm，如无不适可能属正常。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    });
  } else if (heartRate < hr.yellowMin) {
    results.push({
      id: generateAnomalyId(),
      type: "heart-rate-low",
      severity: "yellow",
      title: "🟡 心率偏低",
      description: `当前静息心率 ${heartRate} bpm，略低于正常范围（${hr.min}-${hr.max} bpm）。如为经常锻炼者，可能属正常现象。`,
      metric: "heart-rate",
      currentValue: heartRate,
      referenceRange: `${hr.min}-${hr.max} bpm`,
      detectedAt: nowISO(),
      source,
      active: true,
    });
  }

  // Irregular heart rate (high HRV may indicate arrhythmia risk)
  // SDNN > 100ms while resting can be normal for athletes, but combined with
  // abnormal rate it may indicate irregular rhythm
  if (hrv !== undefined && hrv > 120 && (heartRate > hr.yellowMax || heartRate < hr.yellowMin)) {
    results.push({
      id: generateAnomalyId(),
      type: "heart-rate-irregular",
      severity: "yellow",
      title: "🟡 心率变异性偏高",
      description: `心率变异性（HRV）${hrv.toFixed(0)} ms，结合心率${heartRate} bpm，可能存在心律不齐。建议持续观察。`,
      metric: "heart-rate",
      currentValue: hrv,
      referenceRange: "SDNN 20-100 ms（静息）",
      detectedAt: nowISO(),
      source,
      active: true,
    });
  }

  return results;
}

/**
 * Detect blood oxygen anomalies.
 */
function detectSpO2Anomalies(
  spo2: number,
  isSleepHours: boolean | undefined,
  thresholds: ThresholdConfig,
  source: string
): AnomalyResult[] {
  const results: AnomalyResult[] = [];
  const s = thresholds.spo2;

  if (spo2 < s.red) {
    results.push({
      id: generateAnomalyId(),
      type: "spo2-crisis",
      severity: "red",
      title: "🔴 血氧严重偏低",
      description: `当前血氧饱和度 ${spo2}%，低于危险阈值 ${s.red}%。持续低血氧可能损伤重要器官。${isSleepHours ? "睡眠中低血氧需警惕睡眠呼吸暂停。" : ""}`,
      metric: "spo2",
      currentValue: spo2,
      referenceRange: `≥${s.normal}%`,
      detectedAt: nowISO(),
      source,
      active: true,
      medicalAdvice: "请立即停止活动并保持深呼吸。如血氧持续低于90%或伴有呼吸困难、意识模糊，请立即拨打急救电话。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。",
    });
  } else if (spo2 < s.yellow) {
    results.push({
      id: generateAnomalyId(),
      type: "spo2-low",
      severity: "yellow",
      title: "🟡 血氧偏低",
      description: `当前血氧饱和度 ${spo2}%，低于正常范围（≥${s.normal}%）。建议休息并观察。${isSleepHours ? "夜间低血氧可能与睡眠姿势或睡眠呼吸问题有关。" : ""}`,
      metric: "spo2",
      currentValue: spo2,
      referenceRange: `≥${s.normal}%`,
      detectedAt: nowISO(),
      source,
      active: true,
    });
  }

  return results;
}

/**
 * Detect sleep apnea risk indicators.
 *
 * Risk factors analyzed:
 * - SpO2 drops during sleep hours
 * - Patterns consistent with apnea events
 *
 * Note: This is a screening tool, not a diagnostic device.
 * A formal sleep study (polysomnography) is required for diagnosis.
 */
function detectSleepApneaRisk(
  spo2: number,
  recentSpo2History: TimeSeriesPoint[] | undefined,
  isSleepHours: boolean | undefined,
  thresholds: ThresholdConfig,
  source: string
): AnomalyResult[] {
  const results: AnomalyResult[] = [];
  if (!isSleepHours) return results;

  const sa = thresholds.sleepApnea;

  // Check if current SpO2 is below sleep minimum
  if (spo2 < sa.minSpo2DuringSleep) {
    const severity: AnomalySeverity = spo2 < sa.minSpo2DuringSleep - 3 ? "red" : "yellow";
    results.push({
      id: generateAnomalyId(),
      type: "sleep-apnea-risk",
      severity,
      title: severity === "red" ? "🔴 睡眠血氧过低" : "🟡 夜间血氧偏低",
      description: `睡眠期间血氧降至 ${spo2}%，低于安全阈值 ${sa.minSpo2DuringSleep}%。这可能提示睡眠呼吸障碍风险。`,
      metric: "spo2",
      currentValue: spo2,
      referenceRange: `睡眠期间 ≥${sa.minSpo2DuringSleep}%`,
      detectedAt: nowISO(),
      source,
      active: true,
      medicalAdvice: severity === "red"
        ? "建议就医进行睡眠呼吸监测（多导睡眠图）。如伴有白天嗜睡、晨起头痛、打鼾等症状，请尽早就诊呼吸科。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。"
        : undefined,
    });
  }

  // Check for SpO2 drops in recent history during sleep
  if (recentSpo2History && recentSpo2History.length >= 3) {
    const values = recentSpo2History.map((p) => p.value);
    const avg = mean(values);
    const drops = values.filter((v) => v < avg - sa.spo2DropThreshold);
    const dropRatio = drops.length / values.length;

    if (dropRatio >= 0.3) {
      results.push({
        id: generateAnomalyId(),
        type: "sleep-apnea-risk",
        severity: "yellow",
        title: "🟡 睡眠呼吸暂停风险",
        description: `近${recentSpo2History.length}次夜间血氧测量中，${drops.length}次出现显著下降（降幅>${sa.spo2DropThreshold}%）。可能提示睡眠呼吸暂停，建议关注。`,
        metric: "spo2",
        currentValue: spo2,
        referenceRange: `夜间血氧稳定，下降不超过${sa.spo2DropThreshold}%`,
        detectedAt: nowISO(),
        source,
        active: true,
      });
    }
  }

  return results;
}

/**
 * Detect multi-day trend drift using sliding window analysis.
 *
 * Compares the most recent window against the baseline to detect
 * statistically significant upward or downward trends.
 */
function detectTrendDrift(
  recentHistory: DetectionInput["recentHistory"],
  thresholds: ThresholdConfig,
  source: string
): AnomalyResult[] {
  const results: AnomalyResult[] = [];
  if (!recentHistory) return results;

  const t = thresholds.trend;

  // Analyze heart rate trend
  if (recentHistory.heartRate.length >= t.minDataPoints) {
    const hrData = recentHistory.heartRate;
    const values = hrData.map((p) => p.value);
    const avg = mean(values);
    const sd = stdDev(values, avg);
    const slope = computeSlope(hrData);

    // Significant upward drift
    if (slope > 0 && sd > 0) {
      const driftStrength = (slope * hrData.length) / sd;
      if (driftStrength > t.driftStdDevThreshold) {
        const severity: AnomalySeverity = driftStrength > t.driftStdDevThreshold * 1.5 ? "red" : "yellow";
        results.push({
          id: generateAnomalyId(),
          type: "trend-drift-up",
          severity,
          title: severity === "red" ? "🔴 心率持续上升趋势" : "🟡 心率上升趋势",
          description: `近${hrData.length}天心率呈持续上升趋势（日均升高${slope.toFixed(1)} bpm），当前均值${avg.toFixed(0)} bpm。偏离正常波动范围${driftStrength.toFixed(1)}个标准差。`,
          metric: "heart-rate",
          currentValue: avg,
          referenceRange: `波动不超过${t.driftStdDevThreshold}个标准差`,
          detectedAt: nowISO(),
          source: source || "趋势检测",
          active: true,
          medicalAdvice: severity === "red"
            ? "持续心率上升可能与压力、甲状腺功能亢进、贫血等因素相关。建议记录伴随症状并咨询医生。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。"
            : undefined,
        });
      }
    }

    // Significant downward drift
    if (slope < 0 && sd > 0) {
      const driftStrength = Math.abs((slope * hrData.length) / sd);
      if (driftStrength > t.driftStdDevThreshold) {
        results.push({
          id: generateAnomalyId(),
          type: "trend-drift-down",
          severity: "yellow",
          title: "🟡 心率下降趋势",
          description: `近${hrData.length}天心率呈下降趋势（日均降低${Math.abs(slope).toFixed(1)} bpm），当前均值${avg.toFixed(0)} bpm。如伴随疲劳需关注。`,
          metric: "heart-rate",
          currentValue: avg,
          referenceRange: `波动不超过${t.driftStdDevThreshold}个标准差`,
          detectedAt: nowISO(),
          source: source || "趋势检测",
          active: true,
        });
      }
    }
  }

  // Analyze SpO2 trend
  if (recentHistory.spo2.length >= t.minDataPoints) {
    const spo2Data = recentHistory.spo2;
    const values = spo2Data.map((p) => p.value);
    const avg = mean(values);
    const sd = stdDev(values, avg);
    const slope = computeSlope(spo2Data);

    if (slope < 0 && sd > 0) {
      const driftStrength = Math.abs((slope * spo2Data.length) / sd);
      if (driftStrength > t.driftStdDevThreshold) {
        const severity: AnomalySeverity = avg < 93 ? "red" : (driftStrength > t.driftStdDevThreshold * 1.5 ? "red" : "yellow");
        results.push({
          id: generateAnomalyId(),
          type: "trend-drift-down",
          severity,
          title: severity === "red" ? "🔴 血氧持续下降趋势" : "🟡 血氧下降趋势",
          description: `近${spo2Data.length}天血氧呈下降趋势（日均降低${Math.abs(slope).toFixed(2)}%），当前均值${avg.toFixed(1)}%。`,
          metric: "spo2",
          currentValue: avg,
          referenceRange: `≥${thresholds.spo2.normal}%，趋势稳定`,
          detectedAt: nowISO(),
          source: source || "趋势检测",
          active: true,
          medicalAdvice: severity === "red"
            ? "血氧持续下降需引起重视，可能与呼吸系统或循环系统问题相关。建议就医检查。本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案。"
            : undefined,
        });
      }
    }
  }

  return results;
}

// ── Main Detection Pipeline ───────────────────────────────────────

/**
 * Run the complete anomaly detection pipeline on a single data snapshot.
 *
 * This is the main entry point. Call this whenever new health data arrives
 * from a wearable device sync or manual measurement.
 *
 * @param input - Current health metrics snapshot with optional history
 * @param customThresholds - User-configured thresholds (merged with defaults)
 * @returns Array of detected anomalies
 */
export function detectAnomalies(
  input: DetectionInput,
  customThresholds?: Partial<ThresholdConfig>
): AnomalyResult[] {
  const thresholds = mergeThresholds(customThresholds);
  const source = input.source || "HealthGuard";
  const results: AnomalyResult[] = [];

  // 1. Heart rate anomalies
  if (input.heartRate !== undefined) {
    results.push(
      ...detectHeartRateAnomalies(input.heartRate, input.hrv, thresholds, source)
    );
  }

  // 2. SpO2 anomalies
  if (input.spo2 !== undefined) {
    results.push(
      ...detectSpO2Anomalies(input.spo2, input.isSleepHours, thresholds, source)
    );
  }

  // 3. Sleep apnea risk
  if (input.spo2 !== undefined) {
    results.push(
      ...detectSleepApneaRisk(
        input.spo2,
        input.recentHistory?.spo2,
        input.isSleepHours,
        thresholds,
        source
      )
    );
  }

  // 4. Trend drift detection
  if (input.recentHistory) {
    results.push(
      ...detectTrendDrift(input.recentHistory, thresholds, source)
    );
  }

  return results;
}

/**
 * Merge user-customized thresholds with defaults.
 * User overrides take precedence for any field they specify.
 */
export function mergeThresholds(
  custom?: Partial<ThresholdConfig>
): ThresholdConfig {
  if (!custom) return { ...DEFAULT_THRESHOLDS };

  return {
    heartRate: {
      ...DEFAULT_THRESHOLDS.heartRate,
      ...custom.heartRate,
    },
    spo2: {
      ...DEFAULT_THRESHOLDS.spo2,
      ...custom.spo2,
    },
    trend: {
      ...DEFAULT_THRESHOLDS.trend,
      ...custom.trend,
    },
    sleepApnea: {
      ...DEFAULT_THRESHOLDS.sleepApnea,
      ...custom.sleepApnea,
    },
  };
}

/**
 * Validate user-provided threshold values.
 * Returns an array of validation error messages (empty if valid).
 */
export function validateThresholds(
  thresholds: Partial<ThresholdConfig>
): string[] {
  const errors: string[] = [];

  if (thresholds.heartRate) {
    const hr = thresholds.heartRate;
    if (hr.min !== undefined && hr.min < 30) errors.push("心率下限不能低于30 bpm");
    if (hr.max !== undefined && hr.max > 220) errors.push("心率上限不能超过220 bpm");
    if (hr.redMin !== undefined && hr.redMin < 25) errors.push("心率红色下限不能低于25 bpm");
    if (hr.redMax !== undefined && hr.redMax > 250) errors.push("心率红色上限不能超过250 bpm");
    if (hr.min !== undefined && hr.max !== undefined && hr.min >= hr.max) {
      errors.push("心率下限必须小于上限");
    }
  }

  if (thresholds.spo2) {
    const s = thresholds.spo2;
    if (s.normal !== undefined && (s.normal < 80 || s.normal > 100)) {
      errors.push("血氧正常值必须在80-100%之间");
    }
    if (s.red !== undefined && (s.red < 70 || s.red > 100)) {
      errors.push("血氧危险阈值必须在70-100%之间");
    }
  }

  if (thresholds.trend) {
    const t = thresholds.trend;
    if (t.windowDays !== undefined && (t.windowDays < 3 || t.windowDays > 30)) {
      errors.push("趋势窗口必须在3-30天之间");
    }
    if (t.driftStdDevThreshold !== undefined && (t.driftStdDevThreshold < 1 || t.driftStdDevThreshold > 5)) {
      errors.push("漂移阈值必须在1-5个标准差之间");
    }
  }

  return errors;
}

/**
 * Check if a set of anomalies represents an escalating situation.
 * Returns true if there are multiple red alerts or a mix of red+yellow across metrics.
 */
export function isEscalating(anomalies: AnomalyResult[]): boolean {
  const redCount = anomalies.filter((a) => a.severity === "red").length;
  const uniqueMetrics = new Set(anomalies.map((a) => a.metric)).size;
  return redCount >= 2 || (redCount >= 1 && uniqueMetrics >= 2 && anomalies.length >= 3);
}

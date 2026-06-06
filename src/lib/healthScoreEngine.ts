/**
 * HealthGuard Composite Health Score Engine
 *
 * Computes a 0–100 multi-dimensional weighted health score from daily
 * wearable/health data.  Designed for the M2 feature set.
 *
 * Scoring dimensions and weights (CEO-approved):
 *   Sleep quality   — 25 %
 *   Heart rate      — 20 %
 *   Activity level  — 20 %
 *   Weight mgmt     — 15 %
 *   Recovery state  — 10 %
 *   Blood metrics   — 10 %
 *
 * Minimum 3 days of data required for a first assessment.
 */

import type {
  DailyHealthData,
  HealthScoreResult,
  DimensionScoreResult,
  ScoreStatus,
  TrendDirection,
} from "@/lib/types";

// ── Constants ──────────────────────────────────────────────

const MIN_DATA_DAYS = 3;

const DIMENSION_WEIGHTS: Record<string, number> = {
  sleep: 0.25,
  heartRate: 0.2,
  activity: 0.2,
  weight: 0.15,
  recovery: 0.1,
  bloodMetrics: 0.1,
};

const DIMENSION_META: Record<
  string,
  { nameZh: string; icon: string }
> = {
  sleep: { nameZh: "睡眠质量", icon: "😴" },
  heartRate: { nameZh: "心率健康", icon: "❤️" },
  activity: { nameZh: "活动水平", icon: "🚶" },
  weight: { nameZh: "体重管理", icon: "⚖️" },
  recovery: { nameZh: "恢复状态", icon: "🔄" },
  bloodMetrics: { nameZh: "血液指标", icon: "🩸" },
};

// ── Helpers ────────────────────────────────────────────────

/** Clamp a value into [min, max] */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Map a value to a 0–100 score using linear interpolation between thresholds */
function linearScore(
  value: number,
  thresholds: [number, number][],
  higherIsBetter: boolean = true
): number {
  // thresholds: array of [value, score] pairs sorted ascending by value
  const sorted = [...thresholds].sort((a, b) => a[0] - b[0]);

  // Below lowest
  if (value <= sorted[0][0]) {
    return higherIsBetter ? sorted[0][1] : sorted[sorted.length - 1][1];
  }
  // Above highest
  if (value >= sorted[sorted.length - 1][0]) {
    return higherIsBetter
      ? sorted[sorted.length - 1][1]
      : sorted[0][1];
  }

  // Find the segment and interpolate
  for (let i = 0; i < sorted.length - 1; i++) {
    const [v1, s1] = sorted[i];
    const [v2, s2] = sorted[i + 1];
    if (value >= v1 && value <= v2) {
      const t = (value - v1) / (v2 - v1);
      return Math.round(s1 + t * (s2 - s1));
    }
  }

  return 50; // fallback
}

/** Convert a 0–100 score into a status label */
function scoreStatus(score: number): ScoreStatus {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

/** Determine trend direction from delta */
function trendDirection(delta: number): TrendDirection {
  if (delta > 2) return "up";
  if (delta < -2) return "down";
  return "stable";
}

/** Average of an array */
function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// ── Dimension Scorers ──────────────────────────────────────

function scoreSleep(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  // Score each day then average
  const dailyScores = recent.map((d) => {
    // Duration: ideal 7–9 h
    const durScore = linearScore(
      d.sleep.durationHours,
      [
        [0, 0],
        [4, 20],
        [5, 40],
        [6, 70],
        [7, 100],
        [9, 100],
        [10, 60],
        [12, 20],
      ]
    );

    // Deep sleep: ideal ≥ 90 min
    const deepScore = linearScore(
      d.sleep.deepSleepMinutes,
      [
        [0, 0],
        [30, 25],
        [45, 50],
        [60, 75],
        [90, 100],
        [120, 100],
      ]
    );

    // Quality: use directly (0–100)
    const qual = clamp(d.sleep.quality, 0, 100);

    return durScore * 0.4 + deepScore * 0.3 + qual * 0.3;
  });

  const rawScore = Math.round(avg(dailyScores));

  // Flags
  const last = recent[recent.length - 1];
  if (last) {
    if (last.sleep.durationHours < 6) {
      flags.push(`睡眠时长不足 (${last.sleep.durationHours.toFixed(1)}h)`);
    }
    if (last.sleep.deepSleepMinutes < 60) {
      flags.push(`深睡时长偏低 (${last.sleep.deepSleepMinutes}min)`);
    }
    if (last.sleep.quality < 50) {
      flags.push(`睡眠质量差 (${last.sleep.quality}/100)`);
    }
  }

  // Trend
  const prev = data.slice(-14, -7);
  const prevAvg = prev.length > 0 ? avg(prev.map((d) => scoreSleepDay(d))) : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

function scoreSleepDay(d: DailyHealthData): number {
  const durScore = linearScore(d.sleep.durationHours, [
    [0, 0], [4, 20], [5, 40], [6, 70], [7, 100], [9, 100], [10, 60], [12, 20],
  ]);
  const deepScore = linearScore(d.sleep.deepSleepMinutes, [
    [0, 0], [30, 25], [45, 50], [60, 75], [90, 100], [120, 100],
  ]);
  const qual = clamp(d.sleep.quality, 0, 100);
  return durScore * 0.4 + deepScore * 0.3 + qual * 0.3;
}

// ───────────────────────────────────────────────────────────

function scoreHeartRate(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  const dailyScores = recent.map((d) => {
    // Resting HR: ideal 60–70 bpm
    return linearScore(
      d.heartRate.restingBpm,
      [
        [35, 20],
        [45, 50],
        [55, 90],
        [60, 100],
        [70, 100],
        [80, 75],
        [90, 40],
        [100, 20],
        [110, 5],
      ]
    );
  });

  const rawScore = Math.round(avg(dailyScores));

  const last = recent[recent.length - 1];
  if (last) {
    if (last.heartRate.restingBpm > 90) {
      flags.push(`静息心率偏高 (${last.heartRate.restingBpm} bpm)`);
    } else if (last.heartRate.restingBpm > 80) {
      flags.push(`静息心率略高 (${last.heartRate.restingBpm} bpm)`);
    }
    if (last.heartRate.restingBpm < 45) {
      flags.push(`静息心率偏低 (${last.heartRate.restingBpm} bpm)`);
    }
  }

  // Trend
  const prev = data.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? avg(
          prev.map(
            (d) =>
              linearScore(d.heartRate.restingBpm, [
                [35, 20], [45, 50], [55, 90], [60, 100], [70, 100],
                [80, 75], [90, 40], [100, 20], [110, 5],
              ])
          )
        )
      : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

// ───────────────────────────────────────────────────────────

function scoreActivity(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  const dailyScores = recent.map((d) => {
    const stepsScore = linearScore(d.activity.steps, [
      [0, 0], [2500, 25], [5000, 50], [7500, 75], [10000, 100], [15000, 100],
    ]);
    const activeMinScore = linearScore(d.activity.activeMinutes, [
      [0, 10], [10, 30], [20, 60], [30, 90], [45, 100], [60, 100],
    ]);
    const calScore = linearScore(d.activity.caloriesBurned, [
      [0, 10], [100, 30], [200, 60], [300, 85], [400, 100], [600, 100],
    ]);
    return stepsScore * 0.4 + activeMinScore * 0.3 + calScore * 0.3;
  });

  const rawScore = Math.round(avg(dailyScores));

  const last = recent[recent.length - 1];
  if (last) {
    if (last.activity.steps < 5000) {
      flags.push(`步数不足 (${last.activity.steps.toLocaleString()} 步)`);
    }
    if (last.activity.activeMinutes < 20) {
      flags.push(`活动时间偏少 (${last.activity.activeMinutes} min)`);
    }
  }

  // Trend
  const prev = data.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? avg(prev.map((d) => scoreActivityDay(d)))
      : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

function scoreActivityDay(d: DailyHealthData): number {
  const stepsScore = linearScore(d.activity.steps, [
    [0, 0], [2500, 25], [5000, 50], [7500, 75], [10000, 100], [15000, 100],
  ]);
  const activeMinScore = linearScore(d.activity.activeMinutes, [
    [0, 10], [10, 30], [20, 60], [30, 90], [45, 100], [60, 100],
  ]);
  const calScore = linearScore(d.activity.caloriesBurned, [
    [0, 10], [100, 30], [200, 60], [300, 85], [400, 100], [600, 100],
  ]);
  return stepsScore * 0.4 + activeMinScore * 0.3 + calScore * 0.3;
}

// ───────────────────────────────────────────────────────────

function scoreWeight(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  const dailyScores = recent.map((d) => {
    // BMI score — ideal 18.5–24
    return linearScore(
      d.weight.bmi,
      [
        [14, 5],
        [16, 25],
        [17, 45],
        [18.5, 90],
        [20, 100],
        [24, 100],
        [27, 65],
        [30, 35],
        [35, 10],
      ]
    );
  });

  const rawScore = Math.round(avg(dailyScores));

  const last = recent[recent.length - 1];
  if (last) {
    if (last.weight.bmi >= 28) {
      flags.push(`BMI偏高 (${last.weight.bmi.toFixed(1)})`);
    } else if (last.weight.bmi >= 24) {
      flags.push(`BMI略高 (${last.weight.bmi.toFixed(1)})`);
    } else if (last.weight.bmi < 17) {
      flags.push(`BMI偏低 (${last.weight.bmi.toFixed(1)})`);
    }
  }

  // Trend — check if weight is moving in healthy direction
  const prevWeek = data.slice(-14, -7);
  if (prevWeek.length >= 3) {
    const recentAvgKg = avg(recent.map((d) => d.weight.kg));
    const prevAvgKg = avg(prevWeek.map((d) => d.weight.kg));
    const kgChange = recentAvgKg - prevAvgKg;
    if (last && last.weight.bmi >= 24 && kgChange < -0.3) {
      flags.push("体重呈下降趋势，继续保持");
    } else if (last && last.weight.bmi >= 24 && kgChange > 0.3) {
      flags.push("体重呈上升趋势，建议关注饮食");
    }
  }

  const prev = data.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? avg(
          prev.map((d) =>
            linearScore(d.weight.bmi, [
              [14, 5], [16, 25], [17, 45], [18.5, 90], [20, 100],
              [24, 100], [27, 65], [30, 35], [35, 10],
            ])
          )
        )
      : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

// ───────────────────────────────────────────────────────────

function scoreRecovery(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  const dailyScores = recent.map((d) => {
    // HRV: higher is generally better. For age ~30, 45–65 ms is good
    return linearScore(
      d.recovery.hrvMs,
      [
        [10, 10],
        [20, 30],
        [30, 55],
        [40, 80],
        [50, 95],
        [60, 100],
        [80, 100],
      ]
    );
  });

  const rawScore = Math.round(avg(dailyScores));

  const last = recent[recent.length - 1];
  if (last) {
    if (last.recovery.hrvMs < 30) {
      flags.push(`HRV偏低 (${last.recovery.hrvMs} ms)，恢复状态不佳`);
    } else if (last.recovery.hrvMs < 40) {
      flags.push(`HRV略低 (${last.recovery.hrvMs} ms)`);
    }
  }

  const prev = data.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? avg(
          prev.map((d) =>
            linearScore(d.recovery.hrvMs, [
              [10, 10], [20, 30], [30, 55], [40, 80], [50, 95], [60, 100], [80, 100],
            ])
          )
        )
      : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

// ───────────────────────────────────────────────────────────

function scoreBloodMetrics(data: DailyHealthData[]): {
  rawScore: number;
  flags: string[];
  trendDelta: number;
} {
  const recent = data.slice(-7);
  const flags: string[] = [];

  const dailyScores = recent.map((d) => {
    const spo2Score = linearScore(d.bloodMetrics.spo2, [
      [85, 5], [90, 25], [93, 60], [95, 85], [97, 100], [100, 100],
    ]);
    const sysScore = linearScore(d.bloodMetrics.systolic, [
      [80, 40], [100, 90], [120, 100], [130, 75], [140, 40], [160, 10],
    ]);
    const diaScore = linearScore(d.bloodMetrics.diastolic, [
      [50, 40], [70, 90], [80, 100], [85, 75], [90, 40], [100, 10],
    ]);
    return spo2Score * 0.4 + sysScore * 0.3 + diaScore * 0.3;
  });

  const rawScore = Math.round(avg(dailyScores));

  const last = recent[recent.length - 1];
  if (last) {
    if (last.bloodMetrics.spo2 < 95) {
      flags.push(`血氧偏低 (${last.bloodMetrics.spo2}%)`);
    }
    if (last.bloodMetrics.systolic > 130) {
      flags.push(`收缩压偏高 (${last.bloodMetrics.systolic} mmHg)`);
    }
    if (last.bloodMetrics.diastolic > 85) {
      flags.push(`舒张压偏高 (${last.bloodMetrics.diastolic} mmHg)`);
    }
  }

  const prev = data.slice(-14, -7);
  const prevAvg =
    prev.length > 0
      ? avg(prev.map((d) => scoreBloodDay(d)))
      : null;
  const recentAvg = avg(dailyScores);
  const trendDelta =
    prevAvg !== null ? Math.round((recentAvg - prevAvg) * 10) / 10 : 0;

  return { rawScore, flags, trendDelta };
}

function scoreBloodDay(d: DailyHealthData): number {
  const spo2Score = linearScore(d.bloodMetrics.spo2, [
    [85, 5], [90, 25], [93, 60], [95, 85], [97, 100], [100, 100],
  ]);
  const sysScore = linearScore(d.bloodMetrics.systolic, [
    [80, 40], [100, 90], [120, 100], [130, 75], [140, 40], [160, 10],
  ]);
  const diaScore = linearScore(d.bloodMetrics.diastolic, [
    [50, 40], [70, 90], [80, 100], [85, 75], [90, 40], [100, 10],
  ]);
  return spo2Score * 0.4 + sysScore * 0.3 + diaScore * 0.3;
}

// ── Main Engine ────────────────────────────────────────────

const SCORERS: Record<
  string,
  (data: DailyHealthData[]) => { rawScore: number; flags: string[]; trendDelta: number }
> = {
  sleep: scoreSleep,
  heartRate: scoreHeartRate,
  activity: scoreActivity,
  weight: scoreWeight,
  recovery: scoreRecovery,
  bloodMetrics: scoreBloodMetrics,
};

/**
 * Compute the composite health score from daily health data.
 *
 * Requires at least 3 days of data for a valid assessment.
 * Data should be sorted chronologically (oldest first).
 *
 * Returns a HealthScoreResult with the overall 0-100 score,
 * per-dimension breakdowns, trends, and anomaly flags.
 */
export function computeHealthScore(
  data: DailyHealthData[]
): HealthScoreResult {
  const now = new Date().toISOString().split("T")[0];

  // ── Minimum data check ──────────────────────────────────
  if (data.length < MIN_DATA_DAYS) {
    return {
      overall: 0,
      previousOverall: null,
      weeklyChange: 0,
      monthlyChange: 0,
      dimensions: [],
      globalFlags: [`需要至少${MIN_DATA_DAYS}天数据才能生成健康评分（当前${data.length}天）`],
      insufficientData: true,
      dataDays: data.length,
      updatedAt: now,
      explanation: `数据不足：目前已同步${data.length}天健康数据，最少需要${MIN_DATA_DAYS}天。请确保设备已连接并持续同步。`,
    };
  }

  // ── Score each dimension ─────────────────────────────────
  const dimensions: DimensionScoreResult[] = [];
  const globalFlags: string[] = [];

  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    const meta = DIMENSION_META[key];
    const scorer = SCORERS[key];
    if (!scorer || !meta) continue;

    const { rawScore, flags, trendDelta } = scorer(data);
    const weightedScore = Math.round(rawScore * weight * 100) / 100;
    const status = scoreStatus(rawScore);

    dimensions.push({
      name: key,
      nameZh: meta.nameZh,
      icon: meta.icon,
      weight,
      rawScore,
      weightedScore,
      status,
      trend: trendDirection(trendDelta),
      trendDelta,
      flags,
    });

    // Promote severe dimension flags to global
    if (status === "poor") {
      globalFlags.push(
        `${meta.icon} ${meta.nameZh}得分偏低 (${rawScore}/100)`
      );
    }
    for (const f of flags) {
      if (!globalFlags.includes(`${meta.icon} ${f}`)) {
        globalFlags.push(`${meta.icon} ${f}`);
      }
    }
  }

  // ── Composite score (sum of weighted scores = 0–100) ────
  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.weightedScore, 0)
  );

  // ── Trend comparison ─────────────────────────────────────
  const weeklyChange = computePeriodChange(data, 7);
  const monthlyChange = computePeriodChange(data, 30);

  // Previous overall (7 days ago)
  const prevData = data.slice(0, Math.max(0, data.length - 7));
  let previousOverall: number | null = null;
  if (prevData.length >= MIN_DATA_DAYS) {
    const prevResult = computeRawOverall(prevData);
    previousOverall = prevResult;
  }

  // ── Explanation ──────────────────────────────────────────
  const explanation = generateExplanation(
    overall,
    weeklyChange,
    dimensions,
    globalFlags
  );

  return {
    overall,
    previousOverall,
    weeklyChange,
    monthlyChange,
    dimensions,
    globalFlags,
    insufficientData: false,
    dataDays: data.length,
    updatedAt: now,
    explanation,
  };
}

/**
 * Compute the raw overall score for a slice of data (used for trend comparison).
 */
function computeRawOverall(data: DailyHealthData[]): number {
  if (data.length < MIN_DATA_DAYS) return 0;

  let total = 0;
  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    const scorer = SCORERS[key];
    if (!scorer) continue;
    const { rawScore } = scorer(data);
    total += rawScore * weight;
  }

  return Math.round(total);
}

/**
 * Compute score change between the most recent `windowDays` and
 * the preceding `windowDays` period.
 */
function computePeriodChange(
  data: DailyHealthData[],
  windowDays: number
): number {
  if (data.length < windowDays * 2) return 0;

  const recentPeriod = data.slice(-windowDays);
  const prevPeriod = data.slice(-windowDays * 2, -windowDays);

  if (prevPeriod.length < MIN_DATA_DAYS) return 0;

  const recentScore = computeRawOverall(recentPeriod);
  const prevScore = computeRawOverall(prevPeriod);

  return recentScore - prevScore;
}

// ── Explanation Generator ──────────────────────────────────

function generateExplanation(
  overall: number,
  weeklyChange: number,
  dimensions: DimensionScoreResult[],
  globalFlags: string[]
): string {
  const statusText =
    overall >= 80 ? "优秀" : overall >= 60 ? "良好" : overall >= 40 ? "一般" : "需关注";

  const changeText =
    weeklyChange > 3
      ? `较上周提升${weeklyChange}分`
      : weeklyChange < -3
      ? `较上周下降${Math.abs(weeklyChange)}分`
      : "与上周基本持平";

  // Find the weakest dimension
  const sorted = [...dimensions].sort((a, b) => a.rawScore - b.rawScore);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  let advice = "";
  if (weakest && weakest.rawScore < 50) {
    advice = `建议重点关注${weakest.icon} ${weakest.nameZh}`;
    if (weakest.flags.length > 0) {
      advice += `：${weakest.flags[0]}`;
    }
  } else if (globalFlags.length > 0) {
    advice = `关注：${globalFlags[0]}`;
  } else if (strongest) {
    advice = `${strongest.icon} ${strongest.nameZh}表现最佳，请继续保持`;
  }

  return `您的综合健康评分为${overall}分（${statusText}），${changeText}。${advice}。`;
}

// ── Re-export for convenience ──────────────────────────────

export { MIN_DATA_DAYS, DIMENSION_WEIGHTS, DIMENSION_META };

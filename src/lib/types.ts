// HealthGuard TypeScript type definitions

export type ScreenId =
  | "onboarding"
  | "consent"
  | "camera-permission"
  | "dashboard"
  | "check-prepare"
  | "check-monitoring"
  | "check-result"
  | "trends"
  | "settings"
  | "privacy"
  | "device-connect"
  | "health-score"
  | "report-upload"
  | "report-processing"
  | "report-result"
  | "report-compare"
  | "report-summary"
  | "alert-center"
  | "health-profile"
  | "daily-summary"
  | "threshold-settings";

export type TabId = "home" | "trends" | "reports" | "settings";

export type MetricStatus = "normal" | "caution" | "abnormal";
export type AlertLevel = "green" | "yellow" | "red";
export type StressLevel = "low" | "mid" | "high";

export interface HealthMetric {
  type: "heart-rate" | "blood-pressure" | "spo2" | "stress";
  icon: string;
  label: string;
  value: number | string;
  unit: string;
  status: MetricStatus;
  color: string;
}

export interface TrendDataPoint {
  day: string;
  value: number;
}

export interface TrendData {
  metric: string;
  title: string;
  values: TrendDataPoint[];
  unit: string;
  color: string;
  avg: number;
  min: number;
  max: number;
}

// ── Health Score Engine Types ─────────────────────────────

/** A single day's health data fed into the scoring engine */
export interface DailyHealthData {
  date: string; // ISO date string YYYY-MM-DD
  sleep: {
    durationHours: number; // total sleep duration
    deepSleepMinutes: number; // deep sleep portion
    quality: number; // self-reported or device-derived 0-100
  };
  heartRate: {
    restingBpm: number; // resting heart rate
    avgDailyBpm: number; // average across the day
  };
  activity: {
    steps: number;
    activeMinutes: number; // moderate+ activity
    caloriesBurned: number;
  };
  weight: {
    kg: number;
    bmi: number;
  };
  recovery: {
    hrvMs: number; // heart rate variability in ms
  };
  bloodMetrics: {
    systolic: number;
    diastolic: number;
    spo2: number; // 0-100 percentage
    glucose?: number; // mmol/L, optional
  };
}

/** Status label for a dimension or the overall score */
export type ScoreStatus = "excellent" | "good" | "fair" | "poor";

/** Trend direction */
export type TrendDirection = "up" | "down" | "stable";

/** A single dimension's scored result */
export interface DimensionScoreResult {
  name: string;
  nameZh: string;
  icon: string;
  weight: number; // e.g. 0.25
  rawScore: number; // 0-100
  weightedScore: number; // rawScore * weight (pre-computed)
  status: ScoreStatus;
  trend: TrendDirection;
  trendDelta: number; // percentage points change vs last week
  flags: string[]; // human-readable anomaly descriptions
}

/** Full result from the health score engine */
export interface HealthScoreResult {
  overall: number; // 0-100 composite
  previousOverall: number | null;
  weeklyChange: number; // delta vs 7 days ago
  monthlyChange: number; // delta vs 30 days ago
  dimensions: DimensionScoreResult[];
  globalFlags: string[];
  insufficientData: boolean;
  dataDays: number;
  updatedAt: string; // ISO date
  explanation: string; // AI-style summary text
}

// ── Legacy / UI compatibility ─────────────────────────────

export interface HealthScore {
  overall: number;
  change: number;
  factors: {
    name: string;
    score: number;
    maxScore: number;
    color: string;
  }[];
}

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  description: string;
  time: string;
  source: string;
}

export type SyncDataType =
  | "heart_rate"
  | "blood_pressure"
  | "spo2"
  | "steps"
  | "sleep"
  | "weight"
  | "blood_glucose"
  | "temperature"
  | "ecg";

export interface SyncDataTypeInfo {
  key: SyncDataType;
  label: string;
  icon: string;
  unit: string;
  description: string;
}

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export interface DeviceSyncState {
  lastSyncAt: string | null;
  status: SyncStatus;
  progress: number; // 0–100
  errorMessage: string | null;
  syncedDays: number; // how many days of data pulled
  totalDays: number; // target (default 30)
  enabledDataTypes: SyncDataType[];
}

export interface DeviceBrand {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  supportedDataTypes: SyncDataType[];
  syncState: DeviceSyncState;
}

// ── S1: Medical Report AI Interpretation Types ──────────────

export type ReportCategoryId =
  | "blood-routine"
  | "liver-function"
  | "kidney-function"
  | "lipids"
  | "glucose"
  | "thyroid"
  | "urinalysis"
  | "tumor-markers"
  | "hepatitis-b"
  | "electrolytes"
  | "cardiac"
  | "general"
  | "imaging";

export interface ReportCategory {
  id: ReportCategoryId;
  name: string;
  icon: string;
  description: string;
}

export interface ReportIndicator {
  name: string;
  nameEn: string; // English name for reference
  value: string;
  numericValue?: number | null;
  range: string;
  unit?: string | null;
  status: "normal" | "borderline" | "abnormal";
  category: ReportCategoryId;
  /** Plain-language interpretation of what this indicator means */
  interpretation: string;
  /** How this indicator correlates with daily wearable data */
  wearableCorrelation: string | null;
  /** AI-generated recommendation specific to this indicator */
  recommendation: string;
}

export interface ReportRecord {
  id: string;
  title: string;
  uploadDate: string; // ISO date
  examDate: string; // ISO date of the actual exam
  hospital: string;
  ocrAccuracy: number; // 0-100
  indicators: ReportIndicator[];
  aiSummary: string; // Overall AI interpretation
  aiRecommendations: string[]; // Top recommendations
  wearableCorrelationSummary: string; // Summary of wearable data links
  thumbnailUrl?: string;
}

export interface ReportComparisonPoint {
  date: string;
  label: string;
  values: Record<string, number>; // indicator name → numeric value
}

export interface ReportComparison {
  reports: ReportRecord[];
  indicators: string[]; // indicators available across all reports
  timeline: ReportComparisonPoint[];
  trendAnalysis: string; // AI-generated trend interpretation
}

/** Consent tracking record for PIPL compliance */
export interface ConsentRecord {
  id: string;
  reportId: string;
  consentType: "ocr-processing" | "ai-analysis" | "data-storage" | "wearable-correlation";
  granted: boolean;
  timestamp: string; // ISO datetime
  ipAddress?: string;
  withdrawnAt?: string;
}

/** Privacy action types available to the user */
export type PrivacyAction = "view-data" | "export-data" | "delete-data" | "withdraw-consent";

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  conditions: string[];
  familyHistory: string[];
}

// ── M3: Daily Health Summary Push Types ───────────────────

/** Content sections within a daily health summary */
export interface SummarySleepSection {
  durationHours: number;
  quality: ScoreStatus;
  deepSleepMinutes: number;
  deepSleepTarget: number; // recommended minimum
  comparisonPercent: number; // vs user's 7-day avg (positive = better)
  insights: string; // AI-generated sleep analysis text
  suggestion: string; // AI-generated improvement advice
}

export interface SummaryExerciseSection {
  recommendedMinutes: number;
  recommendedType: string; // e.g. "有氧运动", "力量训练", "瑜伽"
  intensity: "low" | "moderate" | "vigorous";
  reason: string; // AI-generated reason for today's recommendation
  caution: string | null; // any caution based on recent health data
}

export interface SummaryTrendSection {
  metricName: string;
  metricIcon: string;
  direction: TrendDirection;
  description: string; // AI-generated trend interpretation
  suggestion: string;
}

export interface SummaryAnomalySection {
  metricName: string;
  metricIcon: string;
  alertLevel: AlertLevel;
  currentValue: string;
  normalRange: string;
  description: string;
  recommendation: string;
}

/** Full AI-generated daily health summary */
export interface DailySummary {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  generatedAt: string; // ISO datetime
  greeting: string; // personalized greeting
  overallMessage: string; // one-line health status
  healthScore: number; // today's score snapshot
  healthScoreChange: number; // vs yesterday
  sleep: SummarySleepSection;
  exercise: SummaryExerciseSection;
  trends: SummaryTrendSection[];
  anomalies: SummaryAnomalySection[];
  disclaimer: string; // AI disclaimer, always present
}

/** User preferences for daily summary push */
export interface SummaryPreferences {
  enabled: boolean;
  pushTime: string; // HH:mm format, user's local time
  timezone: string; // IANA timezone string
  includeSleep: boolean;
  includeExercise: boolean;
  includeTrends: boolean;
  includeAnomalies: boolean;
  language: "zh-CN" | "en";
}

/** Push notification click tracking event */
export interface SummaryClickEvent {
  summaryId: string;
  clickedAt: string; // ISO datetime
  source: "push" | "in-app";
  sectionsViewed: string[]; // which sections user scrolled to
  timeSpentSeconds: number;
}

export interface AppState {
  currentScreen: ScreenId;
  currentTab: TabId;
  screenStack: ScreenId[];
  isAuthenticated: boolean;
  cameraPermissionGranted: boolean;
  privacyConsentGiven: boolean;
  summaryPreferences: SummaryPreferences;
}

export type AppAction =
  | { type: "NAVIGATE"; screen: ScreenId }
  | { type: "GO_BACK" }
  | { type: "SWITCH_TAB"; tab: TabId }
  | { type: "SET_AUTHENTICATED"; value: boolean }
  | { type: "SET_CAMERA_PERMISSION"; value: boolean }
  | { type: "SET_PRIVACY_CONSENT"; value: boolean }
  | { type: "SET_SUMMARY_PREFERENCES"; preferences: Partial<SummaryPreferences> }
  | { type: "TOGGLE_SUMMARY_ENABLED" }
  | { type: "SET_SUMMARY_PUSH_TIME"; time: string };

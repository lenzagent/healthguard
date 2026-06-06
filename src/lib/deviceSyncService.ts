/**
 * M1: Device Sync Service
 *
 * Orchestrates health data synchronization from wearable devices.
 * For MVP: generates realistic mock health data that simulates
 * real device SDK responses (Apple HealthKit, Huawei Health Kit, Xiaomi API).
 *
 * Post-MVP: Replace mock generators with actual device SDK calls.
 *
 * PIPL compliance: only collects minimally necessary data types that
 * the user has explicitly enabled. All data encrypted at rest via HealthRecord.
 */

import { prisma } from "@/lib/db/prisma";
import { encryptHealthData } from "@/lib/crypto/encryption";

// ─── Types ─────────────────────────────────────────────────────────────

export type DeviceBrandId = "apple" | "huawei" | "xiaomi" | "oppo" | "vivo" | "google";

export const DEVICE_BRANDS: Record<
  DeviceBrandId,
  { name: string; icon: string; supportedDataTypes: SyncDataTypeKey[] }
> = {
  apple: {
    name: "Apple Health",
    icon: "🍎",
    supportedDataTypes: [
      "heart_rate", "blood_pressure", "spo2", "steps", "sleep",
      "weight", "blood_glucose", "temperature", "ecg",
    ],
  },
  huawei: {
    name: "华为运动健康",
    icon: "⌚",
    supportedDataTypes: [
      "heart_rate", "blood_pressure", "spo2", "steps", "sleep",
      "weight", "temperature",
    ],
  },
  xiaomi: {
    name: "小米健康",
    icon: "📱",
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep", "weight"],
  },
  oppo: {
    name: "OPPO健康",
    icon: "💚",
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep"],
  },
  vivo: {
    name: "vivo健康",
    icon: "🔵",
    supportedDataTypes: ["heart_rate", "spo2", "steps", "sleep"],
  },
  google: {
    name: "Google Fit",
    icon: "🏃",
    supportedDataTypes: [
      "heart_rate", "blood_pressure", "spo2", "steps", "sleep",
      "weight", "blood_glucose",
    ],
  },
};

export type SyncDataTypeKey =
  | "heart_rate"
  | "blood_pressure"
  | "spo2"
  | "steps"
  | "sleep"
  | "weight"
  | "blood_glucose"
  | "temperature"
  | "ecg";

// ─── Mock Data Generators ──────────────────────────────────────────────

/** Generate a random integer in [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate a random float in [min, max] with given decimal places */
function randFloat(min: number, max: number, decimals = 1): number {
  const val = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/** Generate mock heart rate data (bpm) — resting heart rate with daily variation */
function generateHeartRateData(daysAgo: number): Record<string, unknown> {
  const baseBpm = 68 + Math.sin(daysAgo * 0.3) * 4;
  return {
    restingBpm: Math.round(baseBpm + randInt(-3, 3)),
    minBpm: Math.round(baseBpm - randInt(5, 12)),
    maxBpm: Math.round(baseBpm + randInt(15, 45)),
    avgBpm: Math.round(baseBpm + randInt(5, 15)),
    samples: randInt(800, 1400), // samples per day
  };
}

/** Generate mock blood pressure data (mmHg) */
function generateBloodPressureData(daysAgo: number): Record<string, unknown> {
  const baseSystolic = 118 + Math.sin(daysAgo * 0.2) * 5;
  const baseDiastolic = 76 + Math.sin(daysAgo * 0.2) * 3;
  return {
    systolic: Math.round(baseSystolic + randInt(-4, 6)),
    diastolic: Math.round(baseDiastolic + randInt(-3, 4)),
    measurements: randInt(1, 3), // measurements per day
  };
}

/** Generate mock SpO2 data (%) */
function generateSpO2Data(_daysAgo: number): Record<string, unknown> {
  return {
    avg: randInt(96, 99),
    min: randInt(93, 96),
    max: randInt(98, 100),
    samples: randInt(200, 500),
  };
}

/** Generate mock step count data */
function generateStepsData(daysAgo: number): Record<string, unknown> {
  const baseSteps = 8500 - daysAgo * 20; // slight decline over time
  const steps = Math.round(baseSteps + randInt(-2000, 2000));
  return {
    steps: Math.max(steps, 2000),
    distanceMeters: Math.round(steps * randFloat(0.65, 0.85, 2)),
    activeMinutes: randInt(15, 65),
    caloriesBurned: randInt(1800, 2800),
    floors: randInt(2, 15),
  };
}

/** Generate mock sleep data */
function generateSleepData(_daysAgo: number): Record<string, unknown> {
  const durationHours = randFloat(5.5, 8.5, 1);
  return {
    durationHours,
    deepSleepMinutes: randInt(30, 90),
    lightSleepMinutes: randInt(120, 240),
    remMinutes: randInt(60, 120),
    awakeMinutes: randInt(5, 30),
    quality: randInt(55, 95),
    efficiency: randInt(80, 98),
    startTime: `${randInt(22, 23)}:${String(randInt(0, 59)).padStart(2, "0")}`,
    endTime: `${randInt(5, 7)}:${String(randInt(0, 59)).padStart(2, "0")}`,
  };
}

/** Generate mock weight data (kg) */
function generateWeightData(daysAgo: number): Record<string, unknown> {
  const baseWeight = 73 + daysAgo * 0.015; // slight upward trend
  return {
    weightKg: randFloat(baseWeight - 0.5, baseWeight + 0.5, 1),
    bmi: randFloat(23.5, 24.2, 1),
    bodyFatPercent: randFloat(20, 26, 1),
    measurements: 1,
  };
}

/** Generate mock blood glucose data (mmol/L) */
function generateBloodGlucoseData(_daysAgo: number): Record<string, unknown> {
  return {
    fasting: randFloat(4.8, 5.6, 1),
    postPrandial: randFloat(5.5, 7.8, 1),
    measurements: randInt(0, 2),
  };
}

/** Generate mock body temperature data (°C) */
function generateTemperatureData(_daysAgo: number): Record<string, unknown> {
  return {
    morning: randFloat(36.3, 37.0, 1),
    evening: randFloat(36.5, 37.2, 1),
    measurements: randInt(0, 2),
  };
}

/** Generate mock ECG data */
function generateEcgData(_daysAgo: number): Record<string, unknown> {
  const classifications = ["sinus_rhythm", "sinus_rhythm", "sinus_rhythm", "sinus_rhythm", "afib_warning"];
  return {
    classification: classifications[randInt(0, classifications.length - 1)],
    avgHeartRate: randInt(62, 85),
    durationSeconds: 30,
    measurements: randInt(0, 1),
  };
}

/** Map data type to its generator function */
const DATA_GENERATORS: Record<SyncDataTypeKey, (daysAgo: number) => Record<string, unknown>> = {
  heart_rate: generateHeartRateData,
  blood_pressure: generateBloodPressureData,
  spo2: generateSpO2Data,
  steps: generateStepsData,
  sleep: generateSleepData,
  weight: generateWeightData,
  blood_glucose: generateBloodGlucoseData,
  temperature: generateTemperatureData,
  ecg: generateEcgData,
};

/** Map data type to recommended sampling interval (in days) */
const DATA_SAMPLING_INTERVALS: Partial<Record<SyncDataTypeKey, number>> = {
  heart_rate: 1,        // daily
  blood_pressure: 1,    // daily
  spo2: 1,              // daily
  steps: 1,             // daily
  sleep: 1,             // daily
  weight: 7,            // weekly
  blood_glucose: 3,     // every 3 days
  temperature: 7,       // weekly
  ecg: 14,              // biweekly
};

// ─── Sync Service ──────────────────────────────────────────────────────

export interface SyncProgressCallback {
  (progress: number, syncedDays: number, message: string): void;
}

/**
 * Execute a full sync for a device: generates mock health data for the past
 * N days, encrypts each record, and stores in HealthRecord.
 *
 * Designed to complete within 3 minutes for 30 days of data.
 * In production, this would call Apple HealthKit / Huawei Health Kit / Xiaomi APIs.
 */
export async function syncDeviceData(
  userId: string,
  deviceId: string,
  brandId: DeviceBrandId,
  enabledDataTypes: SyncDataTypeKey[],
  totalDays: number = 30,
  onProgress?: SyncProgressCallback,
): Promise<{ recordsCreated: number; syncedDays: number; errors: string[] }> {
  const errors: string[] = [];
  let recordsCreated = 0;
  const now = new Date();

  // Update sync job to in_progress
  await prisma.syncJob.update({
    where: { id: deviceId },
    data: { status: "in_progress", startedAt: new Date() },
  });

  onProgress?.(0, 0, "开始同步...");

  // For each enabled data type, generate data for each day
  for (const dataType of enabledDataTypes) {
    const generator = DATA_GENERATORS[dataType];
    if (!generator) {
      errors.push(`未知数据类型: ${dataType}`);
      continue;
    }

    const interval = DATA_SAMPLING_INTERVALS[dataType] ?? 1;

    // Generate data points for each day in range
    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      // Skip days that don't align with sampling interval
      if (dayOffset % interval !== 0) continue;

      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      date.setHours(randInt(0, 23), randInt(0, 59), 0, 0);

      try {
        const mockData = generator(dayOffset);
        const plaintext = JSON.stringify(mockData);
        const encrypted = await encryptHealthData(plaintext);

        await prisma.healthRecord.create({
          data: {
            userId,
            dataType,
            encryptedData: encrypted.ciphertext,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            source: `${brandId}_health`, // "apple_health", "huawei_health", etc.
            recordedAt: date,
          },
        });

        recordsCreated++;
      } catch (err) {
        errors.push(`存储 ${dataType} (day ${dayOffset}) 失败: ${String(err)}`);
      }
    }

    // Report progress after each data type
    const completedTypes = enabledDataTypes.indexOf(dataType) + 1;
    const progress = Math.round((completedTypes / enabledDataTypes.length) * 95);
    onProgress?.(progress, totalDays, `已同步 ${dataType}... (${completedTypes}/${enabledDataTypes.length})`);
  }

  // Final progress update
  onProgress?.(100, totalDays, `同步完成，共创建 ${recordsCreated} 条健康记录`);

  return { recordsCreated, syncedDays: totalDays, errors };
}

/**
 * Connect a device brand for a user. Creates the DeviceConnection record
 * if it doesn't exist, or re-activates it if previously disconnected.
 */
export async function connectDevice(
  userId: string,
  brandId: DeviceBrandId,
): Promise<{ id: string; brandId: string; brandName: string; connected: boolean }> {
  const brand = DEVICE_BRANDS[brandId];
  if (!brand) {
    throw new Error(`Unknown device brand: ${brandId}`);
  }

  const existing = await prisma.deviceConnection.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });

  if (existing) {
    // Reconnect
    const updated = await prisma.deviceConnection.update({
      where: { id: existing.id },
      data: {
        connected: true,
        syncStatus: "idle",
        syncError: null,
        updatedAt: new Date(),
      },
    });
    return {
      id: updated.id,
      brandId: updated.brandId,
      brandName: updated.brandName,
      connected: updated.connected,
    };
  }

  // Create new connection with all supported data types enabled by default
  const defaultTypes = brand.supportedDataTypes.slice(0, 5); // Top 5 for data minimization
  const created = await prisma.deviceConnection.create({
    data: {
      userId,
      brandId,
      brandName: brand.name,
      connected: true,
      enabledDataTypes: defaultTypes,
      syncStatus: "idle",
      totalDays: 30,
    },
  });

  return {
    id: created.id,
    brandId: created.brandId,
    brandName: created.brandName,
    connected: created.connected,
  };
}

/**
 * Disconnect a device brand for a user. Keeps the record but marks as disconnected.
 * Previously synced data is NOT deleted (PIPL: user can request deletion separately).
 */
export async function disconnectDevice(
  userId: string,
  brandId: DeviceBrandId,
): Promise<{ id: string; brandId: string; connected: boolean }> {
  const existing = await prisma.deviceConnection.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });

  if (!existing) {
    throw new Error(`Device ${brandId} is not connected`);
  }

  const updated = await prisma.deviceConnection.update({
    where: { id: existing.id },
    data: {
      connected: false,
      syncStatus: "idle",
      syncError: null,
      updatedAt: new Date(),
    },
  });

  return {
    id: updated.id,
    brandId: updated.brandId,
    connected: updated.connected,
  };
}

/**
 * Update enabled data types for a device connection.
 */
export async function updateDeviceDataTypes(
  userId: string,
  brandId: DeviceBrandId,
  enabledDataTypes: SyncDataTypeKey[],
): Promise<{ brandId: string; enabledDataTypes: string[] }> {
  const existing = await prisma.deviceConnection.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });

  if (!existing) {
    throw new Error(`Device ${brandId} is not connected`);
  }

  const updated = await prisma.deviceConnection.update({
    where: { id: existing.id },
    data: { enabledDataTypes, updatedAt: new Date() },
  });

  return {
    brandId: updated.brandId,
    enabledDataTypes: updated.enabledDataTypes,
  };
}

/**
 * Get all device connections for a user.
 * Returns mock data enriched with brand metadata for devices not yet connected.
 */
export async function getUserDevices(userId: string): Promise<
  Array<{
    id: string;
    brandId: string;
    brandName: string;
    icon: string;
    connected: boolean;
    supportedDataTypes: SyncDataTypeKey[];
    enabledDataTypes: SyncDataTypeKey[];
    lastSyncAt: string | null;
    syncStatus: string;
    syncProgress: number;
    syncedDays: number;
    totalDays: number;
    syncError: string | null;
  }>
> {
  const connections = await prisma.deviceConnection.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  type ConnType = { id: string; brandId: string; brandName: string; connected: boolean; enabledDataTypes: string[]; lastSyncAt: Date | null; syncStatus: string; syncProgress: number; syncedDays: number; totalDays: number; syncError: string | null };
  const connectedMap = new Map<string, ConnType>(connections.map((c: { brandId: string }) => [c.brandId, c as ConnType]));

  // Return all supported brands, with connection state for those connected
  return Object.entries(DEVICE_BRANDS).map(([brandId, brand]) => {
    const conn = connectedMap.get(brandId);
    if (conn) {
      return {
        id: conn.id,
        brandId: conn.brandId,
        brandName: conn.brandName,
        icon: brand.icon,
        connected: conn.connected,
        supportedDataTypes: brand.supportedDataTypes,
        enabledDataTypes: conn.enabledDataTypes as SyncDataTypeKey[],
        lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
        syncStatus: conn.syncStatus,
        syncProgress: conn.syncProgress,
        syncedDays: conn.syncedDays,
        totalDays: conn.totalDays,
        syncError: conn.syncError,
      };
    }

    return {
      id: `new-${brandId}`,
      brandId,
      brandName: brand.name,
      icon: brand.icon,
      connected: false,
      supportedDataTypes: brand.supportedDataTypes,
      enabledDataTypes: brand.supportedDataTypes.slice(0, 5),
      lastSyncAt: null,
      syncStatus: "idle",
      syncProgress: 0,
      syncedDays: 0,
      totalDays: 30,
      syncError: null,
    };
  });
}

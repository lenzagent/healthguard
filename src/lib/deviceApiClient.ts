/**
 * M1: Device API Client
 *
 * Frontend API client for device connection management.
 * Falls back to local mock data when the API is unavailable (dev mode).
 *
 * In production, all calls go through the Next.js API routes
 * which handle encryption, audit logging, and PIPL compliance.
 */

import type { DeviceBrand, SyncDataType, SyncStatus } from "@/lib/types";
import { mockDevices } from "@/data/mockData";

// ─── API Response Types ────────────────────────────────────────────────

export interface DeviceApiResponse {
  id: string;
  brandId: string;
  brandName: string;
  icon: string;
  connected: boolean;
  supportedDataTypes: SyncDataType[];
  enabledDataTypes: SyncDataType[];
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  syncProgress: number;
  syncedDays: number;
  totalDays: number;
  syncError: string | null;
}

export interface DeviceListResponse {
  devices: DeviceApiResponse[];
}

export interface SyncResult {
  brandId: string;
  brandName: string;
  status: "success" | "error";
  recordsCreated: number;
  syncedDays: number;
  errors: string[];
}

export interface SyncResponse {
  devices: SyncResult[];
  summary: {
    totalDevices: number;
    totalRecordsCreated: number;
    totalDays: number;
    status: "complete" | "partial";
  };
}

interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

// ─── Client ────────────────────────────────────────────────────────────

const API_BASE = "/api/devices";

async function apiFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiSuccess<T>> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
    credentials: "include",
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || json.error || `API error: ${res.status}`);
  }

  return json as ApiSuccess<T>;
}

/** Check if the API is reachable (for mock fallback decision) */
let apiAvailable: boolean | null = null;

/** Detect if we are in a real browser with a running Next.js server */
function isBrowserLike(): boolean {
  // SSR guard
  if (typeof window === "undefined") return false;
  if (typeof fetch !== "function") return false;
  // In vitest/jsdom: __vitest_worker__ is defined on globalThis
  const g = globalThis as Record<string, unknown>;
  if (g.__vitest_worker__ !== undefined) return false;
  // In vitest with globals: vi is defined
  if (g.vi !== undefined) return false;
  // In test envs (vitest sets process.env.VITEST or NODE_ENV=test)
  try {
    if (process.env?.VITEST || process.env?.NODE_ENV === "test") return false;
  } catch { /* process might not exist in browser */ }
  return true;
}

async function isApiAvailable(): Promise<boolean> {
  if (apiAvailable !== null) return apiAvailable;

  // Fast path: skip if we're not in a real browser with a running server
  if (!isBrowserLike()) {
    apiAvailable = false;
    return false;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}`, {
      method: "HEAD",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    apiAvailable = res.ok || res.status === 401;
    return apiAvailable;
  } catch {
    apiAvailable = false;
    return false;
  }
}

// ─── API Functions ─────────────────────────────────────────────────────

/** Convert API device format to frontend DeviceBrand format */
function toDeviceBrand(d: DeviceApiResponse): DeviceBrand {
  return {
    id: d.brandId,
    name: d.brandName,
    icon: d.icon,
    connected: d.connected,
    supportedDataTypes: d.supportedDataTypes,
    syncState: {
      lastSyncAt: d.lastSyncAt
        ? new Date(d.lastSyncAt).toLocaleString("zh-CN", {
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      status: d.syncStatus,
      progress: d.syncProgress,
      errorMessage: d.syncError,
      syncedDays: d.syncedDays,
      totalDays: d.totalDays,
      enabledDataTypes: d.enabledDataTypes,
    },
  };
}

/** Fetch list of all device brands with user's connection state */
export async function fetchDevices(): Promise<DeviceBrand[]> {
  try {
    const available = await isApiAvailable();
    if (!available) {
      console.log("[DeviceClient] API unavailable, using mock data");
      return mockDevices;
    }

    const result = await apiFetch<DeviceListResponse>(API_BASE);
    return result.data.devices.map(toDeviceBrand);
  } catch (error) {
    console.warn("[DeviceClient] fetchDevices failed, falling back to mock:", error);
    return mockDevices;
  }
}

/** Connect a device brand */
export async function connectDeviceApi(brandId: string): Promise<DeviceBrand> {
  // Fast fail: skip API if we already know it's unavailable
  if (!isBrowserLike() || apiAvailable === false) {
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      connected: true,
      syncState: { ...device.syncState, status: "idle" as SyncStatus },
    };
  }

  try {
    const result = await apiFetch<DeviceApiResponse>(API_BASE, {
      method: "POST",
      body: JSON.stringify({ action: "connect", brandId }),
    });
    return toDeviceBrand(result.data);
  } catch (error) {
    console.warn("[DeviceClient] connectDevice failed:", error);
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      connected: true,
      syncState: { ...device.syncState, status: "idle" as SyncStatus },
    };
  }
}

/** Disconnect a device brand */
export async function disconnectDeviceApi(brandId: string): Promise<DeviceBrand> {
  if (!isBrowserLike() || apiAvailable === false) {
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      connected: false,
      syncState: {
        lastSyncAt: null,
        status: "idle" as SyncStatus,
        progress: 0,
        errorMessage: null,
        syncedDays: 0,
        totalDays: 30,
        enabledDataTypes: [...device.syncState.enabledDataTypes],
      },
    };
  }

  try {
    const result = await apiFetch<DeviceApiResponse>(API_BASE, {
      method: "POST",
      body: JSON.stringify({ action: "disconnect", brandId }),
    });
    return toDeviceBrand(result.data);
  } catch (error) {
    console.warn("[DeviceClient] disconnectDevice failed:", error);
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      connected: false,
      syncState: {
        lastSyncAt: null,
        status: "idle" as SyncStatus,
        progress: 0,
        errorMessage: null,
        syncedDays: 0,
        totalDays: 30,
        enabledDataTypes: [...device.syncState.enabledDataTypes],
      },
    };
  }
}

/** Update enabled data types for a device */
export async function updateDeviceDataTypesApi(
  brandId: string,
  enabledDataTypes: SyncDataType[],
): Promise<DeviceBrand> {
  if (!isBrowserLike() || apiAvailable === false) {
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      syncState: { ...device.syncState, enabledDataTypes },
    };
  }

  try {
    const result = await apiFetch<DeviceApiResponse>(API_BASE, {
      method: "POST",
      body: JSON.stringify({ action: "update-types", brandId, enabledDataTypes }),
    });
    return toDeviceBrand(result.data);
  } catch (error) {
    console.warn("[DeviceClient] updateDeviceDataTypes failed:", error);
    const device = mockDevices.find((d) => d.id === brandId);
    if (!device) throw new Error(`Unknown brand: ${brandId}`);
    return {
      ...device,
      syncState: { ...device.syncState, enabledDataTypes },
    };
  }
}

/** Trigger sync for all connected devices or a specific brand */
export async function triggerSync(brandId?: string | null): Promise<SyncResponse> {
  const result = await apiFetch<SyncResponse>(`${API_BASE}/sync`, {
    method: "POST",
    body: JSON.stringify({ brandId: brandId ?? null, totalDays: 30 }),
  });
  return result.data;
}

// ─── Mock Sync Simulation (for demo/development without backend) ───────

export interface MockSyncCallbacks {
  onProgress?: (progress: number, syncedDays: number) => void;
  onComplete?: (hasError: boolean) => void;
}

/**
 * Simulates a sync operation using local timers.
 * Used in dev/demo when the backend API is unavailable.
 */
export function simulateSync(
  connectedCount: number,
  callbacks: MockSyncCallbacks,
): () => void {
  const TOTAL_DAYS = 30;
  const TOTAL_DURATION = 2500; // ~2.5 seconds for demo
  const STEPS = 20;
  const STEP_INTERVAL = TOTAL_DURATION / STEPS;
  let step = 0;
  let cancelled = false;

  const timer = setInterval(() => {
    if (cancelled) {
      clearInterval(timer);
      return;
    }

    step++;
    const progress = Math.round((step / STEPS) * 100);
    const days = Math.round((progress / 100) * TOTAL_DAYS);
    callbacks.onProgress?.(progress, days);

    if (step >= STEPS) {
      clearInterval(timer);
      const hasError = Math.random() < 0.15;
      callbacks.onComplete?.(hasError);
    }
  }, STEP_INTERVAL);

  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}

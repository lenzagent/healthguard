"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
  detectAnomalies,
  type DetectionInput,
  type AnomalyResult,
} from "@/lib/anomalyDetection";
import { getActiveThresholds } from "@/lib/thresholds";
import {
  processAnomalies,
  resolveInactiveAlerts,
  getAlerts,
  getPendingPushAlerts,
  markPushSent,
  hasActiveRedAlert,
  type ManagedAlert,
} from "@/lib/alertService";
import { handleAnomalyNotifications, isNotificationSupported } from "@/lib/pushNotification";

/**
 * useAnomalyMonitor — the integration hook that wires the full M4 pipeline:
 *
 *   Health Data → detectAnomalies() → processAnomalies() → Push Notification
 *
 * Usage:
 *   const { runDetection, alerts, activeRedAlert, pendingPushCount } = useAnomalyMonitor();
 *
 *   // After a device sync or manual measurement:
 *   await runDetection({
 *     heartRate: 72,
 *     spo2: 98,
 *     source: "Apple Watch",
 *     recentHistory: { ... },
 *   });
 *
 * The hook handles:
 * - Running anomaly detection against current thresholds
 * - Processing results into managed alerts (dedup, escalate, lifecycle)
 * - Auto-resolving inactive alerts when conditions normalize
 * - Queueing push notifications for red/yellow alerts
 * - Emitting callbacks for external notification dispatch
 */

export interface AnomalyMonitorState {
  /** Results from the most recent detection run */
  lastDetection: AnomalyResult[];
  /** All current managed alerts */
  alerts: ManagedAlert[];
  /** Whether any active red alert exists */
  activeRedAlert: boolean;
  /** Number of alerts awaiting push notification */
  pendingPushCount: number;
  /** ISO timestamp of last detection run */
  lastRunAt: string | null;
  /** Whether a detection is currently running */
  isRunning: boolean;
}

export interface AnomalyMonitorCallbacks {
  /** Called when new push notifications need to be dispatched */
  onPushNotifications?: (alerts: ManagedAlert[]) => void;
  /** Called after detection completes */
  onDetectionComplete?: (results: AnomalyResult[]) => void;
}

/**
 * Default push notification handler using the pushNotification service.
 * Falls back silently if permissions aren't granted or the API is unavailable.
 */
function defaultPushHandler(alerts: ManagedAlert[]): void {
  handleAnomalyNotifications(alerts);
}

export function useAnomalyMonitor(callbacks?: AnomalyMonitorCallbacks) {
  const [state, setState] = useState<AnomalyMonitorState>({
    lastDetection: [],
    alerts: [],
    activeRedAlert: false,
    pendingPushCount: 0,
    lastRunAt: null,
    isRunning: false,
  });

  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  /**
   * Refresh the monitor state from the alert store.
   */
  const refreshState = useCallback(() => {
    const alerts = getAlerts();
    const pending = getPendingPushAlerts();
    setState({
      lastDetection: [],
      alerts,
      activeRedAlert: hasActiveRedAlert(),
      pendingPushCount: pending.length,
      lastRunAt: null,
      isRunning: false,
    });
  }, []);

  /**
   * Run the full detection pipeline on a health data snapshot.
   *
   * @param input - Current health metrics with optional history
   * @returns The anomalies detected in this run
   */
  const runDetection = useCallback(
    (input: DetectionInput): AnomalyResult[] => {
      if (typeof window === "undefined") return [];

      setState((prev) => ({ ...prev, isRunning: true }));

      // 1. Get active thresholds (defaults + user overrides)
      const thresholds = getActiveThresholds();

      // 2. Run anomaly detection
      const anomalies = detectAnomalies(input, thresholds);

      // 3. Process into managed alerts (dedup, escalate, create)
      const updatedAlerts = anomalies.length > 0
        ? processAnomalies(anomalies)
        : [];

      // 4. Resolve alerts that are no longer active
      // Build active anomaly keys from current results
      const activeKeys = new Set(
        anomalies.map((a) => `${a.type}:${a.metric}`)
      );
      resolveInactiveAlerts([...activeKeys]);

      // 5. Handle push notifications for new/updated red & yellow alerts
      const pushHandler =
        callbacksRef.current?.onPushNotifications || defaultPushHandler;
      const pending = getPendingPushAlerts();
      if (pending.length > 0) {
        try {
          pushHandler(pending);
        } catch {
          // Best-effort notification delivery
        }
        // Mark as sent
        markPushSent(pending.map((a) => a.id));
      }

      // 6. Update state
      const now = new Date().toISOString();
      const allAlerts = getAlerts();
      setState({
        lastDetection: anomalies,
        alerts: allAlerts,
        activeRedAlert: hasActiveRedAlert(),
        pendingPushCount: getPendingPushAlerts().length,
        lastRunAt: now,
        isRunning: false,
      });

      // 7. Fire callback
      callbacksRef.current?.onDetectionComplete?.(anomalies);

      return anomalies;
    },
    []
  );

  // Initialize: load existing alert state on mount
  useEffect(() => {
    refreshState();
  }, [refreshState]);

  return {
    /** Current monitor state */
    state,
    /** Run detection on a new health data snapshot */
    runDetection,
    /** Re-sync state from the alert store */
    refreshState,
  };
}

/**
 * Hook to request and manage notification permission.
 * Returns the current permission state and a request function.
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "denied"
  );

  const isSupported =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) return "denied";

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch {
      return "denied";
    }
  }, [isSupported]);

  return {
    permission,
    isSupported,
    requestPermission,
    isGranted: permission === "granted",
  };
}

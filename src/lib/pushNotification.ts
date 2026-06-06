/**
 * HealthGuard Push Notification Service
 *
 * Handles browser push notifications for anomaly alerts.
 *
 * MVP Strategy:
 * - Uses the Web Notification API (no service worker required)
 * - Falls back gracefully when unsupported (SSR, older browsers)
 * - Integrates with alertService for pending push alerts
 *
 * Post-MVP: Upgrade to Web Push API with service worker for
 * background notifications when the app is not in focus.
 */

import type { ManagedAlert } from "./alertService";
import { buildPushPayload } from "./alertService";

// ── Types ──────────────────────────────────────────────────────────

export type PushPermissionState = "granted" | "denied" | "default" | "unsupported";

export interface PushServiceState {
  permission: PushPermissionState;
  isSupported: boolean;
}

// ── Permission ─────────────────────────────────────────────────────

/**
 * Check if the Notification API is available.
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window
  );
}

/**
 * Get the current notification permission state.
 */
export function getNotificationPermission(): PushPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/**
 * Request notification permission from the user.
 * Should be called from a user gesture context (click handler).
 */
export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (!isNotificationSupported()) return "unsupported";

  try {
    const result = await Notification.requestPermission();
    return result as PushPermissionState;
  } catch {
    return "denied";
  }
}

// ── Notification Dispatch ──────────────────────────────────────────

/**
 * Send a single browser notification for an alert.
 * Silently fails if permission is not granted.
 */
export function sendAlertNotification(alert: ManagedAlert): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const payload = buildPushPayload(alert);

    // Avoid duplicate notifications for the same alert
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: alert.id, // Deduplicates by alert ID
      data: payload.data,
      requireInteraction: alert.level === "red",
      vibrate: alert.level === "red" ? [200, 100, 200] : [100],
    } as NotificationOptions);

    // Handle click: focus the app window
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return true;
  } catch {
    return false;
  }
}

/**
 * Send notifications for multiple alerts.
 * Returns the count of successfully dispatched notifications.
 */
export function sendBatchNotifications(alerts: ManagedAlert[]): number {
  let sent = 0;
  for (const alert of alerts) {
    if (sendAlertNotification(alert)) {
      sent++;
    }
  }
  return sent;
}

/**
 * Send a test notification to verify the system works.
 */
export function sendTestNotification(): boolean {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  try {
    new Notification("HealthGuard ✅", {
      body: "通知功能正常！当检测到健康异常时，您将收到预警通知。",
      icon: "/icon-192.png",
      tag: "test-notification",
    });
    return true;
  } catch {
    return false;
  }
}

// ── Service Worker Registration (for future Web Push API) ──────────

/**
 * Register the push notification service worker.
 * This enables background notifications even when the app tab is closed.
 *
 * Post-MVP: Implement full Web Push API flow:
 * 1. Register service worker
 * 2. Subscribe to push manager (VAPID)
 * 3. Send subscription to backend
 * 4. Backend triggers push via web-push library
 */
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.log("[HealthGuard] Push service worker registered:", registration.scope);
    return registration;
  } catch (error) {
    console.warn("[HealthGuard] Failed to register service worker:", error);
    return null;
  }
}

/**
 * Subscribe to Web Push notifications (future use).
 * Requires a service worker registration and VAPID public key.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
    });
    console.log("[HealthGuard] Push subscription created");
    return subscription;
  } catch (error) {
    console.warn("[HealthGuard] Failed to subscribe to push:", error);
    return null;
  }
}

// ── Utilities ──────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = typeof window !== "undefined"
    ? window.atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Integration with Anomaly Monitor ───────────────────────────────

/**
 * Notification callback compatible with useAnomalyMonitor's onPushNotifications.
 * Sends browser notifications for pending alerts and returns the count sent.
 */
export function handleAnomalyNotifications(alerts: ManagedAlert[]): number {
  const redAlerts = alerts.filter((a) => a.level === "red");
  const yellowAlerts = alerts.filter((a) => a.level === "yellow");

  // Prioritize red alerts, then yellow
  let sent = 0;
  sent += sendBatchNotifications(redAlerts);
  sent += sendBatchNotifications(yellowAlerts);
  return sent;
}

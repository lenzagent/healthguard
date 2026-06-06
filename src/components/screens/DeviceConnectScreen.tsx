"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { TopNav } from "@/components/navigation/TopNav";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { mockDevices, SYNC_DATA_TYPES } from "@/data/mockData";
import { useToast } from "@/components/ui/Toast";
import type { DeviceBrand, SyncDataType, SyncStatus } from "@/lib/types";
import {
  fetchDevices,
  connectDeviceApi,
  disconnectDeviceApi,
  updateDeviceDataTypesApi,
  simulateSync,
} from "@/lib/deviceApiClient";

type ExpandedDevice = string | null;

export function DeviceConnectScreen() {
  const [devices, setDevices] = useState<DeviceBrand[]>(mockDevices);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [expandedDevice, setExpandedDevice] = useState<ExpandedDevice>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncDays, setSyncDays] = useState(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelSyncRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();

  // Fetch devices from API on mount (falls back to mock data)
  useEffect(() => {
    let cancelled = false;
    fetchDevices()
      .then((data) => {
        if (!cancelled) {
          setDevices(data);
          setDevicesLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setDevicesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const connectedDevices = devices.filter((d) => d.connected);
  const connectedCount = connectedDevices.length;

  // Cleanup sync timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, []);

  const toggleDeviceConnection = useCallback(
    async (id: string) => {
      const device = devices.find((d) => d.id === id);
      if (!device) return;

      try {
        if (device.connected) {
          const result = await disconnectDeviceApi(id);
          setDevices((prev) => prev.map((d) => (d.id === id ? result : d)));
          showToast(`已断开${device.name}`, "warning");
        } else {
          const result = await connectDeviceApi(id);
          setDevices((prev) => prev.map((d) => (d.id === id ? result : d)));
          showToast(`✅ 已连接${device.name}`, "success");
        }
      } catch {
        // Fallback to local state toggle if API fails
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id !== id) return d;
            const wasConnected = d.connected;
            const updated: DeviceBrand = {
              ...d,
              connected: !wasConnected,
              syncState: wasConnected
                ? {
                    lastSyncAt: null,
                    status: "idle" as SyncStatus,
                    progress: 0,
                    errorMessage: null,
                    syncedDays: 0,
                    totalDays: 30,
                    enabledDataTypes: [...d.syncState.enabledDataTypes],
                  }
                : {
                    ...d.syncState,
                    status: "idle" as SyncStatus,
                    progress: 0,
                    errorMessage: null,
                    syncedDays: 0,
                  },
            };
            showToast(
              !wasConnected ? `✅ 已连接${d.name}` : `已断开${d.name}`,
              !wasConnected ? "success" : "warning"
            );
            return updated;
          })
        );
      }
    },
    [devices, showToast]
  );

  const toggleDataType = useCallback(
    async (deviceId: string, dataType: SyncDataType) => {
      const device = devices.find((d) => d.id === deviceId);
      if (!device) return;

      const newTypes = device.syncState.enabledDataTypes.includes(dataType)
        ? device.syncState.enabledDataTypes.filter((t) => t !== dataType)
        : [...device.syncState.enabledDataTypes, dataType];

      // Optimistic update
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id !== deviceId) return d;
          return {
            ...d,
            syncState: { ...d.syncState, enabledDataTypes: newTypes },
          };
        })
      );

      // Call API (fire-and-forget with error handling)
      try {
        await updateDeviceDataTypesApi(deviceId, newTypes);
      } catch {
        // Revert on failure
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id !== deviceId) return d;
            return {
              ...d,
              syncState: {
                ...d.syncState,
                enabledDataTypes: device.syncState.enabledDataTypes,
              },
            };
          })
        );
        showToast("数据类型更新失败，请重试", "danger");
      }
    },
    [devices, showToast]
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedDevice((prev) => (prev === id ? null : id));
  }, []);

  const cancelSync = useCallback(() => {
    if (cancelSyncRef.current) {
      cancelSyncRef.current();
      cancelSyncRef.current = null;
    }
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    setIsSyncingAll(false);
    setSyncProgress(0);
    setSyncDays(0);
    setSyncError(null);
    setDevices((prev) =>
      prev.map((d) => ({
        ...d,
        syncState: {
          ...d.syncState,
          status: "idle" as SyncStatus,
          progress: 0,
          errorMessage: null,
        },
      }))
    );
    showToast("同步已取消", "warning");
  }, [showToast]);

  const triggerSyncAll = useCallback(() => {
    if (connectedCount === 0) {
      showToast("⚠️ 请先连接至少一个设备", "warning");
      return;
    }

    const hasEnabledTypes = connectedDevices.some(
      (d) => d.syncState.enabledDataTypes.length > 0
    );
    if (!hasEnabledTypes) {
      showToast("⚠️ 请至少为一个设备启用一种数据类型", "warning");
      return;
    }

    setIsSyncingAll(true);
    setSyncProgress(0);
    setSyncDays(0);
    setSyncError(null);

    // Set all connected devices to syncing state
    setDevices((prev) =>
      prev.map((d) =>
        d.connected
          ? {
              ...d,
              syncState: {
                ...d.syncState,
                status: "syncing" as SyncStatus,
                progress: 0,
                errorMessage: null,
                syncedDays: 0,
              },
            }
          : d
      )
    );

    const TOTAL_DAYS = 30;
    const now = new Date();
    const timeStr = `今天 ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    cancelSyncRef.current = simulateSync(connectedCount, {
      onProgress: (progress, days) => {
        setSyncProgress(progress);
        setSyncDays(days);
        setDevices((prev) =>
          prev.map((d) =>
            d.connected
              ? {
                  ...d,
                  syncState: {
                    ...d.syncState,
                    status: "syncing" as SyncStatus,
                    progress,
                    syncedDays: days,
                  },
                }
              : d
          )
        );
      },
      onComplete: (hasError) => {
        cancelSyncRef.current = null;
        if (hasError) {
          const errorMsg =
            "⚠️ 数据同步异常：网络连接不稳定，部分数据未能完成同步。请检查网络后重试。";
          setSyncError(errorMsg);
          setDevices((prev) =>
            prev.map((d) =>
              d.connected
                ? {
                    ...d,
                    syncState: {
                      ...d.syncState,
                      status: "error" as SyncStatus,
                      progress: 100,
                      errorMessage: errorMsg,
                    },
                  }
                : d
            )
          );
          showToast("❌ 同步失败，请重试", "danger");
        } else {
          setSyncError(null);
          setDevices((prev) =>
            prev.map((d) =>
              d.connected
                ? {
                    ...d,
                    syncState: {
                      ...d.syncState,
                      status: "success" as SyncStatus,
                      progress: 100,
                      lastSyncAt: timeStr,
                      syncedDays: TOTAL_DAYS,
                      errorMessage: null,
                    },
                  }
                : d
            )
          );
          showToast(
            `✅ 已完成${TOTAL_DAYS}天数据同步（${connectedCount}个设备）`,
            "success"
          );
        }
        setIsSyncingAll(false);
      },
    });
  }, [connectedCount, connectedDevices, showToast]);

  const retrySync = useCallback(() => {
    setSyncError(null);
    triggerSyncAll();
  }, [triggerSyncAll]);

  const getDataTypeLabel = (key: SyncDataType): string => {
    const found = SYNC_DATA_TYPES.find((t) => t.key === key);
    return found ? `${found.icon} ${found.label}` : key;
  };

  const getStatusText = (status: SyncStatus): string => {
    switch (status) {
      case "syncing":
        return "同步中...";
      case "success":
        return "已同步";
      case "error":
        return "同步失败";
      default:
        return "待同步";
    }
  };

  const getStatusColor = (status: SyncStatus): string => {
    switch (status) {
      case "syncing":
        return "#3b82f6";
      case "success":
        return "#22c55e";
      case "error":
        return "#ef4444";
      default:
        return "#9ca3af";
    }
  };

  return (
    <div>
      <TopNav
        title="设备连接中心"
        action={
          isSyncingAll
            ? { label: "取消", onClick: cancelSync }
            : { label: "🔄 刷新", onClick: () => showToast("刷新中...") }
        }
      />

      <div className="screen-container animate-in">
        {/* ── Sync Error Banner ── */}
        {syncError && (
          <div
            role="alert"
            data-testid="sync-error-banner"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "18px", flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#991b1b",
                  marginBottom: "4px",
                }}
              >
                数据同步异常
              </div>
              <div style={{ fontSize: "13px", color: "#b91c1c", lineHeight: 1.5 }}>
                {syncError}
              </div>
              <Button variant="danger" size="sm" onClick={retrySync} style={{ marginTop: "8px" }}>
                🔄 重新同步
              </Button>
            </div>
          </div>
        )}

        {/* ── Connection Overview ── */}
        <Card style={{ background: "linear-gradient(135deg, #eff6ff, #f0fdf4)", border: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "36px" }}>📡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "16px", fontWeight: 600, color: "#111827" }}>
                已连接{" "}
                <span style={{ color: "#3b82f6", fontSize: "20px" }}>
                  {connectedCount}
                </span>{" "}
                个设备
              </div>
              <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                {connectedCount === 0
                  ? "尚未连接任何设备，请选择品牌进行连接"
                  : `可同步 ${SYNC_DATA_TYPES.length} 种健康数据类型`}
              </div>
            </div>
          </div>

          {/* Sync progress bar when syncing */}
          {isSyncingAll && (
            <div style={{ marginTop: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  fontSize: "13px",
                  color: "#3b82f6",
                  fontWeight: 500,
                }}
              >
                <span>🔄 正在同步最近30天数据...</span>
                <span data-testid="sync-progress-text">
                  {syncDays}/{30} 天
                </span>
              </div>
              <ProgressBar value={syncProgress} color="mid" />
              <div
                style={{
                  fontSize: "11px",
                  color: "#9ca3af",
                  marginTop: "4px",
                  textAlign: "right",
                }}
              >
                预计剩余 {Math.ceil((30 - syncDays) * 1.5)} 秒
              </div>
            </div>
          )}
        </Card>

        {/* ── Device Grid ── */}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#6b7280",
            marginBottom: "10px",
            marginTop: "16px",
          }}
        >
          选择品牌进行连接
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          {devices.map((device) => {
            const isExpanded = expandedDevice === device.id;
            const isSyncing = device.syncState.status === "syncing";

            return (
              <div key={device.id} style={{ position: "relative" }}>
                {/* Device Card */}
                <button
                  onClick={() => toggleDeviceConnection(device.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (device.connected) toggleExpanded(device.id);
                  }}
                  aria-pressed={device.connected}
                  aria-label={`${device.name} - ${device.connected ? "已连接" : "未连接"}`}
                  disabled={isSyncingAll}
                  style={{
                    width: "100%",
                    background: device.connected ? "#f0fdf4" : "#fff",
                    border: `2px solid ${device.connected ? "#22c55e" : "#e5e7eb"}`,
                    borderRadius: "16px",
                    padding: "20px 16px",
                    textAlign: "center",
                    cursor: isSyncingAll ? "not-allowed" : "pointer",
                    transition: "all 150ms ease",
                    fontFamily: "var(--font-sans)",
                    opacity: isSyncingAll ? 0.7 : 1,
                  }}
                >
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>
                    {device.icon}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    {device.name}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      marginTop: "4px",
                      color: device.connected ? "#15803d" : "#9ca3af",
                      fontWeight: device.connected ? 500 : 400,
                    }}
                  >
                    {device.connected ? "✅ 已连接" : "点击连接"}
                  </div>
                  {device.connected && device.syncState.lastSyncAt && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#6b7280",
                        marginTop: "4px",
                      }}
                      data-testid={`last-sync-${device.id}`}
                    >
                      上次同步：{device.syncState.lastSyncAt}
                    </div>
                  )}
                </button>

                {/* Expand toggle for connected devices */}
                {device.connected && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpanded(device.id);
                    }}
                    aria-label={isExpanded ? "收起数据类型选择" : "展开数据类型选择"}
                    aria-expanded={isExpanded}
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      background: "#f3f4f6",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#6b7280",
                    }}
                  >
                    {isExpanded ? "▲" : "⚙"}
                  </button>
                )}

                {/* Expanded data type selection */}
                {isExpanded && device.connected && (
                  <div
                    data-testid={`datatype-panel-${device.id}`}
                    style={{
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderTop: "none",
                      borderRadius: "0 0 16px 16px",
                      padding: "12px",
                      marginTop: "-4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      选择同步数据类型
                    </div>
                    {device.supportedDataTypes.map((dt) => {
                      const info = SYNC_DATA_TYPES.find((t) => t.key === dt);
                      if (!info) return null;
                      const isEnabled = device.syncState.enabledDataTypes.includes(dt);
                      return (
                        <label
                          key={dt}
                          data-testid={`datatype-toggle-${device.id}-${dt}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "6px 0",
                            cursor: isSyncing ? "not-allowed" : "pointer",
                            fontSize: "13px",
                            color: isEnabled ? "#111827" : "#9ca3af",
                            opacity: isSyncing ? 0.6 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleDataType(device.id, dt)}
                            disabled={isSyncing}
                            style={{ accentColor: "#22c55e", width: "16px", height: "16px" }}
                          />
                          <span>
                            {info.icon} {info.label}
                          </span>
                          <span style={{ fontSize: "11px", color: "#9ca3af", marginLeft: "auto" }}>
                            {info.unit}
                          </span>
                        </label>
                      );
                    })}

                    {/* Per-device sync info */}
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "6px 8px",
                        background: "#fff",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: getStatusColor(device.syncState.status),
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{getStatusText(device.syncState.status)}</span>
                      {device.syncState.status === "syncing" && (
                        <ProgressBar
                          value={device.syncState.progress}
                          color="mid"
                          height={4}
                        />
                      )}
                      {device.syncState.status === "success" && device.syncState.syncedDays > 0 && (
                        <span style={{ color: "#6b7280" }}>
                          · {device.syncState.syncedDays}/{device.syncState.totalDays}天
                        </span>
                      )}
                      {device.syncState.status === "error" && (
                        <span style={{ color: "#ef4444" }}>
                          · 同步异常
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Empty state ── */}
        {connectedCount === 0 && (
          <Card style={{ textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>⌚</div>
            <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827", marginBottom: "4px" }}>
              尚未连接设备
            </div>
            <div style={{ fontSize: "13px", color: "#6b7280", lineHeight: 1.5 }}>
              点击上方品牌卡片，授权 HealthGuard 访问您的可穿戴设备健康数据
            </div>
          </Card>
        )}

        {/* ── Sync All Button ── */}
        <div style={{ marginTop: "16px" }}>
          {isSyncingAll ? (
            <Button variant="secondary" onClick={cancelSync} fullWidth>
              ⏹ 取消同步
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={triggerSyncAll}
              disabled={connectedCount === 0}
              fullWidth
            >
              🔄 立即同步数据
            </Button>
          )}
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            textAlign: "center",
            marginTop: "8px",
            marginBottom: "8px",
            lineHeight: 1.5,
          }}
          data-testid="pipl-notice"
        >
          🔒 数据同步遵循PIPL合规，仅采集最少必要数据 · 数据存储于中国境内
          <br />
          本内容由AI生成，仅供参考，不构成医疗诊断或治疗方案
        </p>
      </div>
    </div>
  );
}

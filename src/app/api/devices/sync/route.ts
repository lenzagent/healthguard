/**
 * POST /api/devices/sync — Trigger data sync for connected devices
 *
 * Syncs the past 30 days of health data from connected wearable devices.
 * For MVP: generates realistic mock data simulating device SDK responses.
 *
 * Supports:
 * - Sync all connected devices: { brandId: null }
 * - Sync a specific device: { brandId: "apple" }
 *
 * PIPL compliance:
 * - Only syncs data types the user has explicitly enabled
 * - All data is AES-256-GCM encrypted before storage
 * - Every sync is audit-logged
 *
 * Acceptance criteria:
 * - 30 days of data synced within 3 minutes (target: <60s for mock)
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import { syncDeviceData, DEVICE_BRANDS, type DeviceBrandId, type SyncDataTypeKey } from "@/lib/deviceSyncService";

interface SyncRequestBody {
  brandId?: DeviceBrandId | null; // null = sync all connected devices
  totalDays?: number; // default 30
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as SyncRequestBody;
    const { brandId, totalDays = 30 } = body;

    const ipAddress = getClientIp(request);

    // Fetch connected devices
    const whereClause: Record<string, unknown> = {
      userId: userPayload.sub,
      connected: true,
    };

    if (brandId) {
      if (!DEVICE_BRANDS[brandId]) {
        return apiBadRequest(`未知品牌: ${brandId}`);
      }
      whereClause.brandId = brandId;
    }

    const connectedDevices = await prisma.deviceConnection.findMany({
      where: whereClause,
    });

    if (connectedDevices.length === 0) {
      return apiNotFound("没有已连接的设备可同步");
    }

    // Create sync jobs for each device
    const syncJobs = await Promise.all(
      connectedDevices.map((device: { id: string }) =>
        prisma.syncJob.create({
          data: {
            userId: userPayload.sub,
            deviceId: device.id,
            status: "pending",
            totalDays,
          },
        })
      )
    );

    // Execute sync for each device
    const results = [];
    for (let i = 0; i < connectedDevices.length; i++) {
      const device = connectedDevices[i];
      const job = syncJobs[i];

      // Update device and job status to "syncing"
      await prisma.deviceConnection.update({
        where: { id: device.id },
        data: { syncStatus: "syncing", syncProgress: 0 },
      });

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "in_progress", startedAt: new Date() },
      });

      const syncResult = await syncDeviceData(
        userPayload.sub,
        job.id,
        device.brandId as DeviceBrandId,
        device.enabledDataTypes as SyncDataTypeKey[],
        totalDays,
      );

      // Update device with sync results
      await prisma.deviceConnection.update({
        where: { id: device.id },
        data: {
          syncStatus: syncResult.errors.length === 0 ? "success" : "error",
          syncProgress: 100,
          syncedDays: syncResult.syncedDays,
          lastSyncAt: new Date(),
          syncError: syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null,
        },
      });

      // Complete sync job
      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: syncResult.errors.length === 0 ? "completed" : "failed",
          progress: 100,
          syncedDays: syncResult.syncedDays,
          recordsCreated: syncResult.recordsCreated,
          errorMessage: syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null,
          completedAt: new Date(),
        },
      });

      results.push({
        brandId: device.brandId,
        brandName: device.brandName,
        status: syncResult.errors.length === 0 ? "success" : "error",
        recordsCreated: syncResult.recordsCreated,
        syncedDays: syncResult.syncedDays,
        errors: syncResult.errors,
      });
    }

    // Audit log
    await createAuditLog({
      userId: userPayload.sub,
      action: "api_call",
      resource: "device_sync",
      details: {
        deviceCount: connectedDevices.length,
        totalDays,
        totalRecordsCreated: results.reduce((s, r) => s + r.recordsCreated, 0),
        results,
      },
      ipAddress,
    });

    const totalRecords = results.reduce((s, r) => s + r.recordsCreated, 0);
    const hasErrors = results.some((r) => r.errors.length > 0);

    return apiSuccess(
      {
        devices: results,
        summary: {
          totalDevices: results.length,
          totalRecordsCreated: totalRecords,
          totalDays,
          status: hasErrors ? "partial" : "complete",
        },
      },
    );
  } catch (error) {
    console.error("[Device Sync] Error:", error);
    return apiBadRequest("同步失败，请重试");
  }
}

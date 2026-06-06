/**
 * API /api/devices — Device connection management
 *
 * GET  — List all device brands with connection state for current user
 * POST — Connect/disconnect a device or update data type preferences
 *
 * PIPL compliance: all device operations are audit-logged.
 * Data minimization: users must explicitly enable each data type.
 */

import type { NextRequest } from "next/server";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";
import {
  getUserDevices,
  connectDevice,
  disconnectDevice,
  updateDeviceDataTypes,
  type DeviceBrandId,
  type SyncDataTypeKey,
} from "@/lib/deviceSyncService";
import { DEVICE_BRANDS } from "@/lib/deviceSyncService";

// Valid brand IDs for validation
const VALID_BRANDS = Object.keys(DEVICE_BRANDS) as DeviceBrandId[];

// ─── GET: List all devices ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const devices = await getUserDevices(userPayload.sub);

    const ipAddress = getClientIp(request);
    await createAuditLog({
      userId: userPayload.sub,
      action: "data_access",
      resource: "device_connections",
      details: { count: devices.length },
      ipAddress,
    });

    return apiSuccess({ devices });
  } catch (error) {
    console.error("[Devices GET] Error:", error);
    return apiBadRequest("获取设备列表失败");
  }
}

// ─── POST: Connect / Disconnect / Update ──────────────────────────────

interface DeviceActionBody {
  action: "connect" | "disconnect" | "update-types";
  brandId: DeviceBrandId;
  enabledDataTypes?: SyncDataTypeKey[];
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as DeviceActionBody;
    const { action, brandId, enabledDataTypes } = body;

    // Validate brand
    if (!brandId || !VALID_BRANDS.includes(brandId)) {
      return apiBadRequest(
        `无效的品牌ID。支持的品牌: ${VALID_BRANDS.join(", ")}`
      );
    }

    const ipAddress = getClientIp(request);

    switch (action) {
      case "connect": {
        const result = await connectDevice(userPayload.sub, brandId);

        await createAuditLog({
          userId: userPayload.sub,
          action: "consent_change",
          resource: "device_connection",
          resourceId: result.id,
          details: { brandId, action: "connect" },
          ipAddress,
        });

        return apiSuccess(result);
      }

      case "disconnect": {
        const result = await disconnectDevice(userPayload.sub, brandId);

        await createAuditLog({
          userId: userPayload.sub,
          action: "consent_change",
          resource: "device_connection",
          resourceId: result.id,
          details: { brandId, action: "disconnect" },
          ipAddress,
        });

        return apiSuccess(result);
      }

      case "update-types": {
        if (!enabledDataTypes || !Array.isArray(enabledDataTypes)) {
          return apiBadRequest("enabledDataTypes 必须是一个数组");
        }

        const result = await updateDeviceDataTypes(
          userPayload.sub,
          brandId,
          enabledDataTypes as SyncDataTypeKey[],
        );

        await createAuditLog({
          userId: userPayload.sub,
          action: "consent_change",
          resource: "device_connection",
          details: {
            brandId,
            action: "update-types",
            enabledDataTypes,
          },
          ipAddress,
        });

        return apiSuccess(result);
      }

      default:
        return apiBadRequest(
          `无效的操作: ${action}。支持的操作: connect, disconnect, update-types`
        );
    }
  } catch (error) {
    console.error("[Devices POST] Error:", error);
    return apiBadRequest("操作失败，请重试");
  }
}

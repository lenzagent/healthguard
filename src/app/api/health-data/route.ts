/**
 * GET /api/health-data — List health records for current user
 * POST /api/health-data — Create a new health record (encrypted at rest)
 *
 * All health data is AES-256-GCM encrypted before storage.
 * Every access is audit logged (PIPL compliance).
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { encryptHealthData, decryptHealthData } from "@/lib/crypto/encryption";
import {
  apiSuccess,
  apiCreated,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

// Valid health data types
const VALID_DATA_TYPES = [
  "heart_rate",
  "blood_pressure",
  "spo2",
  "steps",
  "sleep",
  "weight",
  "blood_glucose",
  "temperature",
  "ecg",
] as const;

type HealthDataType = (typeof VALID_DATA_TYPES)[number];

// ─── GET: List health records ────────────────────────────────────────

export async function GET(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const url = request.nextUrl;
  const dataType = url.searchParams.get("dataType") as HealthDataType | null;
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  // Build query
  const where: Record<string, unknown> = { userId: userPayload.sub };

  if (dataType && VALID_DATA_TYPES.includes(dataType)) {
    where.dataType = dataType;
  }

  if (startDate || endDate) {
    where.recordedAt = {};
    if (startDate) (where.recordedAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.recordedAt as Record<string, unknown>).lte = new Date(endDate);
  }

  const [records, total] = await Promise.all([
    prisma.healthRecord.findMany({
      where,
      orderBy: { recordedAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true,
        dataType: true,
        source: true,
        recordedAt: true,
        createdAt: true,
        // Do NOT return encryptedData/iv/authTag by default
        // Use GET /api/health-data/[id] for decrypted data
      },
    }),
    prisma.healthRecord.count({ where }),
  ]);

  // Audit log
  const ipAddress = getClientIp(request);
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_access",
    resource: "health_records",
    details: {
      count: records.length,
      dataType: dataType ?? "all",
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      offset,
      limit,
    },
    ipAddress,
  });

  return apiSuccess({
    records,
    pagination: {
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    },
  });
}

// ─── POST: Create health record ──────────────────────────────────────

interface CreateHealthRecordBody {
  dataType: HealthDataType;
  data: Record<string, unknown>; // The actual health measurement data
  source: string; // "apple_health" | "huawei_health" | "xiaomi" | "manual" | "rPPG"
  recordedAt: string; // ISO 8601 timestamp of when measurement was taken
}

export async function POST(request: NextRequest) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  try {
    const body = (await request.json()) as CreateHealthRecordBody;
    const { dataType, data, source, recordedAt } = body;

    // Validate data type
    if (!dataType || !VALID_DATA_TYPES.includes(dataType as typeof VALID_DATA_TYPES[number])) {
      return apiBadRequest(`Invalid dataType. Must be one of: ${VALID_DATA_TYPES.join(", ")}`);
    }

    // Validate data
    if (!data || typeof data !== "object") {
      return apiBadRequest("Health data object is required.");
    }

    // Validate source
    const validSources = ["apple_health", "huawei_health", "xiaomi", "manual", "rPPG"];
    if (!source || !validSources.includes(source)) {
      return apiBadRequest(`Invalid source. Must be one of: ${validSources.join(", ")}`);
    }

    // Encrypt the health data
    const plaintext = JSON.stringify(data);
    const encrypted = await encryptHealthData(plaintext);

    // Store encrypted record
    const record = await prisma.healthRecord.create({
      data: {
        userId: userPayload.sub,
        dataType,
        encryptedData: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        source,
        recordedAt: new Date(recordedAt),
      },
    });

    const ipAddress = getClientIp(request);

    // Audit log
    await createAuditLog({
      userId: userPayload.sub,
      action: "data_create",
      resource: "health_record",
      resourceId: record.id,
      details: { dataType, source },
      ipAddress,
    });

    return apiCreated({
      id: record.id,
      dataType: record.dataType,
      source: record.source,
      recordedAt: record.recordedAt,
      createdAt: record.createdAt,
    });
  } catch (error) {
    console.error("[HealthData POST] Error:", error);
    return apiBadRequest("Failed to create health record.");
  }
}

/**
 * GET /api/health-data/[id] — Get a single health record with decrypted data
 * PATCH /api/health-data/[id] — Update a health record
 * DELETE /api/health-data/[id] — Delete a health record
 *
 * All access is audit logged for PIPL compliance.
 */

import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { authenticateRequest, requireAuth, getClientIp } from "@/lib/middleware/auth";
import { encryptHealthData, decryptHealthData } from "@/lib/crypto/encryption";
import {
  apiSuccess,
  apiBadRequest,
  apiUnauthorized,
  apiNotFound,
} from "@/lib/api/response";
import { createAuditLog } from "@/lib/audit/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const { id } = await params;

  const record = await prisma.healthRecord.findUnique({
    where: { id },
  });

  if (!record || record.userId !== userPayload.sub) {
    return apiNotFound("Health record not found.");
  }

  // Decrypt the health data
  let decryptedData: unknown;
  try {
    const plaintext = await decryptHealthData({
      ciphertext: record.encryptedData,
      iv: record.iv,
      authTag: record.authTag,
    });
    decryptedData = JSON.parse(plaintext);
  } catch (error) {
    console.error("[HealthData GET] Decryption failed:", error);
    return apiBadRequest("Failed to decrypt health record.");
  }

  const ipAddress = getClientIp(request);

  // Audit log for sensitive data access
  await createAuditLog({
    userId: userPayload.sub,
    action: "data_access",
    resource: "health_record",
    resourceId: id,
    details: { dataType: record.dataType, operation: "read_decrypted" },
    ipAddress,
  });

  return apiSuccess({
    id: record.id,
    dataType: record.dataType,
    source: record.source,
    recordedAt: record.recordedAt,
    createdAt: record.createdAt,
    data: decryptedData,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const { id } = await params;

  // Check ownership
  const existing = await prisma.healthRecord.findUnique({ where: { id } });
  if (!existing || existing.userId !== userPayload.sub) {
    return apiNotFound("Health record not found.");
  }

  try {
    const body = await request.json();
    const { data } = body;

    if (!data || typeof data !== "object") {
      return apiBadRequest("Health data object is required for update.");
    }

    // Re-encrypt updated data
    const plaintext = JSON.stringify(data);
    const encrypted = await encryptHealthData(plaintext);

    const record = await prisma.healthRecord.update({
      where: { id },
      data: {
        encryptedData: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
      },
    });

    const ipAddress = getClientIp(request);

    await createAuditLog({
      userId: userPayload.sub,
      action: "data_update",
      resource: "health_record",
      resourceId: id,
      details: { dataType: record.dataType, operation: "update" },
      ipAddress,
    });

    return apiSuccess({
      id: record.id,
      dataType: record.dataType,
      source: record.source,
      recordedAt: record.recordedAt,
      updatedAt: record.createdAt,
    });
  } catch (error) {
    console.error("[HealthData PATCH] Error:", error);
    return apiBadRequest("Failed to update health record.");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userPayload = await authenticateRequest(request);
  try {
    requireAuth(userPayload);
  } catch (err) {
    return apiUnauthorized();
  }

  const { id } = await params;

  const existing = await prisma.healthRecord.findUnique({ where: { id } });
  if (!existing || existing.userId !== userPayload.sub) {
    return apiNotFound("Health record not found.");
  }

  await prisma.healthRecord.delete({ where: { id } });

  const ipAddress = getClientIp(request);

  await createAuditLog({
    userId: userPayload.sub,
    action: "data_delete",
    resource: "health_record",
    resourceId: id,
    details: { dataType: existing.dataType, operation: "delete" },
    ipAddress,
  });

  return apiSuccess({ deleted: true });
}

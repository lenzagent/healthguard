/**
 * Audit Logging Service
 *
 * PIPL-compliant data access audit trail.
 * Logs all access to health data, authentication events, and consent changes.
 */

import { prisma } from "@/lib/db/prisma";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "token_refresh"
  | "data_access"
  | "data_create"
  | "data_update"
  | "data_delete"
  | "data_export"
  | "consent_change"
  | "consent_granted"
  | "consent_withdrawn"
  | "report_upload"
  | "profile_update"
  | "api_call";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (error) {
    // Log to console but don't block the main operation
    console.error("[AuditLog] Failed to create audit entry:", error);
  }
}

/**
 * Create a consent record for PIPL compliance.
 */
export async function recordConsent(
  userId: string,
  consentType: string,
  granted: boolean,
  version: string,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.consentRecord.create({
      data: {
        userId,
        consentType,
        granted,
        version,
        ipAddress: ipAddress ?? null,
      },
    });

    // Also update the user's consent flags
    if (consentType === "privacy_policy" && granted) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          privacyConsentGiven: true,
          privacyConsentAt: new Date(),
          consentVersion: version,
        },
      });
    } else if (consentType === "data_processing" && granted) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          dataProcessingConsent: true,
          dataProcessingConsentAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error("[AuditLog] Failed to record consent:", error);
  }
}

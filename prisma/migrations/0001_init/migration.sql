-- HealthGuard Initial Schema Migration
-- PostgreSQL - PIPL-compliant data architecture
-- All health data encrypted at rest with AES-256-GCM

-- ─── User & Authentication ───────────────────────────────────────────

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "wechatOpenId" TEXT,
    "wechatUnionId" TEXT,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "privacyConsentGiven" BOOLEAN NOT NULL DEFAULT false,
    "privacyConsentAt" TIMESTAMP(3),
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsentAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_wechatOpenId_key" ON "User"("wechatOpenId");
CREATE UNIQUE INDEX "User_wechatUnionId_key" ON "User"("wechatUnionId");
CREATE INDEX "User_phone_idx" ON "User"("phone");
CREATE INDEX "User_wechatOpenId_idx" ON "User"("wechatOpenId");

-- ─── Sessions ─────────────────────────────────────────────────────────

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Session_refreshToken_key" ON "Session"("refreshToken");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_token_idx" ON "Session"("token");
CREATE INDEX "Session_refreshToken_idx" ON "Session"("refreshToken");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Verification Codes ───────────────────────────────────────────────

CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VerificationCode_phone_code_idx" ON "VerificationCode"("phone", "code");
CREATE INDEX "VerificationCode_expiresAt_idx" ON "VerificationCode"("expiresAt");

ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Health Data (encrypted at rest) ──────────────────────────────────

CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthRecord_userId_dataType_idx" ON "HealthRecord"("userId", "dataType");
CREATE INDEX "HealthRecord_userId_recordedAt_idx" ON "HealthRecord"("userId", "recordedAt");
CREATE INDEX "HealthRecord_recordedAt_idx" ON "HealthRecord"("recordedAt");

ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Audit & Compliance ──────────────────────────────────────────────

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentRecord_userId_consentType_idx" ON "ConsentRecord"("userId", "consentType");

ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Health Score ────────────────────────────────────────────────────

CREATE TABLE "HealthScoreRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "factors" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthScoreRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HealthScoreRecord_userId_createdAt_idx" ON "HealthScoreRecord"("userId", "createdAt");

-- ─── M1: Device Connections & Sync ────────────────────────────────────

CREATE TABLE "DeviceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "connected" BOOLEAN NOT NULL DEFAULT true,
    "enabledDataTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "syncProgress" INTEGER NOT NULL DEFAULT 0,
    "syncedDays" INTEGER NOT NULL DEFAULT 0,
    "totalDays" INTEGER NOT NULL DEFAULT 30,
    "syncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DeviceConnection_userId_brandId_key" ON "DeviceConnection"("userId", "brandId");
CREATE INDEX "DeviceConnection_userId_idx" ON "DeviceConnection"("userId");
CREATE INDEX "DeviceConnection_syncStatus_idx" ON "DeviceConnection"("syncStatus");

ALTER TABLE "DeviceConnection" ADD CONSTRAINT "DeviceConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "syncedDays" INTEGER NOT NULL DEFAULT 0,
    "totalDays" INTEGER NOT NULL DEFAULT 30,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncJob_userId_createdAt_idx" ON "SyncJob"("userId", "createdAt");
CREATE INDEX "SyncJob_deviceId_idx" ON "SyncJob"("deviceId");
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "DeviceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── S1: Medical Reports ──────────────────────────────────────────────

CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "hospital" TEXT,
    "ocrAccuracy" DOUBLE PRECISION,
    "thumbnailUrl" TEXT,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "encryptedData" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "aiSummary" TEXT,
    "aiRecommendations" TEXT,
    "wearableCorrelationSummary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_userId_examDate_idx" ON "Report"("userId", "examDate");
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");
CREATE INDEX "Report_status_idx" ON "Report"("status");

ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReportIndicator" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "range" TEXT NOT NULL,
    "unit" TEXT,
    "status" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "interpretation" TEXT,
    "wearableCorrelation" TEXT,
    "recommendation" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReportIndicator_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportIndicator_reportId_idx" ON "ReportIndicator"("reportId");
CREATE INDEX "ReportIndicator_reportId_category_idx" ON "ReportIndicator"("reportId", "category");

ALTER TABLE "ReportIndicator" ADD CONSTRAINT "ReportIndicator_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ReportConsent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consentType" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawnAt" TIMESTAMP(3),

    CONSTRAINT "ReportConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportConsent_reportId_consentType_key" ON "ReportConsent"("reportId", "consentType");
CREATE INDEX "ReportConsent_userId_idx" ON "ReportConsent"("userId");

ALTER TABLE "ReportConsent" ADD CONSTRAINT "ReportConsent_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

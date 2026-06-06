/**
 * HealthGuard Library Barrel Exports
 */

// Auth
export { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "./auth/jwt";
export type { JwtPayload, RefreshPayload } from "./auth/jwt";

export {
  generateVerificationCode,
  sendSmsCode,
  isValidChinesePhone,
  formatPhone,
} from "./auth/sms";

export { exchangeWeChatCode, getWeChatUserInfo } from "./auth/wechat";
export type { WeChatAccessTokenResponse, WeChatUserInfo } from "./auth/wechat";

// Crypto
export { encryptHealthData, decryptHealthData } from "./crypto/encryption";
export type { EncryptedData } from "./crypto/encryption";

// API
export {
  apiSuccess,
  apiCreated,
  apiNoContent,
  apiBadRequest,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiConflict,
  apiTooManyRequests,
  apiInternalError,
  apiValidationError,
} from "./api/response";
export type { ApiErrorBody } from "./api/response";

// Middleware
export { authenticateRequest, requireAuth, getClientIp } from "./middleware/auth";
export type { AuthenticatedRequest } from "./middleware/auth";
export { checkAuthRateLimit, checkApiRateLimit, checkRateLimit, getRateLimitStatus } from "./middleware/rateLimit";

// Audit
export { createAuditLog, recordConsent } from "./audit/logger";
export type { AuditLogEntry, AuditAction } from "./audit/logger";

// DB
export { prisma } from "./db/prisma";

// OCR & Report AI
export { processReportOcr, validateReportFile, estimatePageCount } from "./ocr";
export type { OcrRequest, OcrResult, ExtractedIndicator } from "./ocr";

export { interpretIndicators, analyzeTrends } from "./reportAi";
export type {
  InterpretationRequest,
  InterpretationResult,
  TrendInterpretationRequest,
  TrendInterpretationResult,
} from "./reportAi";

// Health Score Engine (M2)
export { computeHealthScore, MIN_DATA_DAYS, DIMENSION_WEIGHTS, DIMENSION_META } from "./healthScoreEngine";

// Device Sync (M1)
export {
  getUserDevices,
  connectDevice,
  disconnectDevice,
  updateDeviceDataTypes,
  syncDeviceData,
  DEVICE_BRANDS,
} from "./deviceSyncService";
export type { DeviceBrandId, SyncDataTypeKey } from "./deviceSyncService";

export type { DeviceApiResponse, SyncResponse } from "./deviceApiClient";

// Alert Service (M4)
// Alert Service (M4)
export {
  processAnomalies,
  resolveInactiveAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  dismissAlert,
  clearResolvedAlerts,
  getAlerts,
  getAlertStats,
  hasActiveRedAlert,
  getPendingPushAlerts,
  markPushSent,
  buildPushPayload,
  generateMockAlertHistory,
} from "./alertService";

// Types
export * from "./types";

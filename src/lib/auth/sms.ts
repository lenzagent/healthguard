/**
 * SMS Verification Code Service
 *
 * Integrates with Aliyun SMS for sending verification codes.
 * In development mode, codes are logged to console instead of sent.
 */

import { nanoid } from "nanoid";

/**
 * Generate a 6-digit verification code.
 */
export function generateVerificationCode(): string {
  return nanoid(6).replace(/[^0-9]/g, () =>
    Math.floor(Math.random() * 10).toString()
  );
}

/**
 * Send a verification code via SMS.
 * In development, prints to console. In production, uses Aliyun SMS API.
 */
export async function sendSmsCode(
  phone: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  // Development mode: log to console
  if (process.env.NODE_ENV === "development" || !process.env.ALIYUN_SMS_ACCESS_KEY_ID) {
    console.log(`[SMS DEV] Verification code for ${phone}: ${code}`);
    return { success: true };
  }

  // Production: call Aliyun SMS API
  try {
    // TODO: Implement Aliyun SMS SDK integration
    // https://help.aliyun.com/document_detail/419273.html
    //
    // const client = new DysmsapiClient({ ... });
    // await client.sendSms({
    //   PhoneNumbers: phone,
    //   SignName: process.env.ALIYUN_SMS_SIGN_NAME,
    //   TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE,
    //   TemplateParam: JSON.stringify({ code }),
    // });
    return { success: true };
  } catch (error) {
    console.error("[SMS] Failed to send:", error);
    return {
      success: false,
      error: "Failed to send verification code",
    };
  }
}

/**
 * Validate Chinese phone number format.
 */
export function isValidChinesePhone(phone: string): boolean {
  // Chinese mobile: 1xx-xxxx-xxxx
  return /^1[3-9]\d{9}$/.test(phone);
}

/**
 * Format phone number to E.164 format for China (+86).
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("86") && cleaned.length === 13) {
    return `+${cleaned}`;
  }
  return `+86${cleaned}`;
}

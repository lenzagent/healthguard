/**
 * SMS Service Tests
 */

import { describe, it, expect } from "vitest";
import {
  generateVerificationCode,
  isValidChinesePhone,
  formatPhone,
} from "@/lib/auth/sms";

describe("Verification Code Generation", () => {
  it("should generate a 6-digit code", () => {
    const code = generateVerificationCode();
    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);
  });

  it("should generate different codes each time", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateVerificationCode()));
    // Very unlikely to have collisions in 20 generations
    expect(codes.size).toBeGreaterThanOrEqual(18);
  });
});

describe("Phone Number Validation", () => {
  it("should accept valid Chinese mobile numbers", () => {
    expect(isValidChinesePhone("13800138000")).toBe(true);
    expect(isValidChinesePhone("15912345678")).toBe(true);
    expect(isValidChinesePhone("18600001111")).toBe(true);
    expect(isValidChinesePhone("19912345678")).toBe(true);
  });

  it("should reject invalid phone numbers", () => {
    expect(isValidChinesePhone("12345678901")).toBe(false); // starts with 1 but 2 is not valid
    expect(isValidChinesePhone("1380013800")).toBe(false); // 10 digits
    expect(isValidChinesePhone("138001380000")).toBe(false); // 12 digits
    expect(isValidChinesePhone("abc")).toBe(false);
    expect(isValidChinesePhone("")).toBe(false);
    expect(isValidChinesePhone("+8613800138000")).toBe(false); // includes prefix
  });

  it("should reject phone numbers starting with invalid prefix", () => {
    expect(isValidChinesePhone("12000138000")).toBe(false); // 120 - emergency
    expect(isValidChinesePhone("11000138000")).toBe(false); // 110
  });
});

describe("Phone Number Formatting", () => {
  it("should format phone to E.164 format", () => {
    expect(formatPhone("13800138000")).toBe("+8613800138000");
  });

  it("should handle numbers with existing prefix", () => {
    expect(formatPhone("+8613800138000")).toBe("+8613800138000");
    expect(formatPhone("8613800138000")).toBe("+8613800138000");
  });

  it("should strip non-digit characters", () => {
    expect(formatPhone("138-0013-8000")).toBe("+8613800138000");
    expect(formatPhone("138 0013 8000")).toBe("+8613800138000");
  });
});

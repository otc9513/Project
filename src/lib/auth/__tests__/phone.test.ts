import { describe, it, expect } from "vitest";
import { normalizeAndValidateIraqiPhone } from "../phone";

describe("normalizeAndValidateIraqiPhone", () => {
  it("يطبّع صيغة محلية 07XXXXXXXXX إلى E.164", () => {
    expect(normalizeAndValidateIraqiPhone("07701234567")).toEqual({
      ok: true,
      normalized: "+9647701234567",
    });
    expect(normalizeAndValidateIraqiPhone("07501234567")).toEqual({
      ok: true,
      normalized: "+9647501234567",
    });
  });

  it("يقبل الصيغة الدولية الجاهزة +964 دون تغييرها", () => {
    expect(normalizeAndValidateIraqiPhone("+9647701234567")).toEqual({
      ok: true,
      normalized: "+9647701234567",
    });
  });

  it("يقبل مسافات/شرطات شائعة في الإدخال", () => {
    expect(normalizeAndValidateIraqiPhone("077 0123 4567")).toEqual({
      ok: true,
      normalized: "+9647701234567",
    });
  });

  it("يرفض رقمًا ناقصًا", () => {
    const result = normalizeAndValidateIraqiPhone("0770123456");
    expect(result.ok).toBe(false);
  });

  it("يرفض رقمًا زائدًا", () => {
    const result = normalizeAndValidateIraqiPhone("077012345678");
    expect(result.ok).toBe(false);
  });

  it("يرفض رقمًا يحتوي أحرفًا", () => {
    const result = normalizeAndValidateIraqiPhone("0770abc4567");
    expect(result.ok).toBe(false);
  });

  it("يرفض رقمًا غير عراقي (مثال: سعودي +966)", () => {
    const result = normalizeAndValidateIraqiPhone("+966501234567");
    expect(result.ok).toBe(false);
  });

  it("يطبّع رقمين مختلفين الصياغة لنفس الرقم إلى نفس القيمة (منع الحساب المزدوج)", () => {
    const a = normalizeAndValidateIraqiPhone("07701234567");
    const b = normalizeAndValidateIraqiPhone("+9647701234567");
    expect(a.ok && b.ok && a.normalized === b.normalized).toBe(true);
  });
});

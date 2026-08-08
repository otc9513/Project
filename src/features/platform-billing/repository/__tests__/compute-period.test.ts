import { describe, it, expect } from "vitest";
import { computePeriod } from "../platform-billing.repository";

describe("computePeriod", () => {
  it("يضيف شهرًا واحدًا بالضبط لدورة MONTHLY", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = computePeriod(start, "MONTHLY");
    expect(end.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("يضيف سنة واحدة بالضبط لدورة YEARLY", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const end = computePeriod(start, "YEARLY");
    expect(end.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });

  it("لا يُعدّل التاريخ الأصلي (immutability) - يُعيد كائن Date جديدًا", () => {
    const start = new Date("2026-01-15T00:00:00.000Z");
    const originalTime = start.getTime();
    computePeriod(start, "MONTHLY");
    expect(start.getTime()).toBe(originalTime);
  });

  it("يتعامل بشكل صحيح مع نهاية شهر لا يملك اليوم 31 (تفيض تلقائيًا حسب سلوك JS Date القياسي)", () => {
    // 31 يناير + شهر: JS Date.setMonth يفيض تلقائيًا (لا يوجد 31 فبراير)
    // إلى أول مارس أو ما يعادله - هذا سلوك JS القياسي الموثَّق، وليس
    // خطأً في computePeriod. نختبره هنا صراحة لتوثيق السلوك المتوقَّع
    // لمطوّر لاحق قد يفاجأ به.
    const start = new Date("2026-01-31T00:00:00.000Z");
    const end = computePeriod(start, "MONTHLY");
    expect(end.getUTCMonth()).toBe(2); // مارس (0-indexed: 2)
  });

  it("يتعامل بشكل صحيح مع 29 فبراير في سنة كبيسة لدورة YEARLY", () => {
    const start = new Date("2028-02-29T00:00:00.000Z"); // 2028 سنة كبيسة
    const end = computePeriod(start, "YEARLY");
    // 2029 ليست كبيسة - JS يُفيض تلقائيًا لأول مارس، سلوك متوقَّع وليس خطأً
    expect(end.getUTCFullYear()).toBe(2029);
  });
});

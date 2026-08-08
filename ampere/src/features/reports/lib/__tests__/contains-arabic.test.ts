import { describe, it, expect } from "vitest";
import { containsArabic } from "../arabic-shaping";

describe("containsArabic", () => {
  it("يكتشف نصًا عربيًا خالصًا", () => {
    expect(containsArabic("مرحبا")).toBe(true);
  });

  it("يكتشف نصًا مختلطًا عربي/إنجليزي (اسم مستأجر شائع في هذا المنتج)", () => {
    expect(containsArabic("مولدات الفرات - Al-Furat Generators")).toBe(true);
  });

  it("لا يكتشف نصًا إنجليزيًا/أرقامًا خالصة", () => {
    expect(containsArabic("Invoice #1234")).toBe(false);
  });

  it("لا يكتشف نصًا فارغًا", () => {
    expect(containsArabic("")).toBe(false);
  });
});

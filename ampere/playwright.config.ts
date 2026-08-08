import { defineConfig, devices } from "@playwright/test";

/**
 * ⚠️ لم يُشغَّل أي اختبار E2E فعليًا في هذه الجلسة (لا build، لا خادم
 * dev شغّال، لا اتصال قاعدة بيانات). راجع e2e/README.md للمتطلبات
 * الكاملة قبل تشغيل `npm run test:e2e` فعليًا لأول مرة.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // e2e/global-setup.ts يُنشئ بيانات مشتركة (مستخدمون بأدوار ثابتة) - التوازي الكامل قد يُنتج تضاربًا
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // في CI: يشغّل خادم dev تلقائيًا قبل الاختبارات. محليًا: شغّل npm run dev يدويًا أولًا (أسرع للتكرار).
  webServer: process.env.CI
    ? {
        command: "npm run start",
        url: "http://localhost:3000",
        timeout: 120_000,
        reuseExistingServer: false,
      }
    : undefined,
});

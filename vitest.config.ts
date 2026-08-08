import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    // يمسح سجل استدعاءات كل vi.fn() (عدد المرات، الوسائط) قبل كل اختبار
    // تلقائيًا - ضروري لأي ملف اختبار يُنشئ vi.fn() محليًا (خارج تمويه
    // Prisma المركزي في setup.ts) ويتحقق من عدد استدعاءاته، كما في
    // src/lib/platform/__tests__/mfa-gate.test.ts.
    clearMocks: true,
    // اختبارات E2E عبر Playwright منفصلة تمامًا (playwright.config.ts) -
    // لا تُشغَّل هنا لتفادي تعارض بيئتي التشغيل.
    exclude: ["e2e/**", "node_modules/**"],
  },
});

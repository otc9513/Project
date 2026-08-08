import type { Config } from "tailwindcss";

/**
 * الألوان معرّفة كمتغيرات CSS (--color-primary...) بدلاً من قيم ثابتة
 * لأن Super Admin يمكنه تغييرها ديناميكيًا من لوحة White-Label (المرحلة 8).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-error)",
      },
      fontFamily: {
        arabic: ["var(--font-arabic)", "sans-serif"],
        english: ["var(--font-english)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#2563eb",
        "brand-dark": "#1d4ed8",
        "surface-muted": "#f8fafc",
        "surface-border": "#e2e8f0",
        "text-primary": "#0f172a",
        "text-secondary": "#475569",
        "text-muted": "#94a3b8",
        "positive": "#16a34a",
        "positive-bg": "#f0fdf4",
        "positive-border": "#bbf7d0",
        "negative": "#dc2626",
        "negative-bg": "#fef2f2",
        "negative-border": "#fecaca",
        "warning": "#d97706",
        "warning-bg": "#fffbeb",
        "warning-border": "#fde68a",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

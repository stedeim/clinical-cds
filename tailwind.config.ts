import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm-paper palette — mirrors src/lib/ui/tokens.ts (v2 design).
        canvas: "#F1F0EB",
        ink: "#211f19",
        body: "#2c2a25",
        clinical: "#4E6B57",
        caution: "#6f5410",
        danger: "#8f3325",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

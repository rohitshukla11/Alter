import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /** Main background (#080808) — not named `base` to avoid clashing with `text-base` font size */
        void: "#080808",
        raised: "#111110",
        overlay: "#1A1A18",
        subtle: "#222220",
        accent: "#E8FF5A",
        dim: "rgba(255,255,255,0.06)",
        mid: "rgba(255,255,255,0.10)",
        strong: "rgba(255,255,255,0.18)",
        primary: "#F2F0EB",
        secondary: "#8C8A85",
        tertiary: "#4A4845",
        success: "#4ADE80",
        error: "#F87171",
        pending: "#FCD34D",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      maxWidth: {
        subtitle: "560px",
      },
      spacing: {
        sidebar: "64px",
      },
      borderRadius: {
        ui: "6px",
        control: "4px",
      },
    },
  },
  plugins: [],
};

export default config;

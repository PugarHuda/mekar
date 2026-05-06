import type { Config } from "tailwindcss";

/**
 * Tailwind theme — Mekar "Indonesian Garden" cream palette.
 * Tokens mirror the locked Stitch handoff at .stitch-design/handoff/styles.css.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        md: "2.5rem",
        lg: "5rem",
      },
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        // Raw palette
        cream: {
          DEFAULT: "#f7f1e6",
          deep: "#ede4d1",
        },
        gold: {
          DEFAULT: "#d4a437",
          deep: "#b8881e",
        },
        pink: {
          DEFAULT: "#f5b7a0",
          deep: "#e8957c",
        },
        forest: {
          DEFAULT: "#1c3b2f",
          soft: "#284a3c",
        },
        cocoa: {
          DEFAULT: "#3d2817",
          soft: "#5a3f2a",
        },
        tea: "#6b8a4b",
        coral: "#c25a4a",
        espresso: "#1a140e",

        // Semantic roles (driven by CSS vars so palette swaps stay easy)
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        rule: "var(--rule)",
        "rule-soft": "var(--rule-soft)",
        primary: "var(--primary)",
        "primary-deep": "var(--primary-deep)",
        accent: "var(--accent)",
        dark: "var(--dark)",

        // ShadCN-shaped helpers (kept for any imported component)
        background: "var(--bg)",
        foreground: "var(--ink)",
        border: "var(--rule)",
        ring: "var(--primary)",
        muted: {
          DEFAULT: "var(--bg-alt)",
          foreground: "var(--ink-soft)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--ink)",
        },
        destructive: {
          DEFAULT: "#c25a4a",
          foreground: "#fbf6ec",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        sans: ["var(--font-body)", "Manrope", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
      maxWidth: {
        prose: "62ch",
        page: "1320px",
      },
      borderRadius: {
        DEFAULT: "6px",
        md: "4px",
        lg: "6px",
        xl: "12px",
      },
      boxShadow: {
        paper: "0 1px 0 rgba(61, 40, 23, 0.04), 0 16px 48px -28px rgba(61, 40, 23, 0.25)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "rise": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "petal-drift": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "0.7" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateY(40px) rotate(180deg)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 600ms ease-out both",
        rise: "rise 600ms cubic-bezier(0.2, 0.7, 0.1, 1) both",
        "petal-drift": "petal-drift 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

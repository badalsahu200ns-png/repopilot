/* RepoPilot 2.0 — Tailwind Config */
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        surface: {
          base:        "#0a0d14",
          elevated:    "#0f1320",
          card:        "#141928",
          overlay:     "#1a2035",
          interactive: "#1e2540",
        },
      },
      animation: {
        "fade-in":    "fadeIn 0.25s ease-out forwards",
        "slide-up":   "slideUp 0.25s ease-out forwards",
        "scale-in":   "scaleIn 0.15s ease-out forwards",
        "bob-pulse":  "bobPulse 2s ease-in-out infinite",
        "shimmer":    "shimmer 1.5s infinite",
        "spin-slow":  "spin 3s linear infinite",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        scaleIn:   { from: { opacity: "0", transform: "scale(0.96)" }, to: { opacity: "1", transform: "scale(1)" } },
        bobPulse:  { "0%, 100%": { boxShadow: "0 0 6px rgba(74,144,255,0.8)" }, "50%": { boxShadow: "0 0 16px rgba(74,144,255,1)" } },
        shimmer:   { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
      },
      backgroundImage: {
        "gradient-radial":  "radial-gradient(var(--tw-gradient-stops))",
        "grid-dark":        "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-lg": "64px 64px",
        "grid-md": "32px 32px",
      },
    },
  },
  plugins: [],
};

export default config;

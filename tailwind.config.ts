import type { Config } from "tailwindcss";

// Semantic status scales remapped to the brand palette so legacy utility classes stay on-brand.
// success -> Virtus Black/neutral, warning -> Spark Yellow, danger -> Ember Orange, info -> Earth Brown.
const success = {
  50: "#F4F4F4", 100: "#E5E5E5", 200: "#CCCCCC", 300: "#999999", 400: "#666666",
  500: "#000000", 600: "#000000", 700: "#000000", 800: "#000000", 900: "#000000", 950: "#000000",
};
const warning = {
  50: "#FEF6D4", 100: "#FDEDA9", 200: "#FDE47D", 300: "#FCDB52", 400: "#FBD227",
  500: "#FBD227", 600: "#000000", 700: "#000000", 800: "#000000", 900: "#000000", 950: "#1C1C1C",
};
const danger = {
  50: "#FBF1EA", 100: "#F8E3D6", 200: "#F1C7AC", 300: "#EBAA83", 400: "#DD7230",
  500: "#DD7230", 600: "#854D27", 700: "#000000", 800: "#000000", 900: "#000000", 950: "#1C1C1C",
};
const info = {
  50: "#F4EEEA", 100: "#E7DBD4", 200: "#CEB8A9", 300: "#B6947D", 400: "#9D7152",
  500: "#854D27", 600: "#854D27", 700: "#854D27", 800: "#6B3D1F", 900: "#4A2A15", 950: "#2A170B",
};

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        emerald: success,
        green: success,
        amber: warning,
        yellow: warning,
        rose: danger,
        red: danger,
        orange: danger,
        blue: info,
        sky: info,
        indigo: info,
        purple: info,
        violet: info,
        abyss: "#000000",
        "abyss-2": "#1C1C1C",
        deep: "#1C1C1C",
        "deep-2": "#333333",
        shelf: "#333333",
        tide: "#999999",
        seaglass: "#FFFFFF",
        brass: "#FFFFFF",

        virtus: {
          black: "#000000",
          white: "#FFFFFF",
          yellow: "#FBD227",
          orange: "#DD7230",
          brown: "#854D27",
        },

        tvl: {
          plum: "#0A0A0A",
          "plum-dark": "#000000",
          amber: "#FBD227",
          orange: "#DD7230",
          ochre: "#854D27",
          champagne: "#FCDB52",
        },
      },
      fontSize: {
        display: [
          "clamp(3rem, 1.4rem + 8vw, 7.5rem)",
          { lineHeight: "1", letterSpacing: "0.01em" },
        ],
        h1: ["4rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h2: [
          "2.5rem",
          { lineHeight: "1.15", letterSpacing: "-0.02em" },
        ],
        h3: ["1.75rem", { lineHeight: "1.2", letterSpacing: "0.02em" }],
        eyebrow: [
          "0.8125rem",
          { lineHeight: "1.2", letterSpacing: "0.1875em" },
        ],
        "body-lg": ["1.375rem", { lineHeight: "1.5" }],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.2, 0.7, 0.2, 1) both",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "Arial", "sans-serif"],
        monument: ["var(--font-monument)", "Arial Black", "Arial", "sans-serif"],
        accent: ["var(--font-accent)", "Arial", "sans-serif"],
        wordmark: ["var(--font-wordmark)", "Arial Black", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        // Brand type: Montserrat for UI text. The old IBM Plex Mono is no longer used in the app UI.
        mono: ["var(--font-sans)", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

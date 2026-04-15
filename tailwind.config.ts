import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stone: {
          50: "#fbf9f6",
          100: "#f5f1ea",
          150: "#ede7dc",
          200: "#e6dfd1",
          300: "#cfc6b3",
        },
        slate: {
          750: "#293548",
          850: "#162033",
          950: "#0b1220",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        serif: ["ui-serif", "Georgia", "Cambria", "serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)",
        lift: "0 2px 6px rgba(15,23,42,0.06), 0 24px 48px -24px rgba(15,23,42,0.20)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

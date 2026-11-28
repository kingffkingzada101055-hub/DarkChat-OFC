import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dc: {
          black:    "#020804",
          surface:  "#071008",
          card:     "#0b1a0d",
          green:    "#00e676",
          greendark:"#004d1a",
          greenline:"#00703a",
          neon:     "#39ff7a",
          gold:     "#ffd700",
          white:    "#edf7ee",
        },
      },
      boxShadow: {
        neon:     "0 0 10px rgba(0,230,118,0.65), 0 0 30px rgba(0,230,118,0.35)",
        neonsoft: "0 0 6px rgba(57,255,122,0.45)",
        gold:     "0 0 14px rgba(255,215,0,0.55), 0 0 32px rgba(255,215,0,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;

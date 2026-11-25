import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dc: {
          black: "#0a0505",
          surface: "#120808",
          card: "#190a0a",
          red: "#ff1a2b",
          reddark: "#5c0008",
          redline: "#8c0010",
          neon: "#ff3b4d",
          white: "#f5f0f0",
        },
      },
      boxShadow: {
        neon: "0 0 10px rgba(255,27,43,0.6), 0 0 30px rgba(255,27,43,0.35)",
        neonsoft: "0 0 6px rgba(255,59,77,0.45)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

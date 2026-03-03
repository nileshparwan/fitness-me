import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 40px -10px rgba(15, 23, 42, 0.08)",
        colored: "0 14px 36px -12px rgba(244, 63, 94, 0.35)",
      },
      colors: {
        brand: {
          navy: "#111827",
          pink: "#f43f5e",
          orange: "#fb923c",
          coral: "#fb7185",
        },
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
};

export default config;

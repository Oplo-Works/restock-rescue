import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        evergreen: "#172B2B",
        "evergreen-soft": "#294B3D",
        champagne: "#C6A878",
        porcelain: "#F4F0E8",
        ink: "#24332F",
        secondary: "#738078",
        muted: "#929A93",
        line: "#E6E1D7",
        "surface-muted": "#EDE8DE",
        success: "#24543A",
        "success-bg": "#DCE8DF",
        warning: "#765A27",
        "warning-bg": "#F3E9D5",
        error: "#873F39",
        "error-bg": "#F3DFDC",
      },
      fontFamily: {
        display: ["var(--font-display)", "Instrument Serif", "serif"],
        sans: ["var(--font-ui)", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,43,43,0.04), 0 8px 24px rgba(23,43,43,0.05)",
        soft: "0 1px 2px rgba(23,43,43,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;

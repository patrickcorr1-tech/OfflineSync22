import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg0: "var(--bg-0)",
        bg1: "var(--bg-1)",
        bg2: "var(--bg-2)",
        surface0: "var(--surface-0)",
        surface1: "var(--surface-1)",
        surface2: "var(--surface-2)",
        text0: "var(--text-0)",
        text1: "var(--text-1)",
        text2: "var(--text-2)",
        accent: "var(--accent)",
        accent2: "var(--accent-2)",
        border: "var(--border)",
        ring: "var(--ring)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(.2,.8,.2,1)",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "200ms",
        slow: "260ms",
      },
    },
  },
  plugins: [],
};

export default config;

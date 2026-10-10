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
        "dungeon-bg": "#0a0a0f",
        "dungeon-gold": "#c9a84c",
        "dungeon-parchment": "#e8e0d0",
        "dungeon-burn": "#1a0a00",
        "dungeon-ash": "#3d2b1f",
        "dungeon-ember": "#ff4500",
      },
      fontFamily: {
        cinzel: ["var(--font-cinzel)", "Cinzel", "serif"],
        lore: ["var(--font-lore)", "IM Fell English", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

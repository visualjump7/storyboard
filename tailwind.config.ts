import type { Config } from 'tailwindcss';

/**
 * Theme tokens. The single accent color lives here (and as the `--accent`
 * CSS variable in globals.css), so changing the brand color is a one-line edit.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent as RGB channels so Tailwind opacity modifiers work
        // (e.g. bg-accent/20, ring-accent/20).
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',

        // Dark surface scale, mapped from the design.
        canvas: '#0c0c0e', // app background
        surface: '#141417', // toolbar + detail panel
        panel: '#101013', // script panel
        card: '#16161a', // scene card
        well: '#0e0e11', // image well / empty thumbnail
        field: '#1a1a1f', // inputs + textareas
        line: '#25252c', // default hairline borders
        'line-2': '#2c2c34', // input borders / dividers

        // Text scale
        ink: '#e8e8ea', // primary text
        bright: '#f0f0f2', // headings / names
        muted: '#6c6c75', // labels / secondary
        subtle: '#7e7e88', // card description
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.35)',
        'card-hover': '0 8px 22px rgba(0,0,0,0.5)',
        badge: '0 1px 4px rgba(0,0,0,0.4)',
        slideover: '-20px 0 60px rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 24px 80px rgba(5, 13, 18, 0.45)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Bahnschrift"', '"Trebuchet MS"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"Cascadia Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};

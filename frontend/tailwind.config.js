/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      'night',
      'light',
      'dark',
      'cupcake',
      'forest',
      'dracula',
      'cyberpunk',
      'retro',
      'aqua',
      'luxury',
    ],
    defaultTheme: 'night',
    logs: false,
  },
};

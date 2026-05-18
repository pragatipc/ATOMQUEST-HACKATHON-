import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d9f1ff',
          200: '#bce7ff',
          300: '#8ed7ff',
          400: '#59bdff',
          500: '#339bff',
          600: '#1a7af5',
          700: '#1363e1',
          800: '#1651b6',
          900: '#18468f',
          950: '#132c57',
        },
        accent: {
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
      },
      boxShadow: {
        soft: '0 4px 24px -4px rgba(19, 44, 87, 0.08)',
        card: '0 8px 32px -8px rgba(19, 44, 87, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;

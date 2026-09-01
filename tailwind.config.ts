import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#E8E4F8',
        },
        secondary: {
          DEFAULT: '#4A7C59',
          light: '#E8F5E9',
        },
        surface: {
          light: '#F8F9FA',
          dark: '#1A1A2E',
        },
        background: {
          light: '#FFFFFF',
          dark: '#0F0F1A',
        },
        'text-primary': {
          light: '#1A1A2E',
          dark: '#F1F1F1',
        },
        'text-secondary': {
          light: '#6B7280',
          dark: '#9CA3AF',
        },
        border: {
          light: '#E5E7EB',
          dark: '#2D2D44',
        },
        error: '#EF4444',
      },
      fontFamily: {
        pretendard: ['Pretendard', 'sans-serif'],
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        card: '12px',
        button: '8px',
      },
    },
  },
  plugins: [],
};

export default config;

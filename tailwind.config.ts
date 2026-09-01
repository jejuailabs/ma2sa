import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          light: '#E8F5E9',
          dark: '#1B4332',
        },
        secondary: {
          DEFAULT: '#52796F',
          light: '#EDF2F0',
        },
        accent: '#40916C',
        surface: {
          light: '#F7F9F8',
          dark: '#162B22',
        },
        background: {
          light: '#FFFFFF',
          dark: '#0F1A14',
        },
        sidebar: {
          DEFAULT: '#1B4332',
          text: '#D8F3DC',
        },
        error: '#EF4444',
      },
      fontFamily: {
        pretendard: ['Pretendard', 'sans-serif'],
      },
      maxWidth: {
        content: '1280px',
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

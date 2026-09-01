'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-14 h-7 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors"
      aria-label="테마 전환"
    >
      <div
        className={`absolute top-0.5 w-6 h-6 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 ${
          theme === 'dark' ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-white" />
        )}
      </div>
    </button>
  );
}

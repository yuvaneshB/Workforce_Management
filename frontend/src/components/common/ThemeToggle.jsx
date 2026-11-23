import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      id="themeToggle"
      type="button"
      onClick={toggleTheme}
      title="Toggle theme"
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="w-9 h-9 rounded-full surface grid place-items-center cursor-pointer transition-colors hover:bg-[var(--muted-fill)]"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

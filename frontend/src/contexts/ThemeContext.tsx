import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { themes, defaultTheme, isValidTheme, type ThemeId, type ThemeConfig } from '@/themes';

interface ThemeContextValue {
  theme: ThemeId;
  themeConfig: ThemeConfig;
  setTheme: (theme: ThemeId) => void;
  themeList: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'ghost-runner-theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return defaultTheme;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidTheme(stored)) {
      return stored;
    }
    return defaultTheme;
  });

  const setTheme = useCallback((newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    // Update body classes for smooth transition
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
  }, [theme]);

  // Listen for system theme changes (optional future enhancement)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // We're always dark mode, but this could be used for light mode support
    const handleChange = () => {
      // Future: handle light/dark mode switching
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value: ThemeContextValue = {
    theme,
    themeConfig: themes[theme],
    setTheme,
    themeList: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// src/context/ThemeContext.jsx
//
// Tracks light/dark mode across the whole app, persists the choice
// in localStorage, and respects the user's OS preference on first visit.

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(undefined);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Check if the user already picked a theme before
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;

    // 2. Otherwise, respect their OS/browser preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  // Whenever theme changes, apply it to the real <html> element
  // (this is what theme.css's [data-theme='dark'] selector actually matches against)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return context;
}
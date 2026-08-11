import React, { createContext, useContext, useEffect, useState } from 'react';
import { dark, light, themeCssVars } from '../styles/tokens';

const THEME_KEY = 'thermalai_theme';
const ThemeContext = createContext();

function applyTheme(palette, isDark) {
  const root = document.documentElement;
  Object.entries(themeCssVars).forEach(([key, cssVar]) => {
    root.style.setProperty(cssVar, palette[key]);
  });
  // Drive the ASM HMI palette (styles/hpmHMI.css) via [data-theme="light"].
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') return false;
    // Default dark unless the user explicitly opted into light mode.
    return saved !== 'dark';
  });

  useEffect(() => {
    applyTheme(isDark ? dark : light, isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

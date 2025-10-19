import { createContext, useContext } from 'react';

export const themes = {
  amber: {
    primary: '#FFB000', // A rich amber
    border: '#FFA000',    // A slightly darker amber for borders
    accent: '#FFD700',    // A brighter, golden yellow for highlights
    critical: '#FF4500',  // A stark orange-red for low HP, etc.
    dim: '#805800',       // A very dark amber for dim/unexplored areas
    textOnPrimary: '#000000', // Black text for use on a primary-colored background
    warning: '#FF8C00',   // Bright indicator for enemy actions
  },
  green: {
    primary: '#00FF41',    // A vibrant "Matrix" green
    border: '#00C031',    // A darker green for borders
    accent: '#39FF14',    // A brighter, "electric" green for highlights
    critical: '#90EE90',  // A washed-out, pale green for alerts
    dim: '#00641a',       // A very dark green for dim/unexplored areas
    textOnPrimary: '#000000', // Black text for use on a primary-colored background
    warning: '#FFD700',   // Highlight for enemy actions
  },
};

export type ThemeName = keyof typeof themes;
export type Theme = typeof themes[ThemeName];

const ThemeContext = createContext<Theme>(themes.amber); // Default theme

export const ThemeProvider = ThemeContext.Provider;

export const useTheme = () => useContext(ThemeContext);

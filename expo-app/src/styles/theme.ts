import { Platform } from 'react-native';
import { useAppStore } from '../store/useAppStore';

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  cardSecondary: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryPressed: string;
  text: string;
  textMuted: string;
  textDim: string;
  success: string;
  warning: string;
  error: string;
  white: string;
  inputBg: string;
  badgeBg: string;
  headerBg: string;
  tabBarBg: string;
  tabBarBorder: string;
}

export const darkColors: ThemeColors = {
  background: '#090b0f',
  surface: '#0f1115',
  card: '#181c24',
  cardSecondary: '#111827',
  border: '#1e293b',
  borderSubtle: '#26334d',
  primary: '#3b66ff',
  primaryPressed: '#254eda',
  text: '#ffffff',
  textMuted: '#64748b',
  textDim: '#94a3b8',
  success: '#22c55e',
  warning: '#eab308',
  error: '#ef4444',
  white: '#ffffff',
  inputBg: '#11141c',
  badgeBg: 'rgba(255, 255, 255, 0.06)',
  headerBg: '#090b0f',
  tabBarBg: '#090b0f',
  tabBarBorder: '#1e293b',
};

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  cardSecondary: '#f1f5f9',
  border: '#e2e8f0',
  borderSubtle: '#cbd5e1',
  primary: '#2563eb',
  primaryPressed: '#1d4ed8',
  text: '#0f172a',
  textMuted: '#64748b',
  textDim: '#475569',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
  white: '#ffffff',
  inputBg: '#f8fafc',
  badgeBg: 'rgba(0, 0, 0, 0.04)',
  headerBg: '#ffffff',
  tabBarBg: '#ffffff',
  tabBarBorder: '#e2e8f0',
};

export const theme = {
  colors: darkColors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  roundness: {
    sm: 6,
    md: 12,
    lg: 16,
    pill: 9999,
  },
  typography: {
    caption: {
      fontSize: 10,
      fontWeight: 'bold' as const,
      fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
      includeFontPadding: false,
    },
    body: {
      fontSize: 14,
      color: '#ffffff',
      fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
      includeFontPadding: false,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#ffffff',
      fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
      includeFontPadding: false,
    },
    subtitle: {
      fontSize: 14,
      color: '#64748b',
      fontFamily: Platform.OS === 'android' ? 'Roboto' : undefined,
      includeFontPadding: false,
    },
  },
};

export const useTheme = () => {
  const themeMode = useAppStore((state) => state.themeMode || 'dark');
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const isDark = themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return {
    themeMode,
    setThemeMode,
    isDark,
    colors,
    theme: {
      ...theme,
      colors,
    },
  };
};

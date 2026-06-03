export const theme = {
  colors: {
    background: '#090b0f',
    surface: '#0f1115',
    card: '#181c24',
    border: '#1e293b',
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
  },
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
    },
    body: {
      fontSize: 14,
      color: '#ffffff',
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold' as const,
      color: '#ffffff',
    },
    subtitle: {
      fontSize: 14,
      color: '#64748b',
    },
  }
};

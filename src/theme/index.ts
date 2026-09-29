export const colors = {
  bg: '#F4F6FB',
  card: '#FFFFFF',
  cardAlt: '#F7F9FD',
  text: '#0E1525',
  textMuted: '#5B6478',
  textFaint: '#8A92A6',
  line: '#E6EAF2',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primarySoft: '#E8EFFE',
  success: '#12A26A',
  successSoft: '#E3F7EE',
  warning: '#E08A0B',
  warningSoft: '#FFF3DF',
  danger: '#E0454F',
  dangerSoft: '#FDE8EA',
  violet: '#7C5CFA',
  violetSoft: '#EFEAFF',
  ink: '#0B1020',
  inkSoft: '#161E36',
  white: '#FFFFFF',
} as const;

export const gradients = {
  primary: ['#3B82F6', '#2563EB'] as const,
  night: ['#0B1020', '#16224A', '#1E3A8A'] as const,
  sky: ['#EEF3FF', '#F4F6FB'] as const,
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const font = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

/** `boxShadow` renders on iOS, Android (New Architecture) and web; `shadow*` props are deprecated on web. */
export const shadow = { boxShadow: '0 6px 18px rgba(30, 42, 74, 0.08)' } as const;

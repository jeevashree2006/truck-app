/**
 * Design tokens. These mirror the web app's palette exactly so the two
 * surfaces feel like one product.
 */
import type { DocStatus, Severity, TripStatus } from '@/types';

export const BRAND = {
  gradientStart: '#1d4ed8',
  gradientEnd: '#3b82f6',
  accent: '#7c3aed', // violet
} as const;

/** Shared brand gradient used by headers, hero sections and the primary CTA. */
export const BRAND_GRADIENT = [BRAND.gradientStart, BRAND.gradientEnd] as const;

/** Document / status colours (identical across themes for instant recognition). */
export const STATUS_COLORS = {
  valid: '#16a34a',
  expiring: '#f59e0b',
  expired: '#ef4444',
  unknown: '#94a3b8',
} as const;

export interface ThemeColors {
  bg: string;
  card: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  // Brand + status (constant, surfaced here for convenience)
  primary: string;
  primaryAlt: string;
  accent: string;
  valid: string;
  expiring: string;
  expired: string;
  unknown: string;
  // Derived helpers
  inputBg: string;
  onPrimary: string;
  overlay: string;
}

const lightColors: ThemeColors = {
  bg: '#f8fafc',
  card: '#ffffff',
  elevated: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  primary: BRAND.gradientStart,
  primaryAlt: BRAND.gradientEnd,
  accent: BRAND.accent,
  valid: STATUS_COLORS.valid,
  expiring: STATUS_COLORS.expiring,
  expired: STATUS_COLORS.expired,
  unknown: STATUS_COLORS.unknown,
  inputBg: '#f1f5f9',
  onPrimary: '#ffffff',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

const darkColors: ThemeColors = {
  bg: '#0b1120',
  card: '#111a2e',
  elevated: '#1e293b',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#1f2a40',
  primary: BRAND.gradientStart,
  primaryAlt: BRAND.gradientEnd,
  accent: BRAND.accent,
  valid: STATUS_COLORS.valid,
  expiring: STATUS_COLORS.expiring,
  expired: STATUS_COLORS.expired,
  unknown: STATUS_COLORS.unknown,
  inputBg: '#1e293b',
  onPrimary: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',
} as const;

/** Soft, elevation-aware shadow presets. */
export const shadow = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  shadow: typeof shadow;
  brandGradient: readonly [string, string];
}

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  brandGradient: BRAND_GRADIENT,
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkColors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadow,
  brandGradient: BRAND_GRADIENT,
};

// ---------------------------------------------------------------------------
// Status -> colour helpers
// ---------------------------------------------------------------------------

export function docStatusColor(status: DocStatus): string {
  return STATUS_COLORS[status];
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case 'high':
      return STATUS_COLORS.expired;
    case 'medium':
      return STATUS_COLORS.expiring;
    case 'low':
      return STATUS_COLORS.valid;
  }
}

export function tripStatusColor(status: TripStatus): string {
  switch (status) {
    case 'ongoing':
      return STATUS_COLORS.expiring;
    case 'completed':
      return STATUS_COLORS.valid;
    case 'cancelled':
      return STATUS_COLORS.unknown;
  }
}

/** Lighten a hex colour by mixing it toward white, returns rgba string. */
export function tint(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const bigint = parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

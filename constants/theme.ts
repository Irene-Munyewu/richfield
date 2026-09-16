/**
 * Richfield Connect design tokens.
 * Single source of truth for color, spacing, radius, and shadow —
 * every screen should pull from here instead of hardcoding values.
 */

export const colors = {
  // Brand
  primary: '#1B4B91', // Richfield blue
  primaryDark: '#123566',
  primaryLight: '#E8EFFA',

  // Surfaces — cool-toned to sit alongside the brand blue instead of a
  // neutral off-white, with a softer border so cards read as "raised" via
  // shadow rather than a hard outline.
  background: '#F5F7FB',
  card: '#FFFFFF',
  border: '#E7EBF2',

  // Text
  text: '#0F1B2D', // navy
  textMuted: '#5B6B82',
  textOnPrimary: '#FFFFFF',

  // Status
  success: '#1F9D55',
  warning: '#C7821A',
  danger: '#C0392B',
  info: '#1B4B91',

  // Role accents (used sparingly — badges, role switcher)
  roleStudent: '#1B4B91',
  roleAlumni: '#6C4BB6',
  roleBusiness: '#1F9D55',
  roleAdmin: '#C7821A',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const shadow = {
  // Softer, larger-spread shadow than a default card shadow — reads as a
  // gentle lift rather than a hard drop, which is what makes flat cards
  // feel "designed" instead of just boxed-in.
  card: {
    shadowColor: '#0F1B2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const typography = {
  h1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.2, fontWeight: '700' as const, color: colors.text },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, color: colors.text },
  bodyMuted: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const, color: colors.textMuted },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: '500' as const, color: colors.textMuted },
  button: { fontSize: 16, lineHeight: 20, letterSpacing: 0.2, fontWeight: '600' as const, color: colors.textOnPrimary },
};

export const brand = {
  name: 'Richfield Connect',
  tagline: 'Know your strength. Close your gaps. Get ahead.',
} as const;

export const theme = { colors, spacing, radius, shadow, typography, brand };
export default theme;

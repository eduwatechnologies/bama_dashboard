/**
 * Design tokens for the Bama dashboard.
 *
 * Mirrors `app/constants/colors.ts` from the mobile app so the dashboard and
 * the mobile app share a single visual identity.
 */
export const colors = {
  background: '#f8f5ef',
  foreground: '#20252b',
  card: '#fffdf9',
  cardForeground: '#20252b',
  primary: '#d9653b',
  primaryForeground: '#ffffff',
  secondary: '#ece6dc',
  secondaryForeground: '#4a514e',
  muted: '#eee9e0',
  mutedForeground: '#7a807c',
  accent: '#dce9df',
  accentForeground: '#315843',
  destructive: '#b84b3a',
  destructiveForeground: '#ffffff',
  border: '#e4ddd1',
  input: '#d8d0c4',
} as const;

export const radius = 12;
export const fontFamily =
  '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export type ColorToken = keyof typeof colors;

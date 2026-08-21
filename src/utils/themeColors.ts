import type { ResolvedTheme } from '../hooks/useTheme';

export type ColorSource = 'theme-default' | 'custom';

export const THEME_DEFAULT_COLORS = {
  light: '#1E293B', // Slate 800 (Light Theme default shape stroke / text color)
  dark: '#FAFAFA',  // Slate 50 (Dark Theme default shape stroke / text color)
} as const;

export const LEGACY_DEFAULT_COLORS = [
  '#1e293b',
  '#000000',
  '#fafafa',
  '#ffffff',
  '#1e1e1e',
  '#0f172a',
];

export function getDefaultColorForTheme(theme: ResolvedTheme): string {
  return THEME_DEFAULT_COLORS[theme];
}

/**
 * Determines the legacy color source for objects loaded from older project files
 * that lack `colorSource` metadata.
 * 
 * If the color matches a known theme default, it's assumed to be 'theme-default'.
 * Otherwise, it's considered 'custom'.
 */
export function getLegacyColorSource(color: string | null | undefined): ColorSource {
  if (!color) return 'theme-default';
  const normalized = color.trim().toLowerCase();
  if (LEGACY_DEFAULT_COLORS.includes(normalized)) {
    return 'theme-default';
  }
  return 'custom';
}

/**
 * Safe detection for Text Objects.
 * Relies exclusively on serialized fields to survive deserialization safely
 * rather than relying on prototype chains (instanceof).
 */
export function isTextObject(obj: any): boolean {
  if (!obj) return false;
  return (
    obj.type === 'i-text' ||
    obj.type === 'text' ||
    obj.type === 'textbox' ||
    obj.isText === true
  );
}

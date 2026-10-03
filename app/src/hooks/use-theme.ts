/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type Theme } from '@/theme';

/** The colours for the phone's current appearance. Dark is Tapped's default (docs/0020). */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  return Colors[scheme === 'light' ? 'light' : 'dark'];
}

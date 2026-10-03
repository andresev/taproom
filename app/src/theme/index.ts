/**
 * Taproom's design tokens (docs/0020): colours for both themes, the two type
 * families, spacing on a 4pt grid and corner sizes. Screens style through these,
 * never with literal colours or font names.
 *
 * The look is flat: surfaces separated by hairline borders, no shadows, glows or
 * gradients. Brass is kept for the primary action and the active tab.
 */

import './global.css';

export const Colors = {
  dark: {
    background: '#111210',
    card: '#1B1C19',
    cardPressed: '#23251F',
    text: '#F6F3E9',
    textSecondary: '#A2A69A',
    /** Hairlines: white at 9%. */
    border: 'rgba(255,255,255,0.09)',
    /** The one accent, a soft brass. Fills take `onAccent` text. */
    accent: '#E6C780',
    onAccent: '#211F16',
    /** Brass as text or an outline on this theme's background. */
    accentText: '#E6C780',
    /** Buy and sell, and the four safety states. Always paired with a word or an icon, never colour alone. */
    buy: '#7EE0A6',
    sell: '#F99797',
    safe: '#7EE0A6',
    caution: '#EDB866',
    danger: '#F99797',
    unknown: '#A2A69A',
    /** Behind a bottom sheet. */
    scrim: 'rgba(0,0,0,0.6)',
    // Names from before docs/0020, kept until every screen has moved to the ones above.
    backgroundElement: '#1B1C19',
    backgroundSelected: '#23251F',
  },
  light: {
    background: '#F7F6F1',
    card: '#FFFEFA',
    cardPressed: '#F0EEE5',
    text: '#25291F',
    /** Darker than the brief's #717567, which fell just under 4.5:1 on the background. */
    textSecondary: '#6A6E60',
    border: 'rgba(37,41,31,0.12)',
    accent: '#E6C780',
    onAccent: '#211F16',
    accentText: '#79601F',
    buy: '#247044',
    sell: '#B13E36',
    safe: '#247044',
    caution: '#8A5A0B',
    danger: '#B13E36',
    unknown: '#6A6E60',
    scrim: 'rgba(37,41,31,0.45)',
    backgroundElement: '#FFFEFA',
    backgroundSelected: '#F0EEE5',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = { readonly [key in ThemeColor]: string };

/**
 * Geist for text, Geist Mono for every number, address, hash and ticker. Each
 * weight is its own family, loaded in the root layout from assets/fonts; set
 * `fontFamily`, not `fontWeight`.
 */
export const Fonts = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  mono: 'GeistMono_400Regular',
  monoMedium: 'GeistMono_500Medium',
  monoSemibold: 'GeistMono_600SemiBold',
} as const;

/** The font files behind `Fonts`, for `useFonts`. */
export const FontAssets = {
  [Fonts.regular]: require('../../assets/fonts/Geist_400Regular.ttf'),
  [Fonts.medium]: require('../../assets/fonts/Geist_500Medium.ttf'),
  [Fonts.semibold]: require('../../assets/fonts/Geist_600SemiBold.ttf'),
  [Fonts.bold]: require('../../assets/fonts/Geist_700Bold.ttf'),
  [Fonts.mono]: require('../../assets/fonts/GeistMono_400Regular.ttf'),
  [Fonts.monoMedium]: require('../../assets/fonts/GeistMono_500Medium.ttf'),
  [Fonts.monoSemibold]: require('../../assets/fonts/GeistMono_600SemiBold.ttf'),
} as const;

/** The type scale: size, line height and family for each role. */
export const Type = {
  title: { fontFamily: Fonts.bold, fontSize: 26, lineHeight: 30, letterSpacing: -0.5 },
  heading: { fontFamily: Fonts.bold, fontSize: 20, lineHeight: 26 },
  subhead: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 21 },
  bodyStrong: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: Fonts.semibold, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.4 },
  monoLarge: { fontFamily: Fonts.monoMedium, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  mono: { fontFamily: Fonts.monoMedium, fontSize: 14, lineHeight: 20 },
  monoSmall: { fontFamily: Fonts.mono, fontSize: 12.5, lineHeight: 18 },
} as const;

/** A 4pt grid. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  threeHalf: 20,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Cards and sheets, buttons and inputs, chips and avatars. */
export const Radius = {
  card: 14,
  control: 10,
  full: 999,
} as const;

/** The smallest touch target. */
export const MinTouch = 44;

export const MaxContentWidth = 800;

export { useColorScheme } from 'react-native';

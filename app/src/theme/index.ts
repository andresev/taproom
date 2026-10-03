/**
 * Taproom's design tokens (docs/0020): colours for both themes, the two type
 * families, spacing on a 4pt grid and corner sizes. Screens style through these,
 * never with literal colours or font names.
 *
 * Black and gold, to match the logo. Working surfaces are flat: cards, rows and
 * numbers are separated by gold-tinted hairlines and carry no gradients. Brushed
 * gold (`Brand`) is kept for the logo, the primary action, the two gold titles,
 * the sign-in screen and the receipt card.
 */

import './global.css';

export const Colors = {
  dark: {
    background: '#070706',
    card: '#11110F',
    cardPressed: '#1B1A16',
    text: '#F4F0E4',
    textSecondary: '#A6A294',
    /** Hairlines: the accent gold at 16%. */
    border: 'rgba(230,199,128,0.16)',
    /** The one accent, a soft gold. Fills take `onAccent` text. */
    accent: '#E6C780',
    onAccent: '#1A1508',
    /** Brass as text or an outline on this theme's background. */
    accentText: '#E6C780',
    /** Buy and sell, and the four safety states. Always paired with a word or an icon, never colour alone. */
    buy: '#7EE0A6',
    sell: '#F99797',
    safe: '#7EE0A6',
    caution: '#EDB866',
    danger: '#F99797',
    unknown: '#A6A294',
    /** Behind a bottom sheet. */
    scrim: 'rgba(0,0,0,0.7)',
    // Names from before docs/0020, kept until every screen has moved to the ones above.
    backgroundElement: '#11110F',
    backgroundSelected: '#1B1A16',
  },
  light: {
    background: '#F7F6F1',
    card: '#FFFEFA',
    cardPressed: '#F0EEE5',
    text: '#25291F',
    /** Darker than the brief's #717567, which fell just under 4.5:1 on the background. */
    textSecondary: '#6A6E60',
    /** Hairlines: a dark gold at 20%. */
    border: 'rgba(121,96,31,0.20)',
    accent: '#E6C780',
    onAccent: '#1A1508',
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

/**
 * The brushed gold, as gradient stops.
 * - `gold` and `pale` fill the logo, the same in both themes, each running from
 *   a shape's top left to its bottom right. `app/scripts/render-icons.py` draws
 *   the app icon from the same values.
 * - `fill` runs left to right across the primary button, under `onAccent` text.
 * - `lettering` runs left to right across a gold title: bright on a dark
 *   background, deep on a light one so it stays readable.
 */
export const Brand = {
  black: '#050505',
  gold: [
    { offset: 0, color: '#FBEFB9' },
    { offset: 0.22, color: '#E6C780' },
    { offset: 0.5, color: '#9C7526' },
    { offset: 0.74, color: '#F1DA96' },
    { offset: 1, color: '#7C5C1A' },
  ],
  pale: [
    { offset: 0, color: '#FFFFFF' },
    { offset: 0.6, color: '#F5EBC8' },
    { offset: 1, color: '#D9C283' },
  ],
  fill: [
    { offset: 0, color: '#FBEFB9' },
    { offset: 0.32, color: '#E6C780' },
    { offset: 0.62, color: '#C9A24D' },
    { offset: 1, color: '#F1DA96' },
  ],
  fillBorder: '#C9A24D',
  lettering: {
    dark: [
      { offset: 0, color: '#FBEFB9' },
      { offset: 0.3, color: '#E6C780' },
      { offset: 0.55, color: '#A9812F' },
      { offset: 0.78, color: '#F1DA96' },
      { offset: 1, color: '#8C6A22' },
    ],
    light: [
      { offset: 0, color: '#8C6A22' },
      { offset: 0.5, color: '#5E4311' },
      { offset: 1, color: '#9C7526' },
    ],
  },
  /** The soft light behind the mark and at the top of dark screens. */
  glow: '#E6C780',
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

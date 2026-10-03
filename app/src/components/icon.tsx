import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * The app's line icons, drawn on a 24-unit grid with one stroke width. Icons
 * carry meaning beside a label (a safety state, buy or sell), never instead of one.
 */
const ICONS = {
  back: <Path d="M15 5l-7 7 7 7" />,
  chevron: <Path d="M9 5l7 7-7 7" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  copy: (
    <>
      <Rect x="9" y="9" width="11" height="11" rx="2" />
      <Path d="M5 15V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  share: <Path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  up: <Path d="M12 19V5M6 11l6-6 6 6" />,
  down: <Path d="M12 5v14M6 13l6 6 6-6" />,
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 11v5M12 7.5v.5" />
    </>
  ),
  key: (
    <>
      <Circle cx="8" cy="14" r="4" />
      <Path d="M11 11l8-8M16 6l3 3" />
    </>
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </>
  ),
  receipt: <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  // The four safety states: shield, triangle, octagon, question.
  safe: <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2.2 2.2L15 10.5" />,
  caution: <Path d="M12 4l9 16H3zM12 10v4M12 17v.5" />,
  danger: <Path d="M8.5 3h7L21 8.5v7L15.5 21h-7L3 15.5v-7zM12 8v5M12 16v.5" />,
  unknown: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 16.5v.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, color, size = 20, strokeWidth = 2 }: { name: IconName; color: string; size?: number; strokeWidth?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}>
      {ICONS[name]}
    </Svg>
  );
}

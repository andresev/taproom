import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Brand } from '@/theme';

import { Lettering, LETTERING_HEIGHT, type LetteringText } from './gold-lettering';

/**
 * The brushed gold of the logo, for the few places outside it that take it
 * (docs/0020): the primary button, the two gold titles, and a soft light on dark
 * screens. Everything else in the app stays flat.
 */

/** Fills its parent with the gold gradient. The parent clips it to its own corners. */
export function GoldFill() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <LinearGradient id="fill" x1="0" y1="0" x2="1" y2="0">
          {Brand.fill.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#fill)" />
    </Svg>
  );
}

/**
 * "Taproom" or "On tap" in gold. `size` is the font size it stands in for; the
 * title is 1.3 times that tall, like a line of text. `on` is the background it
 * sits on, the phone's theme unless given.
 */
export function GoldTitle({ text, size, on }: { text: LetteringText; size: number; on?: 'dark' | 'light' }) {
  const scheme = useColorScheme();
  const stops = Brand.lettering[on ?? (scheme === 'light' ? 'light' : 'dark')];
  const { width, path } = Lettering[text];
  const scale = size / 1000;

  return (
    <Svg
      width={width * scale}
      height={LETTERING_HEIGHT * scale}
      viewBox={`0 0 ${width} ${LETTERING_HEIGHT}`}
      accessible
      accessibilityRole="header"
      accessibilityLabel={text}>
      <Defs>
        <LinearGradient id="lettering" x1="0" y1="0" x2="1" y2="0">
          {stops.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      <Path d={path} fill="url(#lettering)" />
    </Svg>
  );
}

/** A soft round gold light, `size` across, to sit behind something. */
export function GoldGlow({ size, opacity = 0.22 }: { size: number; opacity?: number }) {
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset={0} stopColor={Brand.glow} stopOpacity={opacity} />
          <Stop offset={1} stopColor={Brand.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={size} height={size} fill="url(#glow)" />
    </Svg>
  );
}

/**
 * A faint gold light across the top of the screen, over whatever is there. Dark
 * theme only. It takes no touches.
 */
export function TopGlow() {
  const scheme = useColorScheme();
  if (scheme === 'light') return null;

  return (
    <View style={styles.top} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="top" cx="0.5" cy="0" r="0.7">
            <Stop offset={0} stopColor={Brand.glow} stopOpacity={0.11} />
            <Stop offset={1} stopColor={Brand.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#top)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
});

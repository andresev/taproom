import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { GoldTitle } from '@/components/gold';
import { Brand } from '@/theme';

/**
 * Tapped's own mark: a "T" whose crossbar ends in a tap spout, with one drop,
 * in brushed gold on a black tile. Its colours are fixed, the same in both
 * themes. It is not Brew's logo, and nothing of Brew's is used (CLAUDE.md).
 *
 * The shapes are drawn upright on a 100-unit grid; the matrix slants them 14
 * degrees and centres them on the tile. `app/scripts/render-icons.py` draws the
 * app icon from the same shapes: change both together.
 */
export function Mark({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="Tapped">
      <Defs>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          {Brand.gold.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
        <LinearGradient id="pale" x1="0" y1="0" x2="1" y2="1">
          {Brand.pale.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      {tile ? <Rect width="100" height="100" rx="23" fill={Brand.black} /> : null}
      <G transform="matrix(0.88 0 -0.2194 0.88 13.92 5.12)">
        <Path d="M12 16H66a20 20 0 0 1 20 20V50H71V38a7 7 0 0 0-7-7H12z" fill="url(#gold)" />
        <Path d="M34 37h15v49H34z" fill="url(#gold)" />
        <Path d="M53 37h7v38h-7z" fill="url(#pale)" />
        <Path
          d="M78.5 56c0 0-6 7-6 11.5a6 6 0 0 0 12 0c0-4.5-6-11.5-6-11.5z"
          fill="url(#pale)"
        />
      </G>
    </Svg>
  );
}

/**
 * The mark with the name beside it, in gold. `on` is the background it sits on,
 * the phone's theme unless given; on black the mark needs no tile.
 */
export function Wordmark({ size = 34, on, tile = true }: { size?: number; on?: 'dark' | 'light'; tile?: boolean }) {
  return (
    <View style={[styles.wordmark, { gap: size * (tile ? 0.36 : 0.2) }]}>
      <Mark size={size * 1.25} tile={tile} />
      <GoldTitle text="Tapped" size={size} on={on} />
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/theme';

/**
 * Taproom's own mark: a tap handle over a spout, on a rounded brass tile. It is
 * not Brew's logo, and nothing of Brew's is used (CLAUDE.md).
 */
export function Mark({ size = 40 }: { size?: number }) {
  const theme = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Taproom">
      <Rect width="64" height="64" rx="15" fill={theme.accent} />
      <Rect x="27" y="9" width="10" height="21" rx="5" fill={theme.onAccent} />
      <Rect x="23" y="31" width="18" height="5" rx="2" fill={theme.onAccent} />
      <Path d="M15 38h34v9H37v6h-10v-6H15z" fill={theme.onAccent} />
      <Rect x="22" y="55" width="20" height="3" rx="1.5" fill={theme.onAccent} />
    </Svg>
  );
}

/** The mark with the name beside it, set in lowercase. */
export function Wordmark({ size = 34 }: { size?: number }) {
  return (
    <View style={[styles.wordmark, { gap: size * 0.36 }]}>
      <Mark size={size * 1.25} />
      <ThemedText style={{ fontFamily: Fonts.bold, fontSize: size, lineHeight: size * 1.15, letterSpacing: -size * 0.03 }}>
        taproom
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

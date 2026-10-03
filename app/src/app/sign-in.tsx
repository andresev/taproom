import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { GoldGlow, GoldTitle } from '@/components/gold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Mark } from '@/components/wordmark';
import { SignInOptions } from '@/features/profile/sign-in-options';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { Brand, Spacing } from '@/theme';

const MARK = 112;
const GLOW = 330;

/** Thin gold lines sweeping across the top and bottom of the screen, behind everything. */
function Sweeps({ strong }: { strong: boolean }) {
  const lines = [
    { d: 'M-20 150C120 150 170 60 300 60H410', width: 2, opacity: strong ? 0.7 : 0.5 },
    { d: 'M-20 186C130 186 190 96 320 96H410', width: 1, opacity: strong ? 0.45 : 0.3 },
    { d: 'M410 560C300 560 260 650 130 650H-20', width: 2, opacity: strong ? 0.6 : 0.4 },
    { d: 'M410 596C310 596 270 686 150 686H-20', width: 1, opacity: strong ? 0.4 : 0.22 },
  ];
  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width="100%"
      height="100%"
      viewBox="0 0 390 844"
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none">
      <Defs>
        {/* In the drawing's own units: a line that runs flat has no box for a gradient to fill. */}
        <LinearGradient id="sweep" x1="0" y1="0" x2="390" y2="844" gradientUnits="userSpaceOnUse">
          {Brand.gold.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </LinearGradient>
      </Defs>
      {lines.map((line) => (
        <Path key={line.d} d={line.d} fill="none" stroke="url(#sweep)" strokeWidth={line.width} opacity={line.opacity} />
      ))}
    </Svg>
  );
}

/**
 * The first screen anyone sees: nothing else in the app is reachable until they
 * sign in. The mark and the name in gold, one line on what the app does, and the
 * ways in.
 */
export default function SignInScreen() {
  const theme = useTheme();
  const light = useColorScheme() === 'light';

  return (
    <ThemedView style={styles.container}>
      <Sweeps strong={light} />
      <SafeAreaView style={styles.content}>
        <View style={styles.intro}>
          <View style={styles.mark}>
            {light ? null : (
              <View style={styles.glow}>
                <GoldGlow size={GLOW} />
              </View>
            )}
            {/* On black the mark stands alone; on the light theme it keeps its black tile. */}
            <Mark size={MARK} tile={light} />
          </View>
          <GoldTitle text="Taproom" size={52} />
          <View style={styles.lineRow}>
            <View style={[styles.rule, { backgroundColor: theme.accentText }]} />
            <ThemedText style={styles.line}>
              See what the wallets you follow buy on Brew, with a record you can check.
            </ThemedText>
          </View>
        </View>
        <SignInOptions />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six * 2,
    paddingBottom: Spacing.four,
  },
  intro: {
    gap: Spacing.three,
  },
  mark: {
    width: MARK,
    height: MARK,
  },
  glow: {
    position: 'absolute',
    left: (MARK - GLOW) / 2,
    top: (MARK - GLOW) / 2,
  },
  lineRow: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
  },
  rule: {
    width: 2,
  },
  line: {
    flexShrink: 1,
    fontSize: 19,
    lineHeight: 26,
    maxWidth: 290,
  },
});

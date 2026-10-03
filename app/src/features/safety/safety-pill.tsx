import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing, Type } from '@/theme';

import type { SafetyLevel } from './types';

/** `unknown` is shown while a score is loading or could not be worked out. It is never styled as safe. */
export type SafetyPillLevel = SafetyLevel | 'unknown';

const LABEL: Record<SafetyPillLevel, string> = { safe: 'Safe', caution: 'Caution', danger: 'Danger', unknown: 'Unknown' };

/**
 * A safety rating as a small pill: an icon and a word, in the rating's colour.
 * It never stands alone: wherever it appears, the reasons are on the same
 * screen or one tap away (CLAUDE.md, Safety model).
 */
export function SafetyPill({ level }: { level: SafetyPillLevel }) {
  const theme = useTheme();
  const color = theme[level];
  return (
    <View style={[styles.pill, { borderColor: color }]} accessibilityLabel={`Safety: ${LABEL[level]}`}>
      <Icon name={level} color={color} size={15} />
      <ThemedText style={[styles.label, { color }]}>{LABEL[level]}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    height: 26,
    paddingLeft: Spacing.two - 1,
    paddingRight: Spacing.two + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  label: {
    ...Type.label,
  },
});

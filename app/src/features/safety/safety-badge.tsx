import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import type { SafetyLevel, SafetyScore } from './types';

const LEVEL_LABEL: Record<SafetyLevel, string> = { safe: 'Safe', caution: 'Caution', danger: 'Danger' };

/**
 * A safety score with its reasons. The two are one component on purpose: a
 * level is never shown without the reasons behind it (CLAUDE.md, Safety model).
 */
export function SafetyBadge({ score, note }: { score: SafetyScore; note?: string }) {
  const theme = useTheme();
  const color = score.level === 'safe' ? theme.buy : score.level === 'danger' ? theme.sell : theme.text;

  return (
    <View style={[styles.container, { borderColor: color }]}>
      <ThemedText type="smallBold" style={{ color }}>
        Safety: {LEVEL_LABEL[score.level]}
      </ThemedText>
      {note ? (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      ) : null}
      {score.reasons.map((check) => (
        <ThemedText key={check.id} type="small" themeColor="textSecondary">
          • {check.reason}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});

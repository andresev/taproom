import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import type { SafetyCheckStatus, SafetyLevel, SafetyScore } from './types';

const LEVEL_LABEL: Record<SafetyLevel, string> = { safe: 'Safe', caution: 'Caution', danger: 'Danger' };
/** A word per reason, so the status does not depend on colour. */
const STATUS_LABEL: Record<SafetyCheckStatus, string> = { pass: 'OK', warn: 'Warning', fail: 'Problem', unknown: 'Unknown' };

/**
 * A safety score with its reasons. The two are one component on purpose: a
 * level is never shown without the reasons behind it (CLAUDE.md, Safety model).
 * `score` is null while the checks are still running, and then no level is shown.
 */
export function SafetyBadge({ score }: { score: SafetyScore | null }) {
  const theme = useTheme();

  if (!score) {
    return (
      <View style={[styles.container, { borderColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">Safety: checking…</ThemedText>
      </View>
    );
  }

  const levelColor = score.level === 'safe' ? theme.buy : score.level === 'danger' ? theme.sell : theme.text;
  const statusColor = (status: SafetyCheckStatus) =>
    status === 'pass' ? theme.buy : status === 'fail' ? theme.sell : theme.text;

  return (
    <View style={[styles.container, { borderColor: levelColor }]}>
      <ThemedText type="smallBold" style={{ color: levelColor }}>
        Safety: {LEVEL_LABEL[score.level]}
      </ThemedText>
      {score.reasons.map((check) => (
        <ThemedText key={check.id} type="small" themeColor="textSecondary">
          <ThemedText type="smallBold" style={{ color: statusColor(check.status) }}>
            {STATUS_LABEL[check.status]}
          </ThemedText>
          {'  '}
          {check.reason}
        </ThemedText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
});

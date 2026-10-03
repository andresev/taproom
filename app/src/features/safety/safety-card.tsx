import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { MinTouch, Radius, Spacing } from '@/theme';

import { SafetyPill } from './safety-pill';
import { STATUS_DISPLAY, summarizeChecks } from './safety-summary';
import type { SafetyCheck, SafetyScore } from './types';

function Reason({ check }: { check: SafetyCheck }) {
  const theme = useTheme();
  const status = STATUS_DISPLAY[check.status];
  const color = theme[status.level];
  return (
    <View style={[styles.reason, { borderTopColor: theme.border }]}>
      <Icon name={status.level} color={color} size={20} />
      <View style={styles.reasonText}>
        <ThemedText type="caption" style={{ color }}>
          {status.label.toUpperCase()}
        </ThemedText>
        <ThemedText>{check.reason}</ThemedText>
      </View>
    </View>
  );
}

/**
 * A safety rating with its reasons. Collapsed, it shows the rating, the worst
 * finding and a count of the rest; one tap lists every reason with its own
 * status. A rating is never shown without this (CLAUDE.md, Safety model).
 * `score` is null while the checks are still running, and then no rating is shown.
 */
export function SafetyCard({ score, startOpen = false }: { score: SafetyScore | null; startOpen?: boolean }) {
  const theme = useTheme();
  const [open, setOpen] = useState(startOpen);

  if (!score) {
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText type="bodyStrong">Safety</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Checking this token…
        </ThemedText>
      </View>
    );
  }

  const [worst] = score.reasons;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: score.level === 'danger' ? theme.danger : theme.border }]}>
      <View style={styles.head}>
        <ThemedText type="bodyStrong">Safety</ThemedText>
        <SafetyPill level={score.level} />
      </View>

      {open ? (
        <View>
          {score.reasons.map((check) => (
            <Reason key={check.id} check={check} />
          ))}
          <ThemedText type="small" themeColor="textSecondary" style={[styles.note, { borderTopColor: theme.border }]}>
            Computed from chain data. Unknown is never counted as safe.
          </ThemedText>
        </View>
      ) : (
        <ThemedText>{worst.reason}</ThemedText>
      )}

      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.toggle}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
          {summarizeChecks(score.reasons)}
        </ThemedText>
        <ThemedText type="label" style={{ color: theme.accentText }}>
          {open ? 'Show less' : `All ${score.reasons.length} reasons`}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three - 2,
    paddingBottom: Spacing.one,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reason: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.twoHalf,
    borderTopWidth: 1,
  },
  reasonText: {
    flex: 1,
    gap: Spacing.half,
  },
  note: {
    paddingTop: Spacing.twoHalf,
    borderTopWidth: 1,
  },
  toggle: {
    minHeight: MinTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  summary: {
    flexShrink: 1,
  },
});

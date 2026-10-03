import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import type { TokenDetails } from '@/features/token/types';
import { useTheme } from '@/hooks/use-theme';
import { shortAddress } from '@/lib/chain/format';
import { Radius, Spacing, type ThemeColor } from '@/theme';

/** The pieces a buy and a sell sheet share. */

/** The sheet's heading: what is being done, to which token. */
export function SheetTitle({ title, token }: { title: string; token: TokenDetails }) {
  return (
    <View style={styles.title}>
      <TokenAvatar address={token.address} symbol={token.symbol} size={36} />
      <View style={styles.titleText}>
        <ThemedText type="subhead">{title}</ThemedText>
        <ThemedText type="monoSmall" themeColor="textSecondary">
          {token.symbol ?? shortAddress(token.address)} · {shortAddress(token.address)}
        </ThemedText>
      </View>
    </View>
  );
}

/** One labelled figure, with the value in mono type. */
export function ReviewRow({ label, value, color }: { label: string; value: string; color?: ThemeColor }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderTopColor: theme.border }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="mono" themeColor={color} style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}

/** A loud warning: heavy border, an icon and a heading in the danger colour. Used for slippage above 5%. */
export function Warning({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.warning, { borderColor: theme.danger }]} accessibilityRole="alert">
      <Icon name="danger" color={theme.danger} size={22} />
      <View style={styles.warningText}>
        <ThemedText type="bodyStrong" style={{ color: theme.danger }}>
          {title}
        </ThemedText>
        <ThemedText type="small">{children}</ThemedText>
      </View>
    </View>
  );
}

/** A quieter note in the body of the sheet, in the given colour. */
export function Note({ children, color = 'textSecondary' }: { children: React.ReactNode; color?: ThemeColor }) {
  return (
    <ThemedText type="small" themeColor={color}>
      {children}
    </ThemedText>
  );
}

/** The top of a pending, success or failed sheet: a mark, a heading and one line. */
export function Outcome({ kind, title, children }: { kind: 'pending' | 'success' | 'failed'; title: string; children: React.ReactNode }) {
  const theme = useTheme();
  const mark: Record<'success' | 'failed', { icon: IconName; color: string }> = {
    success: { icon: 'check', color: theme.safe },
    failed: { icon: 'close', color: theme.danger },
  };
  return (
    <View style={styles.outcome} accessibilityLiveRegion="polite">
      {kind === 'pending' ? (
        <ActivityIndicator size="large" color={theme.accentText} />
      ) : (
        <Icon name={mark[kind].icon} color={mark[kind].color} size={40} strokeWidth={2.5} />
      )}
      <ThemedText type="subhead" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        {children}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    paddingBottom: Spacing.two,
  },
  titleText: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    minHeight: 42,
    borderTopWidth: 1,
  },
  rowValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  warning: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    padding: Spacing.twoHalf,
    borderRadius: Radius.control,
    borderWidth: 2,
  },
  warningText: {
    flex: 1,
    gap: Spacing.half,
  },
  outcome: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
});

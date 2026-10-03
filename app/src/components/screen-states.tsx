import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

/** Loading, empty and error states. Every screen that fetches data renders all three. */

export function LoadingState() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.textSecondary} />
    </View>
  );
}

/** A coaster with the tap mark: the quiet picture behind an empty screen. */
function Coaster() {
  const theme = useTheme();
  return (
    <Svg width={88} height={88} viewBox="0 0 88 88" fill="none" accessible={false}>
      <Circle cx="44" cy="44" r="42" stroke={theme.border} strokeWidth={2} />
      <Circle cx="44" cy="44" r="33" stroke={theme.border} strokeWidth={2} strokeDasharray="2 6" />
      <Rect x="40" y="24" width="8" height="16" rx="4" fill={theme.textSecondary} />
      <Rect x="37" y="41" width="14" height="4" rx="2" fill={theme.textSecondary} />
      <Path d="M30 47h28v7H48v5h-8v-5H30z" fill={theme.textSecondary} />
    </Svg>
  );
}

type Action = { label: string; onPress: () => void };

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: Action }) {
  return (
    <View style={styles.container}>
      <Coaster />
      <ThemedText type="subhead" style={styles.title}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
      {action ? (
        <View style={styles.action}>
          <Button label={action.label} kind="primary" onPress={action.onPress} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry, title = 'Something went wrong' }: { message: string; onRetry?: () => void; title?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Icon name="info" color={theme.textSecondary} size={36} />
      <ThemedText type="subhead" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {onRetry ? (
        <View style={styles.action}>
          <Button label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  title: {
    paddingTop: Spacing.two,
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
  },
  action: {
    paddingTop: Spacing.two,
  },
});

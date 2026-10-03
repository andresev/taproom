import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

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
      {/* The mark's shapes (components/wordmark.tsx), small and in one quiet colour. */}
      <G transform="matrix(0.42 0 -0.1047 0.42 26.78 22.58)" fill={theme.textSecondary}>
        <Path d="M12 16H66a20 20 0 0 1 20 20V50H71V38a7 7 0 0 0-7-7H12z" />
        <Path d="M34 37h15v49H34z" />
        <Path d="M53 37h7v38h-7z" />
        <Path d="M78.5 56c0 0-6 7-6 11.5a6 6 0 0 0 12 0c0-4.5-6-11.5-6-11.5z" />
      </G>
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

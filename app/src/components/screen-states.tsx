import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/theme';

/** Loading, empty and error states. Every screen that fetches data renders all three. */

export function LoadingState() {
  return (
    <ThemedView style={styles.container}>
      <ActivityIndicator />
    </ThemedView>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="smallBold">Something went wrong</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <ThemedText type="linkPrimary">Try again</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});

import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/theme';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        <EmptyState title="Profile" message="Connect a wallet to create your profile." />
        <ThemedView style={styles.about}>
          <ThemedText type="smallBold">About</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Taproom is an independent, community-built app. Not affiliated with Brew.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  about: {
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});

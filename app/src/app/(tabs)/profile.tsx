import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConnectButton } from '@/features/profile/connect-button';
import { ProfileCard } from '@/features/profile/profile-card';
import { useSession } from '@/features/profile/use-session';
import { Spacing } from '@/theme';

export default function ProfileScreen() {
  const { session, isLoading } = useSession();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {isLoading ? <LoadingState /> : session ? <ProfileCard userId={session.user.id} /> : <ConnectButton />}
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

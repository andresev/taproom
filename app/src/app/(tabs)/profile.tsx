import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProfileCard } from '@/features/profile/profile-card';
import { SignInOptions } from '@/features/profile/sign-in-options';
import { useSession } from '@/features/profile/use-session';
import { skipSignIn } from '@/lib/api/privy';
import { Spacing } from '@/theme';

export default function ProfileScreen() {
  // The tabs are only reachable signed in, so the session is there once it has loaded.
  const { session } = useSession();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {session ? (
          <ProfileCard userId={session.user.id} />
        ) : skipSignIn ? (
          <View style={styles.devSignIn}>
            <ThemedText type="smallBold" style={styles.center}>
              Sign-in is switched off for development
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              You are browsing without an account, so there is no wallet or profile and you cannot follow anyone.
              EXPO_PUBLIC_SKIP_SIGN_IN in app/.env controls this.
            </ThemedText>
            <SignInOptions />
          </View>
        ) : (
          <LoadingState />
        )}
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
  devSignIn: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
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

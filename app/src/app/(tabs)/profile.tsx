import { ScrollView, StyleSheet, View } from 'react-native';
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title">Profile</ThemedText>
          {session ? (
            <ProfileCard userId={session.user.id} />
          ) : skipSignIn ? (
            <View style={styles.devSignIn}>
              <ThemedText type="bodyStrong">Sign-in is switched off for development</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                You are browsing without an account, so there is no wallet or profile and you cannot follow anyone.
                EXPO_PUBLIC_SKIP_SIGN_IN in app/.env controls this.
              </ThemedText>
              <SignInOptions />
            </View>
          ) : (
            <LoadingState />
          )}
          <ThemedText type="small" themeColor="textSecondary" style={styles.about}>
            Taproom is independent and community-built. Not affiliated with Brew.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    paddingBottom: Spacing.six,
  },
  devSignIn: {
    gap: Spacing.three,
  },
  about: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});

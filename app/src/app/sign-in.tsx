import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SignInOptions } from '@/features/profile/sign-in-options';
import { Spacing } from '@/theme';

/** The first screen anyone sees: nothing else in the app is reachable until they sign in. */
export default function SignInScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.intro}>
          <ThemedText type="title">Taproom</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.center}>
            See what the wallets you follow are buying and launching on Brew.
          </ThemedText>
        </View>

        <View style={styles.actions}>
          <SignInOptions />
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Signing in creates a wallet for you inside the app. No seed phrase needed, and you can export your key
            at any time.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Taproom is an independent, community-built app. Not affiliated with Brew.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  intro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});

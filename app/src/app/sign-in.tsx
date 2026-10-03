import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Wordmark } from '@/components/wordmark';
import { SignInOptions } from '@/features/profile/sign-in-options';
import { Spacing } from '@/theme';

/**
 * The first screen anyone sees: nothing else in the app is reachable until they
 * sign in. The wordmark, one line on what the app does, and the ways in.
 */
export default function SignInScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.content}>
        <View style={styles.intro}>
          <Wordmark />
          <ThemedText style={styles.line}>
            See what the wallets you follow buy on Brew, with a record you can check.
          </ThemedText>
        </View>
        <SignInOptions />
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six + Spacing.three,
    paddingBottom: Spacing.four,
  },
  intro: {
    gap: Spacing.threeHalf,
  },
  line: {
    fontSize: 20,
    lineHeight: 27,
    maxWidth: 300,
  },
});

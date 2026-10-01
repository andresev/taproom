import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { WalletSearch } from '@/features/follow/wallet-search';

export default function DiscoverScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <WalletSearch />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

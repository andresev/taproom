import { useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/features/profile/use-session';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/theme';

import { MIN_NAME_QUERY, parseSearchInput } from './search-input';
import type { WalletSummary } from './types';
import { useFollowing } from './use-follows';
import { useWalletSearch } from './use-wallet-search';
import { WalletRow } from './wallet-row';

const SEARCH_DEBOUNCE_MS = 300;

function WalletList({ title, wallets }: { title: string; wallets: WalletSummary[] }) {
  return (
    <FlatList
      data={wallets}
      keyExtractor={(wallet) => wallet.address}
      renderItem={({ item }) => <WalletRow wallet={item} />}
      ListHeaderComponent={<ThemedText type="smallBold">{title}</ThemedText>}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

/** Shown while the search box is empty: the wallets the signed-in user follows. */
function Following() {
  const { session, isLoading } = useSession();
  const following = useFollowing(session?.user.id);

  if (isLoading) return <LoadingState />;
  if (!session) {
    return <EmptyState title="Find wallets to follow" message="Search by wallet address or profile name." />;
  }
  if (following.isPending) return <LoadingState />;
  if (following.isError) {
    return <ErrorState message={following.error.message} onRetry={() => void following.refetch()} />;
  }
  if (following.data.length === 0) {
    return (
      <EmptyState title="You are not following anyone yet" message="Search by wallet address or profile name." />
    );
  }
  return <WalletList title={`Following (${following.data.length})`} wallets={following.data} />;
}

/** The Discover tab: search by address or profile name, or browse who you follow. */
export function WalletSearch() {
  const theme = useTheme();
  const [text, setText] = useState('');
  const input = parseSearchInput(useDebouncedValue(text, SEARCH_DEBOUNCE_MS));
  const results = useWalletSearch(input);

  return (
    <View style={styles.container}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Wallet address or profile name"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        accessibilityLabel="Search wallets"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      {input.kind === 'empty' ? (
        <Following />
      ) : input.kind === 'too-short' ? (
        <EmptyState
          title="Keep typing"
          message={`Enter at least ${MIN_NAME_QUERY} characters of a name, or a full wallet address.`}
        />
      ) : results.isPending ? (
        <LoadingState />
      ) : results.isError ? (
        <ErrorState message={results.error.message} onRetry={() => void results.refetch()} />
      ) : results.data.length === 0 ? (
        <EmptyState title="No profiles found" message="No profile name starts with that text." />
      ) : (
        <WalletList title={input.kind === 'address' ? 'Wallet' : 'Profiles'} wallets={results.data} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
});

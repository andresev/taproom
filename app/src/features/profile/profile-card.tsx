import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { bscscanAddressUrl } from '@/lib/chain/explorer';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { DISPLAY_NAME_MAX, displayNameProblem } from './display-name';
import { useProfile, useUpdateDisplayName } from './use-profile';
import { useSignOut } from './use-sign-out';

/** The signed-in half of the Profile screen: wallet, display name, sign out. */
export function ProfileCard({ userId }: { userId: string }) {
  const theme = useTheme();
  const profile = useProfile(userId);
  const updateName = useUpdateDisplayName(userId);
  const signOut = useSignOut();
  // null until the user edits, so the field follows the saved name.
  const [draft, setDraft] = useState<string | null>(null);

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />;
  }
  if (profile.data === null) {
    return (
      <ThemedView style={styles.container}>
        <EmptyState title="No profile yet" message="You are signed in but have no profile." />
        <Button label="Sign out" onPress={() => signOut.mutate()} loading={signOut.isPending} />
      </ThemedView>
    );
  }

  const { walletAddress, displayName } = profile.data;
  const name = draft ?? displayName ?? '';
  const problem = displayNameProblem(name);
  const unchanged = name.trim() === (displayName ?? '');

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">{displayName ?? shortAddress(walletAddress)}</ThemedText>
      <ExternalLink href={bscscanAddressUrl(walletAddress)}>
        <ThemedText type="code" themeColor="textSecondary">
          {shortAddress(walletAddress, 6)}
        </ThemedText>
      </ExternalLink>

      <ThemedView style={styles.field}>
        <ThemedText type="smallBold">Display name</ThemedText>
        <TextInput
          value={name}
          onChangeText={setDraft}
          placeholder="3 to 32 characters"
          placeholderTextColor={theme.textSecondary}
          maxLength={DISPLAY_NAME_MAX}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Display name"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
        />
        {updateName.isError ? (
          <ThemedText type="small" themeColor="textSecondary">
            {updateName.error.message}
          </ThemedText>
        ) : !unchanged && problem ? (
          <ThemedText type="small" themeColor="textSecondary">
            {problem}
          </ThemedText>
        ) : null}
        <Button
          label="Save name"
          onPress={() => updateName.mutate(name, { onSuccess: () => setDraft(null) })}
          loading={updateName.isPending}
          disabled={unchanged || problem !== null}
        />
      </ThemedView>

      <Link href="/receipts">
        <ThemedText type="linkPrimary">Your receipts</ThemedText>
      </Link>

      <Button label="Sign out" onPress={() => signOut.mutate()} loading={signOut.isPending} />
      {signOut.isError ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sign-out failed: {signOut.error.message}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  field: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  input: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    fontSize: 16,
  },
});

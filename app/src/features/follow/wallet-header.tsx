import type { Address } from '@repo/shared';
import { StyleSheet } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileByWallet } from '@/features/profile/use-profile';
import { bscscanAddressUrl } from '@/lib/chain/explorer';
import { shortAddress } from '@/lib/chain/format';
import { Spacing } from '@/theme';

import { FollowButton } from './follow-button';
import { useFollowerCount } from './use-follows';

/** Top of the wallet screen: who this is, how many follow them, and the follow button. */
export function WalletHeader({ address }: { address: Address }) {
  const profile = useProfileByWallet(address);
  const followers = useFollowerCount(address);

  if (profile.isPending || followers.isPending) return <LoadingState />;
  if (profile.isError || followers.isError) {
    const error = profile.error ?? followers.error;
    return (
      <ErrorState
        message={error?.message ?? 'Could not load this wallet.'}
        onRetry={() => {
          void profile.refetch();
          void followers.refetch();
        }}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">{profile.data?.displayName ?? shortAddress(address)}</ThemedText>
      <ExternalLink href={bscscanAddressUrl(address)}>
        <ThemedText type="code" themeColor="textSecondary">
          {shortAddress(address, 6)}
        </ThemedText>
      </ExternalLink>
      <ThemedText type="small" themeColor="textSecondary">
        {followers.data === 1 ? '1 follower' : `${followers.data} followers`}
        {profile.data === null ? ' · No Taproom profile' : ''}
      </ThemedText>
      <FollowButton address={address} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
});

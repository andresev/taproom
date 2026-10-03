import type { Address } from '@repo/shared';
import { StyleSheet, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { useProfileByWallet } from '@/features/profile/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { bscscanAddressUrl } from '@/lib/chain/explorer';
import { shortAddress } from '@/lib/chain/format';
import { Fonts, Spacing } from '@/theme';

import { FollowButton } from './follow-button';
import { useFollowerCount } from './use-follows';

/** A wallet's stand-in picture: the first letters of its name, or "0x". */
export function WalletAvatar({ name, size = 40 }: { name: string | null; size?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.cardPressed, borderColor: theme.border },
      ]}>
      <ThemedText style={{ fontFamily: Fonts.monoSemibold, fontSize: size * 0.32, color: theme.textSecondary }}>
        {(name ?? '0x').slice(0, 2).toUpperCase()}
      </ThemedText>
    </View>
  );
}

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

  const name = profile.data?.displayName ?? null;
  return (
    <View style={styles.container}>
      <WalletAvatar name={name} size={44} />
      <View style={styles.names}>
        {name ? <ThemedText type="subhead">{name}</ThemedText> : <ThemedText type="mono">{shortAddress(address)}</ThemedText>}
        <ExternalLink href={bscscanAddressUrl(address)}>
          <ThemedText type="small" themeColor="textSecondary">
            {name ? `${shortAddress(address)} · ` : profile.data === null ? 'No Taproom profile · ' : ''}
            {followers.data === 1 ? '1 follower' : `${followers.data} followers`}
          </ThemedText>
        </ExternalLink>
      </View>
      <FollowButton address={address} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
  },
  names: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

import type { Address } from '@repo/shared';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { sessionWalletAddress, useSession } from '@/features/profile/use-session';
import { Spacing } from '@/theme';

import { useIsFollowing, useSetFollowing } from './use-follows';

/**
 * Follow / Unfollow for one wallet. Signed out, it leads to the Profile tab.
 * Renders nothing on the signed-in user's own wallet.
 */
export function FollowButton({ address }: { address: Address }) {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const userId = session?.user.id;
  const isFollowing = useIsFollowing(userId, address);
  const setFollowing = useSetFollowing(userId, address);

  if (isLoading) return <Button label="Follow" onPress={() => {}} disabled />;
  if (!session) return <Button label="Sign in to follow" onPress={() => router.push('/profile')} />;
  if (sessionWalletAddress(session) === address) return null;

  if (isFollowing.isError) {
    return (
      <View style={styles.container}>
        <ThemedText type="small" themeColor="textSecondary">
          Could not load follow status: {isFollowing.error.message}
        </ThemedText>
        <Button label="Try again" onPress={() => void isFollowing.refetch()} />
      </View>
    );
  }

  const following = isFollowing.data === true;
  return (
    <View style={styles.container}>
      <Button
        label={following ? 'Unfollow' : 'Follow'}
        onPress={() => setFollowing.mutate(!following)}
        loading={isFollowing.isPending}
        disabled={setFollowing.isPending}
      />
      {setFollowing.isError ? (
        <ThemedText type="small" themeColor="textSecondary">
          {following ? 'Unfollow' : 'Follow'} failed: {setFollowing.error.message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
  },
});

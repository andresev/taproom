import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { EmptyState, ErrorState, LoadingState } from '@/components/screen-states';
import { ThemedText } from '@/components/themed-text';
import { TokenAvatar } from '@/components/token-avatar';
import { useFollowerCount, useFollowing } from '@/features/follow/use-follows';
import { WalletAvatar } from '@/features/follow/wallet-header';
import { useMyReceipts } from '@/features/receipts/use-my-receipts';
import { formatSlippage } from '@/features/trade/slippage';
import { useSlippageStore } from '@/features/trade/slippage-store';
import { useTheme } from '@/hooks/use-theme';
import { formatTokenAmount, formatUtcDateTime, pairAssetLabel, shortAddress } from '@/lib/chain/format';
import { Fonts, MinTouch, Radius, Spacing, type Theme } from '@/theme';

import { DISPLAY_NAME_MAX, displayNameProblem } from './display-name';
import { useProfile, useUpdateDisplayName } from './use-profile';
import { useSignOut } from './use-sign-out';

/** How many of the newest receipts the Profile tab shows before "See all". */
const RECEIPTS_SHOWN = 3;

function Card({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>;
}

function SettingRow({ theme, icon, label, value, onPress, color }: { theme: Theme; icon: IconName; label: string; value?: string; onPress?: () => void; color?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      style={({ pressed }) => [styles.setting, { borderTopColor: theme.border, backgroundColor: pressed ? theme.cardPressed : 'transparent' }]}>
      <Icon name={icon} color={color ?? theme.textSecondary} />
      <ThemedText style={[styles.grow, color ? { color } : null]}>{label}</ThemedText>
      {value ? (
        <ThemedText type="monoSmall" themeColor="textSecondary">
          {value}
        </ThemedText>
      ) : null}
      {onPress ? <Icon name="chevron" color={theme.textSecondary} size={16} /> : null}
    </Pressable>
  );
}

/** The signed-in half of the Profile tab: who you are, your wallet, your receipts and settings. */
export function ProfileCard({ userId }: { userId: string }) {
  const theme = useTheme();
  const profile = useProfile(userId);
  const updateName = useUpdateDisplayName(userId);
  const signOut = useSignOut();
  const following = useFollowing(userId);
  const walletAddress = profile.data?.walletAddress ?? null;
  const followers = useFollowerCount(walletAddress ?? '0x0000000000000000000000000000000000000000');
  const receipts = useMyReceipts(walletAddress);
  const slippageBps = useSlippageStore((state) => state.slippageBps);
  // null until the user edits, so the field follows the saved name.
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) {
    return <ErrorState message={profile.error.message} onRetry={() => void profile.refetch()} />;
  }
  if (profile.data === null || walletAddress === null) {
    return (
      <View style={styles.missing}>
        <EmptyState title="No profile yet" message="You are signed in but have no profile." />
        <Button label="Sign out" kind="destructive" onPress={() => signOut.mutate()} loading={signOut.isPending} />
      </View>
    );
  }

  const { displayName } = profile.data;
  const name = draft ?? displayName ?? '';
  const problem = displayNameProblem(name);
  const unchanged = name.trim() === (displayName ?? '');
  const shown = receipts.data?.items.slice(0, RECEIPTS_SHOWN) ?? [];

  return (
    <View style={styles.container}>
      <Card theme={theme}>
        <View style={styles.identity}>
          <WalletAvatar name={displayName} size={48} />
          <View style={styles.grow}>
            <ThemedText type="subhead">{displayName ?? shortAddress(walletAddress)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {following.data ? `${following.data.length} following` : '… following'} ·{' '}
              {followers.data === undefined ? '…' : followers.data === 1 ? '1 follower' : `${followers.data} followers`}
            </ThemedText>
          </View>
          <Button label={editing ? 'Close' : 'Edit name'} onPress={() => setEditing(!editing)} />
        </View>

        {editing ? (
          <View style={styles.editor}>
            <TextInput
              value={name}
              onChangeText={setDraft}
              placeholder="3 to 32 characters"
              placeholderTextColor={theme.textSecondary}
              maxLength={DISPLAY_NAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Display name"
              style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
            />
            {updateName.isError ? (
              <ThemedText type="small" themeColor="danger">
                {updateName.error.message}
              </ThemedText>
            ) : !unchanged && problem ? (
              <ThemedText type="small" themeColor="textSecondary">
                {problem}
              </ThemedText>
            ) : null}
            <Button
              label="Save name"
              kind="primary"
              onPress={() =>
                updateName.mutate(name, {
                  onSuccess: () => {
                    setDraft(null);
                    setEditing(false);
                  },
                })
              }
              loading={updateName.isPending}
              disabled={unchanged || problem !== null}
            />
          </View>
        ) : null}

        <View style={[styles.address, { backgroundColor: theme.cardPressed }]}>
          <ThemedText type="monoSmall" selectable numberOfLines={1} style={styles.grow}>
            {walletAddress}
          </ThemedText>
          <Pressable
            onPress={() => void Share.share({ message: walletAddress })}
            accessibilityRole="button"
            accessibilityLabel="Share or copy wallet address"
            style={styles.copy}>
            <Icon name="copy" color={theme.accentText} size={18} />
          </Pressable>
        </View>
      </Card>

      <Card theme={theme}>
        <View style={styles.cardHead}>
          <ThemedText type="bodyStrong">Your receipts</ThemedText>
          <Link href="/receipts">
            <ThemedText type="label" style={{ color: theme.accentText }}>
              See all
            </ThemedText>
          </Link>
        </View>
        {receipts.isPending ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardNote}>
            Loading…
          </ThemedText>
        ) : shown.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.cardNote}>
            {receipts.isError ? 'Your receipts could not be loaded.' : 'No buys from your wallet in the indexed history yet.'}
          </ThemedText>
        ) : (
          shown.map((item) => (
            <Link key={item.id} href={{ pathname: '/receipt/[id]', params: { id: item.id } }} asChild>
              <Pressable
                accessibilityRole="link"
                style={({ pressed }) => [styles.receipt, { borderTopColor: theme.border, backgroundColor: pressed ? theme.cardPressed : 'transparent' }]}>
                <TokenAvatar address={item.token} symbol={item.tokenSymbol} size={32} />
                <View style={styles.grow}>
                  <ThemedText type="mono">{item.tokenSymbol ?? shortAddress(item.token)}</ThemedText>
                  <ThemedText type="monoSmall" themeColor="textSecondary">
                    {formatTokenAmount(item.amountPaid, item.pairDecimals)} {pairAssetLabel(item.pairSymbol, '')} ·{' '}
                    {formatUtcDateTime(item.boughtAt).slice(0, 10)}
                  </ThemedText>
                </View>
                <Icon name="chevron" color={theme.textSecondary} size={16} />
              </Pressable>
            </Link>
          ))
        )}
      </Card>

      <Card theme={theme}>
        <View style={styles.cardHead}>
          <ThemedText type="bodyStrong">Settings</ThemedText>
        </View>
        <SettingRow theme={theme} icon="settings" label="Slippage" value={formatSlippage(slippageBps)} />
        <SettingRow theme={theme} icon="key" label="Export key" value="Not available yet" />
        <SettingRow
          theme={theme}
          icon="close"
          label={signOut.isPending ? 'Signing out…' : 'Sign out'}
          color={theme.danger}
          onPress={() => signOut.mutate()}
        />
      </Card>
      {signOut.isError ? (
        <ThemedText type="small" themeColor="danger">
          Sign-out failed: {signOut.error.message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.twoHalf,
  },
  missing: {
    flex: 1,
    gap: Spacing.three,
    padding: Spacing.four,
  },
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.twoHalf,
  },
  cardNote: {
    paddingHorizontal: Spacing.three - 2,
    paddingBottom: Spacing.twoHalf,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three - 2,
  },
  editor: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three - 2,
    paddingBottom: Spacing.twoHalf,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderWidth: 1,
    fontFamily: Fonts.regular,
    fontSize: 16,
  },
  address: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.three - 2,
    marginBottom: Spacing.three - 2,
    paddingLeft: Spacing.twoHalf,
    borderRadius: Radius.control,
  },
  copy: {
    width: MinTouch,
    height: MinTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: MinTouch,
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.two + 2,
    borderTopWidth: 1,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    minHeight: 50,
    paddingHorizontal: Spacing.three - 2,
    borderTopWidth: 1,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});

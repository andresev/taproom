import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/theme';

/** The four tabs. Brass marks the active one; the rest are quiet. */
export default function AppTabs() {
  const colors = useTheme();

  return (
    <NativeTabs
      backgroundColor={colors.card}
      tintColor={colors.accentText}
      indicatorColor={colors.cardPressed}
      labelStyle={{
        default: { color: colors.textSecondary, fontFamily: Fonts.semibold },
        selected: { color: colors.accentText, fontFamily: Fonts.semibold },
      }}>
      <NativeTabs.Trigger name="feed">
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="portfolio">
        <NativeTabs.Trigger.Label>Portfolio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="wallet.bifold" md="account_balance_wallet" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

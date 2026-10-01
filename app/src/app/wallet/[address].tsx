import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/screen-states';
import { shortAddress } from '@/lib/chain/format';

export default function WalletScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  return <EmptyState title={shortAddress(address)} message="Wallet activity is not available yet." />;
}

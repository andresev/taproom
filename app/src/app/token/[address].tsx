import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/screen-states';
import { shortAddress } from '@/lib/chain/format';

export default function TokenScreen() {
  const { address } = useLocalSearchParams<{ address: string }>();
  return <EmptyState title={shortAddress(address)} message="Token details are not available yet." />;
}

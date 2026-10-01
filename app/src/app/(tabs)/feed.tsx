import { EmptyState } from '@/components/screen-states';

export default function FeedScreen() {
  return (
    <EmptyState
      title="Your feed is empty"
      message="Buys, sells and launches from wallets you follow will show up here."
    />
  );
}

import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { tokenImageUrl } from '@/lib/api/indexer';
import { Fonts } from '@/theme';

/**
 * A token's picture, from the artwork its launch stored on chain (the indexer's
 * /image route). A token with no picture, or one that fails to load, shows the
 * first letters of its symbol.
 */
export function TokenAvatar({ address, symbol, size = 40 }: { address: string; symbol: string | null; size?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const uri = tokenImageUrl(address);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[shape, { backgroundColor: theme.cardPressed }]}
        contentFit="cover"
        cachePolicy="disk"
        accessible={false}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[shape, styles.fallback, { backgroundColor: theme.cardPressed, borderColor: theme.border }]}>
      <ThemedText style={{ fontFamily: Fonts.monoSemibold, fontSize: size * 0.32, color: theme.textSecondary }}>
        {(symbol ?? '?').slice(0, 2).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

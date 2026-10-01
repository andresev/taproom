import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from '@reown/appkit-react-native';

/** AsyncStorage only holds strings; AppKit stores arbitrary JSON values. */
function parse<T>(raw: string | null): T | undefined {
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    // A value written as a plain string by something other than this adapter.
    return raw as T;
  }
}

/**
 * Persistence for AppKit's connection state (recent wallet, WalletConnect
 * session). It holds no keys or seed phrases: those never leave the wallet app.
 */
export const appKitStorage: Storage = {
  getKeys: async () => [...(await AsyncStorage.getAllKeys())],
  getEntries: async <T>() => {
    const keys = await AsyncStorage.getAllKeys();
    const pairs = await AsyncStorage.multiGet(keys);
    return pairs.map(([key, raw]): [string, T] => [key, parse<T>(raw) as T]);
  },
  getItem: async <T>(key: string) => parse<T>(await AsyncStorage.getItem(key)),
  setItem: async (key, value) => AsyncStorage.setItem(key, JSON.stringify(value)),
  removeItem: async (key) => AsyncStorage.removeItem(key),
};

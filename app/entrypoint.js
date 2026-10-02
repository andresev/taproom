// Privy needs these polyfills loaded before anything else, in this order
// (Privy's Expo installation guide). package.json "main" points here.
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';
import 'expo-router/entry';

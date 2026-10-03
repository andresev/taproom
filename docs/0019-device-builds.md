# 0019: Development builds on a real iPhone

Date: 2026-10-02. Status: accepted.

## Context

The app had never run on a device. The owner builds with a free Apple ID, for now,
and Google sign-in; Apple sign-in comes later.

## Decisions

- **One switch leaves Sign in with Apple out of development builds:**
  `EXPO_PUBLIC_APPLE_SIGN_IN=false` in `app/.env`. A free Apple ID (Personal Team)
  cannot sign an app carrying that entitlement.
  - `app/app.config.ts` turns off `usesAppleSignIn`, drops the
    `expo-apple-authentication` plugin, and deletes the entitlement at the end.
    Expo applies that package's plugin whenever it is installed, listed or not, and
    the plugin adds the entitlement unconditionally.
  - `src/lib/api/privy.ts` hides the Apple button to match.
  - Release builds ignore the switch and always offer Apple: an app offering Google
    sign-in must also offer Apple's.
  - Changing it needs `npx expo prebuild --platform ios --clean`. A plain prebuild
    adds entitlements but never removes them.
- **On a phone, `localhost` is the phone.** In `app/.env`, the Supabase, indexer and
  receipt-page URLs use the Mac's address on the local network (for example
  `http://192.168.x.x:42069`). Plain HTTP to it is allowed, because the generated
  iOS project allows local networking (`NSAllowsLocalNetworking`).
- **`app/ios` is generated and git-ignored.** `app.json` and `app.config.ts` are the
  source of truth; a stale root `ios/` from the first scaffold was removed (0001).

## Known limits

- **Builds signed with a free Apple ID expire after seven days** and must be
  re-run.
- **The Mac's local address changes** when the network does; update `app/.env`
  when it does.
- **The phone and the Mac must be on the same Wi-Fi.**

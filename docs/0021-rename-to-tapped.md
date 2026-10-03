# 0021: The app is called Tapped

Date: 2026-10-03. Status: accepted; the owner's decision.

## Context

The app was Taproom from 0001. The owner wanted a shorter name in the manner of
Fomo, considered Tap and a list of others, and chose Tapped: a brew gets tapped,
and the app is built on Brew. This is a naming decision; it serves neither
positioning goal and is not a release requirement.

## Decisions

- **The name people see is Tapped:** under the app icon, on the sign-in screen, on
  the receipt card, on the public receipt page and in all copy.
- **The logo does not change.** The gold "T" spout stands for Tapped as it did for
  Taproom. The gold title "Tapped" is a new outline in
  `app/src/components/gold-lettering.ts`.
- **The identifiers change with it,** at the owner's request, while nothing is
  released and they can still change:

  | Identifier | Was | Now |
  |---|---|---|
  | iOS bundle identifier and Android package | `com.andresvaldez.taproom` | `com.andresvaldez.tapped` |
  | URL scheme | `taproom` | `tapped` |
  | Expo slug | `taproom` | `tapped` |
  | Root package name | `taproom` | `tapped` |
  | Local Supabase project ID | `taproom` | `tapped` |

- **The repo folder is `~/Dev/tapped`,** renamed from `~/Dev/taproom` the same day.
  Its remote is still named for the old one (see below).
- **Every document uses the new name,** at the owner's request: `CLAUDE.md`, the
  READMEs and all earlier decision records, including their identifiers and the
  file name of 0001. This is an exception to "add a dated line, do not rewrite":
  only the name changed, not what any record decided. This record is the one
  place that keeps the old name, so the history is not lost.
- **The Ponder patches' markers now read "Tapped patch".** The patch files and the
  installed copies were changed together, and `patch-package` still applies them.

## What still says Taproom

- **The remote repository,** `github.com/andresev/taproom`. Renaming it is the
  owner's to do, in the repository's settings on GitHub.
- **Git history** before this change.
- **This record.**

## Needed outside the repo

- **Privy dashboard:** allow the app identifier `com.andresvaldez.tapped` and the
  URL scheme `tapped`. Until then sign-in fails with "native app id … not
  allowed", as in 0019.
- **Apple signing:** Xcode creates a new App ID for the new bundle identifier. A
  free Apple ID allows ten new App IDs in seven days.
- **The phone:** the new bundle identifier installs as a separate app. The old
  Taproom app can be deleted.
- **Local Supabase:** the stack is named after the project ID. Stop the old one
  (`npx supabase stop --project-id taproom`) and start again (`npm run db:start`).
  The new stack has an empty database built from the migrations; local profiles
  and follows from the old one do not carry over.

## Known limits

- **The name is close to Tipped** (@Tippedonbrew), another app on Brew, which also
  uses a gold "T" on black. The two may be confused. The owner chose the name
  knowing this.
- **"Tapped out" means out of money.** Copy should not lean on that phrase.
- **Nothing has been checked for availability:** the App Store, trademark
  registers, a domain or an X handle.

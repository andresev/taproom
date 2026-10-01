# 0003: Follow graph and wallet search

Date: 2026-10-01. Status: accepted.

## Context

MVP step 2: follow or unfollow any wallet, and search by address or profile name.
The `follows` table and its row-level security came with the first migration.

## Decisions

- **Display names are unique regardless of case**
  (`supabase/migrations/20261001020000_display_name_case_insensitive.sql`). Names
  are now searchable, so "Alice" and "alice" existing side by side would let one
  pass as the other.
- **Search takes a full address or a name prefix.** A full address always yields
  that wallet, whether or not it has a profile, because any wallet can be followed.
  Anything else matches profile display names by prefix, case-insensitively, from
  three characters, capped at 20 results. A mixed-case address with a wrong EIP-55
  checksum is treated as a typo, not an address.
- **Self-follow is hidden, not forbidden.** The Follow button does not render on
  the signed-in user's own wallet; the database has no rule against it.
- **Follower counts are public** and read with an exact count on every view.

## Known limits

- The "Following" list shows the 200 most recent follows; there is no pagination.
- Name search has no index behind it (`ilike` cannot use the uniqueness index). Add
  a trigram index when the profiles table is large enough to need one.
- There is no "followers" list, only the count.

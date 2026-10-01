-- App-owned data: profiles, the follow graph and push tokens.
-- Trades, tokens and launches are NOT here; the indexer owns those (indexer/ponder.schema.ts).
--
-- Wallet addresses are stored as lowercase hex so they compare with plain equality.

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  wallet_address text not null unique check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  display_name   text unique check (char_length(display_name) between 3 and 32),
  created_at     timestamptz not null default now()
);

create table public.follows (
  follower_id      uuid not null references public.profiles (id) on delete cascade,
  -- Any wallet can be followed, whether or not it has a profile.
  followee_address text not null check (followee_address ~ '^0x[0-9a-f]{40}$'),
  created_at       timestamptz not null default now(),
  primary key (follower_id, followee_address)
);

create index follows_followee_address_idx on public.follows (followee_address);

create table public.push_tokens (
  token      text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create index push_tokens_profile_id_idx on public.push_tokens (profile_id);

alter table public.profiles    enable row level security;
alter table public.follows     enable row level security;
alter table public.push_tokens enable row level security;

-- Profiles and the follow graph are public; push tokens are private to their owner.
create policy "anyone can read profiles" on public.profiles for select to anon, authenticated using (true);
create policy "anyone can read follows"  on public.follows  for select to anon, authenticated using (true);

-- A user can rename themselves but never change which wallet the profile is keyed to.
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy "users update their own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- No insert policy on profiles on purpose: a profile's wallet_address must come from a
-- verified wallet signature, not from the client. The insert path is added with wallet
-- sign-in (MVP step 1).

create policy "users follow as themselves" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "users unfollow as themselves" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

create policy "users manage their own push tokens" on public.push_tokens
  for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

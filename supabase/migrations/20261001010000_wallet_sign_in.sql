-- Wallet sign-in: the insert path for profiles (MVP step 1).
--
-- Supabase Auth verifies a Sign in with Ethereum signature and records the result as an
-- identity with provider 'web3' and provider_id 'web3:ethereum:<checksummed address>'.
-- That row is written only by the auth server after verification, so it is the one
-- trustworthy source for a profile's wallet address. raw_user_meta_data carries the same
-- address but a signed-in user can edit it through auth.updateUser, so it is never read here.

create function public.create_profile_for_wallet_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, wallet_address)
  values (new.user_id, lower(substring(new.provider_id from '^web3:ethereum:(0x[0-9a-fA-F]{40})$')))
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_profile_for_wallet_identity() from public, anon, authenticated;

create trigger create_profile_for_wallet_identity
  after insert on auth.identities
  for each row
  when (new.provider = 'web3' and new.provider_id ~ '^web3:ethereum:0x[0-9a-fA-F]{40}$')
  execute function public.create_profile_for_wallet_identity();

-- Wallets that signed in before this migration ran.
insert into public.profiles (id, wallet_address)
select user_id, lower(substring(provider_id from '^web3:ethereum:(0x[0-9a-fA-F]{40})$'))
from auth.identities
where provider = 'web3' and provider_id ~ '^web3:ethereum:0x[0-9a-fA-F]{40}$'
on conflict (id) do nothing;

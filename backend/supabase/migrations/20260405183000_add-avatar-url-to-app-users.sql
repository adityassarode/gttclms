-- Adds optional profile photo URL to app users and backfills from Supabase Auth metadata.
alter table if exists public.app_users
  add column if not exists avatar_url text;

update public.app_users au
set avatar_url = coalesce(
  u.raw_user_meta_data ->> 'avatar_url',
  u.raw_user_meta_data ->> 'picture'
)
from auth.users u
where au.provider = 'SUPABASE'
  and au.provider_id = u.id::text
  and (
    au.avatar_url is null
    or btrim(au.avatar_url) = ''
  );

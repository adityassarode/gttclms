SELECT 
  au.*,
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture'
  ) AS avatar_url
FROM app_users au
LEFT JOIN auth.users u
ON au.provider_id = u.id::text;
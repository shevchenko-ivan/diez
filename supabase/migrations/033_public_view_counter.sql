-- The song page counts a view by calling this RPC straight from the browser
-- (supabase-js, anon key) instead of through a Vercel function — one less
-- function invocation and CDN request per song view (Vercel Hobby limits).
-- SECURITY DEFINER + fixed search_path: the caller can only add 1 to one
-- variant's counter, nothing else. Abuse is bounded the same way the old
-- route was in practice: the client dedups per variant per session.
GRANT EXECUTE ON FUNCTION public.increment_variant_views(uuid) TO anon, authenticated;

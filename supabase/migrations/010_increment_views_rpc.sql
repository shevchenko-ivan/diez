-- RPC to safely increment song_variants.views.
-- Called from the API route /api/songs/view after page load (fire-and-forget).
CREATE OR REPLACE FUNCTION public.increment_variant_views(v_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.song_variants SET views = views + 1 WHERE id = v_id;
$$;

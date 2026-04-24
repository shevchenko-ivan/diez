-- Rename the default playlist from "Подобається" to "Збережені".
-- Matches UI terminology ("Зберегти", "Збережено") and is semantically
-- closer to the heart-save action than the like-flavoured original.

-- 1. Update the trigger so new users get the new name.
CREATE OR REPLACE FUNCTION public.handle_new_profile_playlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.playlists (owner_id, name, is_default, visibility)
  VALUES (NEW.id, 'Збережені', true, 'private');
  RETURN NEW;
END;
$$;

-- 2. Rename existing default playlists that still carry the original name.
-- Users who manually renamed their default list keep their custom name.
UPDATE public.playlists
   SET name = 'Збережені'
 WHERE is_default = true
   AND name = 'Подобається';

-- Allow admins to read songs in any status (for the admin panel).
-- The service role key bypasses RLS entirely, so this policy is for the
-- case where the admin reads via the session-authenticated client.
-- However in MVP, admin reads use the service role client, so this is
-- a safety net.

CREATE POLICY "songs_select_admin_all" ON songs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

// Artist moderation lives in the `artists.status` column (027_artist_moderation).
// That migration may not be applied yet, so every status-dependent query must
// tolerate the column being absent and fall back to pre-moderation behaviour.
// Postgres reports a missing column as SQLSTATE 42703 (undefined_column).
export function isMissingStatusColumn(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /column\b.*\bstatus\b.*does not exist/i.test(error.message ?? "");
}

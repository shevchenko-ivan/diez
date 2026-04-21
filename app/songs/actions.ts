"use server";

import { getSongsPage, type SongsPageArgs } from "@/features/song/services/songs";
import { type Song } from "@/features/song/types";

export async function fetchSongsPage(args: SongsPageArgs): Promise<{ songs: Song[]; total: number }> {
  return getSongsPage(args);
}

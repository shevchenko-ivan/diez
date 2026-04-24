export type PlaylistVisibility = "private" | "unlisted" | "public";

export interface Playlist {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: PlaylistVisibility;
  isDefault: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  songCount?: number;
  coverImages?: string[];
}

export interface PlaylistSummary {
  id: string;
  name: string;
  isDefault: boolean;
  visibility: PlaylistVisibility;
  hasSong: boolean;
  /** Total songs in the playlist (not scoped to the current song/artist). */
  songCount: number;
}

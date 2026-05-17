import { type Metadata } from "next";

// User profiles contain personal data (saved playlists, edited info)
// and never have indexable value for search. Mirror the admin layout
// in tagging the whole subtree as noindex,nofollow so we don't depend
// solely on robots.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

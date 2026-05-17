import { type Metadata } from "next";

// Auth screens (login, sign-up, forgot-password, etc.) carry no
// indexable content — they're transient flows. Mark the whole subtree
// noindex so Google doesn't list /auth/login above the actual catalogue
// page in brand-search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}

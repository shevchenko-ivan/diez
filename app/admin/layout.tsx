import { type Metadata } from "next";

// Belt-and-suspenders: `robots.ts` already disallows /admin via the
// User-agent: * rule, but those directives are advisory. A meta robots
// tag on every page in this subtree is enforced inside the HTML itself
// and is harder to misconfigure away. If admin URLs ever leak — e.g.,
// via a referrer header — Google still drops them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

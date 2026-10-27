"use client";

import { Pencil } from "lucide-react";
import { AdminOnly } from "@/shared/components/AdminOnly";
import { TeButton } from "@/shared/components/TeButton";

// The edit URL is built here, on the client: children passed to <AdminOnly>
// from a server page are serialized into the RSC payload, and Google picked
// the /admin/artists/edit?id=… hrefs out of it («Indexed, though blocked by
// robots.txt», Search Console 10.2026). Only the bare id reaches the HTML now.
export function AdminEditArtistButton({ artistId }: { artistId: string }) {
  return (
    <AdminOnly>
      <TeButton
        shape="pill"
        href={`/admin/artists/edit?id=${artistId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
        style={{ color: "var(--orange)", borderRadius: "0.75rem" }}
      >
        <Pencil size={12} />
        Редагувати
      </TeButton>
    </AdminOnly>
  );
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { getClient } from "@/lib/supabase/client";

// Renders its children only for signed-in admins, decided on the client — so
// a page can stay static (edge-cached) and still carry its admin controls.
// Guests pay nothing: without the Supabase auth cookie no request is made at
// all. The check runs once per page load and is shared by every <AdminOnly>
// on the page; a negative result is not memoized so a login later in the same
// SPA session is picked up on the next mount.
let adminCheck: Promise<boolean> | null = null;

function checkAdmin(): Promise<boolean> {
  adminCheck ??= (async () => {
    try {
      const sb = await getClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return false;
      const { data } = await sb.from("profiles").select("is_admin").eq("id", user.id).single();
      return !!data?.is_admin;
    } catch {
      return false;
    }
  })().then((ok) => {
    if (!ok) adminCheck = null;
    return ok;
  });
  return adminCheck;
}

export function AdminOnly({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!/(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie)) return;
    let disposed = false;
    checkAdmin().then((ok) => {
      if (!disposed && ok) setShow(true);
    });
    return () => {
      disposed = true;
    };
  }, []);

  return show ? <>{children}</> : null;
}

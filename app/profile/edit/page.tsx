export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { PageShell } from "@/shared/components/PageShell";
import { BackButton } from "@/shared/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditForm } from "@/features/profile/components/ProfileEditForm";

export const metadata = {
  title: "Редагування профілю — Diez",
};

export default async function ProfileEditPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await sb
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", user.id)
    .single();

  const initialName = profile?.username?.trim() || user.email?.split("@")[0] || "";
  const initialAvatarUrl = profile?.avatar_url ?? null;

  return (
    <PageShell footer={false}>
      <div className="max-w-md mx-auto w-full">
        <div className="mb-6 flex items-center gap-3">
          <BackButton fallback="/profile" />
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Редагування профілю
          </h1>
        </div>
        <ProfileEditForm initialName={initialName} initialAvatarUrl={initialAvatarUrl} />
      </div>
    </PageShell>
  );
}

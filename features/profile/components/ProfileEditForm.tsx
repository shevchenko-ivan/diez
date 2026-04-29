"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, User as UserIcon, Loader2 } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { updateMyProfile } from "@/features/profile/actions/profile";

interface Props {
  initialName: string;
  initialAvatarUrl: string | null;
}

export function ProfileEditForm({ initialName, initialAvatarUrl }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialAvatarUrl);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [removeFlag, setRemoveFlag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickFile() {
    fileRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Розмір фото не може перевищувати 2 МБ.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Підтримуються лише JPG, PNG або WebP.");
      return;
    }
    setError(null);
    setPendingFile(file);
    setRemoveFlag(false);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleRemove() {
    setPendingFile(null);
    setPreviewUrl(null);
    setRemoveFlag(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("displayName", name);
    if (pendingFile) fd.set("avatar", pendingFile);
    if (removeFlag && !pendingFile) fd.set("removeAvatar", "true");

    startTransition(async () => {
      const res = await updateMyProfile(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/profile");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="te-surface p-6 md:p-8 flex flex-col gap-6" style={{ borderRadius: "1.5rem" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div
            className="w-28 h-28 rounded-full overflow-hidden te-inset flex items-center justify-center"
            style={{ background: "var(--surface-inset)" }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={44} style={{ color: "var(--text-muted)" }} aria-hidden="true" />
            )}
          </div>
          <button
            type="button"
            onClick={pickFile}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--orange)", color: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
            aria-label="Завантажити фото"
          >
            <Camera size={16} />
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onFileChange}
        />

        {previewUrl && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs font-medium flex items-center gap-1.5 hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            <Trash2 size={12} /> Видалити фото
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="display-name" className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          Ім&apos;я
        </label>
        <input
          id="display-name"
          type="text"
          required
          minLength={2}
          maxLength={40}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="te-inset px-4 py-3 rounded-2xl text-sm"
          style={{ color: "var(--text)", background: "var(--surface-inset)" }}
          placeholder="Як до вас звертатись"
        />
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--danger, #e11d48)" }}>{error}</p>
      )}

      <div className="flex gap-3 mt-2">
        <TeButton
          shape="pill"
          type="submit"
          disabled={isPending}
          className="flex-1 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? "Збереження..." : "Зберегти"}
        </TeButton>
        <TeButton
          shape="pill"
          type="button"
          onClick={() => router.push("/profile")}
          className="px-4 py-3 text-sm font-medium"
          style={{ color: "var(--text-mid)" }}
        >
          Скасувати
        </TeButton>
      </div>
    </form>
  );
}

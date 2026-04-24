"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Link as LinkIcon, Lock, Plus, X } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { SegmentedTabs, type SegmentedTabOption } from "@/shared/components/SegmentedTabs";
import { createPlaylist } from "../actions/playlists";
import type { PlaylistVisibility } from "../types";

const VIS_OPTIONS: SegmentedTabOption<PlaylistVisibility>[] = [
  { value: "private", label: "Приватний", icon: Lock },
  { value: "unlisted", label: "За посиланням", icon: LinkIcon },
];

export function CreatePlaylistButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<PlaylistVisibility>("private");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const res = await createPlaylist({ name: trimmed, visibility });
      if (!res.ok) {
        setError(res.message ?? "Не вдалося створити список");
        return;
      }
      setName("");
      setOpen(false);
      router.push(`/profile/lists/${res.data.id}`);
    });
  };

  return (
    <>
      <TeButton shape="pill" onClick={() => setOpen(true)} className="px-4 py-2 text-xs font-bold tracking-widest">
        <Plus size={14} strokeWidth={2} />
        Новий список
      </TeButton>

      {open && (
        <CreateModal
          name={name}
          setName={setName}
          visibility={visibility}
          setVisibility={setVisibility}
          onCancel={() => { setOpen(false); setName(""); setError(null); }}
          onCreate={handleCreate}
          isPending={isPending}
          error={error}
        />
      )}
    </>
  );
}

interface ModalProps {
  name: string;
  setName: (v: string) => void;
  visibility: PlaylistVisibility;
  setVisibility: (v: PlaylistVisibility) => void;
  onCancel: () => void;
  onCreate: () => void;
  isPending: boolean;
  error: string | null;
}

function CreateModal(props: ModalProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={props.onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="te-surface p-6 max-w-sm w-full flex flex-col gap-4 relative"
        style={{ borderRadius: "1.25rem" }}
      >
        <button
          type="button"
          onClick={props.onCancel}
          aria-label="Закрити"
          className="absolute top-3 right-3 inline-flex items-center justify-center rounded-full"
          style={{ width: 28, height: 28, color: "var(--text-muted)", background: "transparent" }}
        >
          <X size={16} strokeWidth={2} />
        </button>
        <h2 className="text-base font-bold" style={{ color: "var(--text)" }}>
          Новий список
        </h2>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-widest mb-2 block" style={{ color: "var(--text-muted)" }}>
            Видимість
          </label>
          <SegmentedTabs
            options={VIS_OPTIONS}
            value={props.visibility}
            onChange={props.setVisibility}
            ariaLabel="Видимість списку"
          />
        </div>
        <input
          type="text"
          placeholder="Назва"
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && props.onCreate()}
          autoFocus
          className="te-inset px-4 py-3 rounded-xl bg-transparent outline-none text-sm font-medium"
          style={{ color: "var(--text)" }}
        />
        {props.error && (
          <p className="text-xs" style={{ color: "#e11d48" }}>{props.error}</p>
        )}
        <TeButton
          shape="pill"
          onClick={props.onCreate}
          disabled={!props.name.trim() || props.isPending}
          className="justify-center py-2.5 text-xs font-bold"
        >
          Створити
        </TeButton>
      </div>
    </div>,
    document.body,
  );
}

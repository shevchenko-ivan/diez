"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, UserPlus, ImagePlus, Crop } from "lucide-react";
import { submitArtist } from "@/features/artist/actions/submit";
import { MAX_IMAGE_BYTES, MAX_IMAGE_LABEL, formatMb } from "@/lib/upload-limits";
import { ImageCropper } from "@/shared/components/ImageCropper";

const MIN_PHOTO_BYTES = 8 * 1024;        // reject near-empty / over-compressed thumbnails
const MIN_PHOTO_DIMENSION = 400;         // square-ish, usable on the artist page
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Read the natural dimensions of an image file (for the min-size gate).
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

interface Props {
  /** Prefill from what the user already typed in the artist field. */
  initialName: string;
  onClose: () => void;
  /** Called with the created/matched artist so the form can select it. */
  onCreated: (artist: { id: string; slug: string; name: string; photo_url: string | null }) => void;
}

export function ArtistCreateModal({ initialName, onClose, onCreated }: Props) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Size of the picked file when it's over the limit — the photo stays
  // attached (croppping re-encodes it down) but creation is blocked.
  const [oversize, setOversize] = useState<number | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  // Revoke the object URL when the preview changes or the modal unmounts.
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  /** Attach a file and swap the preview, revoking the previous blob URL. */
  function attach(f: File) {
    setFile(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function pickFile(f: File | null) {
    if (!f) return;
    if (!ALLOWED_PHOTO_TYPES.includes(f.type)) {
      setError("Підтримуються лише JPG, PNG або WebP.");
      return;
    }
    // Over the limit: keep the photo attached and point at the cropper —
    // re-encoding a crop brings a phone-sized file down by an order of
    // magnitude. Creation stays blocked meanwhile.
    if (f.size > MAX_IMAGE_BYTES) {
      setOversize(f.size);
      setError(
        `Файл ${formatMb(f.size)} — це більше за ліміт у ${MAX_IMAGE_LABEL}. `
        + "Скадруйте його кнопкою «Кадрувати» — фото стиснеться, — або виберіть інше.",
      );
      attach(f);
      return;
    }
    if (f.size < MIN_PHOTO_BYTES) {
      setError("Зображення замале або надто стиснуте. Завантажте якісніше фото.");
      return;
    }
    // Reject tiny images — they look broken on the artist page.
    try {
      const { width, height } = await readImageSize(f);
      if (width < MIN_PHOTO_DIMENSION || height < MIN_PHOTO_DIMENSION) {
        setError(`Замале зображення (${width}×${height}). Потрібно щонайменше ${MIN_PHOTO_DIMENSION}×${MIN_PHOTO_DIMENSION} px.`);
        return;
      }
    } catch {
      setError("Не вдалося прочитати зображення. Спробуйте інший файл.");
      return;
    }
    setOversize(null);
    setError(null);
    attach(f);
  }

  /** The cropper always returns a 1000×1000 JPEG, so every gate above passes. */
  function handleCropped(cropped: File) {
    setOversize(null);
    setError(null);
    attach(cropped);
    setCropOpen(false);
  }

  function clearFile() {
    setFile(null);
    setOversize(null);
    setError(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreate() {
    if (!name.trim()) { setError("Вкажіть виконавця."); return; }
    if (!file) { setError("Додайте фото виконавця."); return; }
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("name", name.trim());
    if (bio.trim()) fd.set("bio", bio.trim());
    if (file) fd.set("photo", file);
    // The action reaches the server over fetch(). If that fetch itself fails —
    // offline, a photo the platform rejects before our code sees it, a deploy
    // mid-session — the promise rejects, and an uncaught rejection here would
    // escalate to the error boundary and destroy the add-song form underneath
    // along with the user's typed lyrics. Keep the failure inside the modal.
    let res: Awaited<ReturnType<typeof submitArtist>>;
    try {
      res = await submitArtist(fd);
    } catch (err) {
      console.error("[ArtistCreateModal] submit transport failure", err);
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      setPending(false);
      setError(
        offline
          ? "Немає зʼєднання з інтернетом. Дані у формі збереглися — увімкніть мережу та спробуйте ще раз."
          : `Не вдалося надіслати запит на сервер. Спробуйте ще раз; якщо не допомагає — зменште фото (до ${MAX_IMAGE_LABEL}) кнопкою «Кадрувати».`,
      );
      return;
    }
    setPending(false);
    if (res.ok) {
      onCreated(res.artist);
      onClose();
    } else {
      setError(res.message);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="te-surface w-full max-w-sm p-6 relative"
        style={{ borderRadius: "1.5rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрити"
          className="te-icon-btn"
          style={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, color: "var(--text-muted)", zIndex: 1 }}
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-5 pr-8">
          <UserPlus size={18} style={{ color: "var(--orange)" }} />
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Новий виконавець</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>Виконавець *</label>
            <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                placeholder="Гурт, виконавець або кілька — напр. Океан Ельзи"
                className="w-full bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
              />
            </div>
          </div>

          {/* Photo upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Фото *
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {previewUrl ? (
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  style={{ boxShadow: oversize ? "0 0 0 2px #dc3c3c" : undefined }}
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-left"
                    style={{ color: "var(--text-mid)" }}
                  >
                    Змінити фото
                  </button>
                  <button
                    type="button"
                    onClick={() => setCropOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-left"
                    style={{ color: "var(--text-mid)" }}
                  >
                    <Crop size={12} /> Кадрувати
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-xs font-bold text-left"
                    style={{ color: "#dc3c3c" }}
                  >
                    Прибрати
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="te-inset w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold"
                style={{ borderRadius: "1rem", color: "var(--text-mid)" }}
              >
                <ImagePlus size={16} /> Завантажити фото
              </button>
            )}
            <p className="text-[11px]" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
              JPG, PNG або WebP, до {MAX_IMAGE_LABEL}. Краще квадратне фото, від 400×400 px.
            </p>
          </div>

          {/* Description / bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Опис <span className="normal-case tracking-normal opacity-60">(необовʼязково)</span>
            </label>
            <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Кілька слів про виконавця: звідки, жанр, цікаві факти…"
                className="w-full bg-transparent outline-none text-sm font-normal resize-y"
                style={{ color: "var(--text)" }}
              />
            </div>
            <p className="text-[11px] text-right" style={{ color: "var(--text-muted)" }}>{bio.length}/1000</p>
          </div>

          {error && <p className="text-xs" style={{ color: "#dc3c3c" }}>{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-bold" style={{ color: "var(--text-muted)" }}>
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={pending || !name.trim() || !file || !!oversize}
              className="te-pill-btn px-5 py-2.5 text-sm font-bold disabled:opacity-50"
            >
              {pending ? "Створюємо…" : "Створити"}
            </button>
          </div>
        </div>

        {cropOpen && file && (
          <ImageCropper
            file={file}
            maxBytes={MAX_IMAGE_BYTES}
            heading="Кадрувати фото"
            onCancel={() => setCropOpen(false)}
            onCropped={handleCropped}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

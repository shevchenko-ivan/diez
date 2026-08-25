"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, ZoomIn, Loader2 } from "lucide-react";

/**
 * Square image cropper — drag to pan, slider (or wheel / pinch) to zoom.
 *
 * Deliberately dependency-free: the whole job is one <canvas> drawImage call
 * with a source rectangle, and a cropper library would be a bigger download
 * than the feature. Re-encoding through the canvas is also what keeps uploads
 * under the platform's request-body cap — a 9 MB phone photo comes back out at
 * a few hundred KB, so oversized files stop being a dead end.
 */

/** Rendered size of the crop viewport, in CSS pixels. */
const VIEWPORT = 300;
/** Edge of the exported square. Covers every place a cover is displayed. */
const OUTPUT_SIZE = 1000;
/** Tried in order until the result fits `maxBytes`. */
const QUALITY_STEPS = [0.85, 0.7, 0.55, 0.4];
const MAX_ZOOM = 4;

interface Props {
  file: File;
  /** Refuse to hand back anything larger than this (bytes). */
  maxBytes: number;
  onCancel: () => void;
  onCropped: (file: File) => void;
}

export function ImageCropper({ file, maxBytes, onCancel, onCropped }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  // Natural pixel size of the decoded image; null until it has loaded.
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  // `scale` is absolute: viewport pixels per image pixel.
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Hand the blob URL to the rendered <img> and let the DOM decode it. Loading
  // through a detached `new Image()` instead would race this effect's cleanup:
  // the URL gets revoked before the decode finishes and every open reports a
  // broken file.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNat(null);
    setLoadError(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** Centre the image at "cover" scale once its real dimensions are known. */
  function handleLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    const fit = Math.max(VIEWPORT / w, VIEWPORT / h);
    setNat({ w, h });
    setMinScale(fit);
    setScale(fit);
    setOffset({ x: (VIEWPORT - w * fit) / 2, y: (VIEWPORT - h * fit) / 2 });
  }

  /** Keep the image covering the viewport — no empty gutters at any zoom. */
  const clamp = useCallback(
    (next: { x: number; y: number }, s: number, size: { w: number; h: number }) => ({
      x: Math.min(0, Math.max(VIEWPORT - size.w * s, next.x)),
      y: Math.min(0, Math.max(VIEWPORT - size.h * s, next.y)),
    }),
    [],
  );

  /** Zoom around the viewport centre so the framing doesn't jump. */
  const applyZoom = useCallback(
    (nextScale: number) => {
      if (!nat) return;
      const s = Math.min(minScale * MAX_ZOOM, Math.max(minScale, nextScale));
      setScale((prev) => {
        const centreX = (VIEWPORT / 2 - offset.x) / prev;
        const centreY = (VIEWPORT / 2 - offset.y) / prev;
        setOffset(clamp({ x: VIEWPORT / 2 - centreX * s, y: VIEWPORT / 2 - centreY * s }, s, nat));
        return s;
      });
    },
    [nat, minScale, offset.x, offset.y, clamp],
  );

  function onPointerDown(e: React.PointerEvent) {
    if (!nat) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d || !nat) return;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, scale, nat));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  async function confirm() {
    const image = imgRef.current;
    if (!image || !nat) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas unavailable");
      // Source rectangle = the slice of the original currently under the viewport.
      const sx = -offset.x / scale;
      const sy = -offset.y / scale;
      const side = VIEWPORT / scale;
      ctx.drawImage(image, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

      let blob: Blob | null = null;
      for (const q of QUALITY_STEPS) {
        blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
        if (blob && blob.size <= maxBytes) break;
      }
      if (!blob) throw new Error("не вдалося створити зображення");
      const base = file.name.replace(/\.[^.]+$/, "") || "cover";
      onCropped(new File([blob], `${base}.jpg`, { type: "image/jpeg" }));
    } catch {
      setLoadError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Кадрування обкладинки"
    >
      <div className="te-surface w-full max-w-sm p-6 space-y-4" style={{ borderRadius: "1.5rem" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold" style={{ color: "var(--text)" }}>Кадрувати обкладинку</h3>
          <button type="button" onClick={onCancel} aria-label="Закрити" style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {loadError ? (
          <p className="text-sm" style={{ color: "#dc3c3c", lineHeight: 1.55 }}>
            Не вдалося обробити це зображення. Спробуйте інший файл.
          </p>
        ) : (
          <>
            <p className="text-[11px]" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
              Перетягніть зображення, щоб вибрати кадр, і масштабуйте повзунком. Обкладинка
              збережеться квадратною, {OUTPUT_SIZE}×{OUTPUT_SIZE}.
            </p>

            <div
              className="relative mx-auto overflow-hidden te-inset touch-none"
              style={{ width: VIEWPORT, height: VIEWPORT, borderRadius: "1rem", cursor: nat ? "grab" : "default" }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={(e) => applyZoom(scale * (e.deltaY < 0 ? 1.08 : 0.93))}
            >
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  src={src}
                  alt=""
                  draggable={false}
                  onLoad={handleLoad}
                  onError={(e) => { if (e.currentTarget.src === src) setLoadError(true); }}
                  style={{
                    position: "absolute",
                    left: offset.x,
                    top: offset.y,
                    width: nat ? nat.w * scale : 0,
                    height: nat ? nat.h * scale : 0,
                    maxWidth: "none",
                    visibility: nat ? "visible" : "hidden",
                  }}
                />
              )}
              {!nat && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                </div>
              )}
            </div>

            <label className="flex items-center gap-3">
              <ZoomIn size={15} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              <span className="sr-only">Масштаб</span>
              <input
                type="range"
                min={1}
                max={MAX_ZOOM}
                step={0.01}
                value={minScale > 0 ? scale / minScale : 1}
                onChange={(e) => applyZoom(minScale * Number(e.target.value))}
                disabled={!nat}
                className="w-full"
                style={{ accentColor: "var(--orange)" }}
              />
            </label>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={confirm}
                disabled={!nat || busy}
                className="te-pill-btn flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Застосувати
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-3 text-sm font-bold"
                style={{ color: "var(--text-muted)" }}
              >
                Скасувати
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

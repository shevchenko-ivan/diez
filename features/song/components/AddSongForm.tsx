"use client";

import { useState, useRef, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, CheckCircle2, Clock, XCircle, UserPlus, FileText, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { submitSong, updateMySubmission, deleteMySubmission } from "@/features/song/actions/submit";
import { russianLevel } from "@/features/song/lib/detectLang";
import { slugify } from "@/lib/slugify";
import type { Artist } from "@/features/artist/services/artists";
import type { StrumPattern } from "@/features/song/types";
import { StrumPatternsEditor } from "@/features/song/components/StrumPatternsEditor";
import { SimpleStrumPicker } from "@/features/song/components/SimpleStrumPicker";
import { ArtistCreateModal } from "@/features/artist/components/ArtistCreateModal";

/** Existing song being edited — prefilled into the form. */
export interface InitialSong {
  songId: string;
  title: string;
  artist: string;
  genre: string;
  key: string;
  difficulty: string;
  lyricsRaw: string;
  status: string;
  patterns: StrumPattern[];
}

interface Props {
  artists?: Artist[];
  /** Admin submissions publish directly; user submissions go through the language gate. */
  isAdmin?: boolean;
  /** "edit" reuses the form to update an existing submission. */
  mode?: "create" | "edit";
  initial?: InitialSong;
}

export function AddSongForm({ artists: initialArtists = [], isAdmin = false, mode = "create", initial }: Props) {
  const router = useRouter();
  const isEdit = mode === "edit" && !!initial;

  // In edit mode the action is bound to the song id; otherwise it inserts.
  const action = isEdit ? updateMySubmission.bind(null, initial!.songId) : submitSong;
  const [result, formAction, pending] = useActionState(action, null);

  const [artists, setArtists] = useState<Artist[]>(initialArtists);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [input, setInput] = useState(initial?.artist ?? "");           // what user types
  const [selected, setSelected] = useState(initial?.artist ?? "");     // confirmed artist name
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Controlled — React 19 resets uncontrolled fields after a form action
  // returns, which would wipe the whole song text on a validation error.
  const [lyrics, setLyrics] = useState(initial?.lyricsRaw ?? "");
  // In edit mode the RU dialog is dismissable back to the form (the user fixes
  // the text in place); reset on each new submit so a repeat offence re-opens it.
  const [ruDismissed, setRuDismissed] = useState(false);
  // Live language check — soft = a few Russian words (nudge), hard = blocked.
  const [lyricsLevel, setLyricsLevel] = useState(() => russianLevel(initial?.lyricsRaw ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);

  const slugPreview = slugify(title);

  const suggestions = input.trim().length > 0
    ? artists.filter((a) => a.name.toLowerCase().includes(input.toLowerCase())).slice(0, 8)
    : [];

  const exactMatch = artists.some((a) => a.name.toLowerCase() === input.trim().toLowerCase());
  const canCreate = input.trim().length > 1 && !exactMatch;

  function pick(name: string) {
    setSelected(name);
    setInput(name);
    setShowSuggestions(false);
  }

  function handleCreated(artist: { id: string; slug: string; name: string; photo_url: string | null }) {
    setArtists((prev) =>
      prev.some((a) => a.id === artist.id)
        ? prev
        : [...prev, { id: artist.id, slug: artist.slug, name: artist.name, photo_url: artist.photo_url ?? undefined }],
    );
    pick(artist.name);
  }

  function handleInput(val: string) {
    setInput(val);
    setSelected("");
    setShowSuggestions(true);
  }

  function handleBlur() {
    setTimeout(() => setShowSuggestions(false), 150);
  }

  // Deletes the given draft (or the song being edited). The explicit id matters
  // in create mode: `initial` is undefined there, but the RU flow has already
  // auto-saved a draft whose id comes back in the action result.
  async function handleDeleteDraft(songId?: string) {
    const target = songId ?? initial?.songId;
    if (!target) return;
    setDeleting(true);
    const res = await deleteMySubmission(target);
    if (res.ok) router.push("/profile");
    else { setDeleting(false); alert(res.message ?? "Не вдалося видалити."); }
  }

  const finalArtist = selected || input;

  // ── Russian-text result: the song was auto-saved as a draft. Show a clear
  //    dialog explaining it won't be published, with ways out. ──────────────────
  if (result?.ok && result.ru && !ruDismissed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }}>
        <div className="te-surface w-full max-w-md p-7 space-y-4" style={{ borderRadius: "1.5rem" }}>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(220,60,60,0.12)" }}>
              <AlertTriangle size={20} style={{ color: "#dc3c3c" }} />
            </span>
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Текст схожий на російський</h3>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            Платформа не публікує пісні російською мовою. Ми зберегли цю пісню у ваших
            чернетках — у каталозі вона не зʼявиться. Виправте текст українською або
            видаліть чернетку.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            {isEdit ? (
              /* Already on the edit page — a link to the same URL would be a
                 no-op. Dismiss the dialog back to the form instead (the typed
                 text survives — the fields are controlled). */
              <button
                type="button"
                onClick={() => setRuDismissed(true)}
                className="te-pill-btn w-full text-center px-5 py-3 text-sm font-bold"
              >
                Виправити текст
              </button>
            ) : (
              <Link
                href={`/profile/songs/${result.songId}/edit`}
                className="te-pill-btn w-full text-center px-5 py-3 text-sm font-bold"
              >
                Виправити текст
              </Link>
            )}
            <button
              type="button"
              onClick={() => handleDeleteDraft(result.songId)}
              disabled={deleting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold rounded-full text-red-500 hover:bg-red-500/10 disabled:opacity-60"
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Видалити чернетку
            </button>
            <Link href="/profile" className="w-full text-center px-5 py-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
              Лишити в чернетках
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Success states (non-RU) — replace the form with a result banner. ─────────
  if (result?.ok) {
    return (
      <div className="te-surface p-8 text-center space-y-4" style={{ borderRadius: "1.5rem" }}>
        {result.status === "published" ? (
          <>
            <CheckCircle2 size={40} style={{ color: "var(--orange)", margin: "0 auto" }} />
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              {isEdit ? "Зміни збережено й опубліковано!" : "Пісню опубліковано!"}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Дякуємо за внесок у каталог.</p>
            <Link href={`/songs/${result.slug}`} className="inline-block te-pill-btn px-6 py-3 text-sm font-bold">
              Переглянути пісню →
            </Link>
          </>
        ) : result.status === "draft" ? (
          <>
            <FileText size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Збережено як чернетку</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Чернетка доступна лише вам. Поверніться до неї будь-коли, щоб доповнити й надіслати на перевірку.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
              <Link href={`/profile/songs/${result.songId}/edit`} className="inline-block te-pill-btn px-6 py-3 text-sm font-bold">
                Продовжити редагування
              </Link>
              <Link href="/profile" className="inline-block px-6 py-3 text-sm font-bold" style={{ color: "var(--text-mid)" }}>
                До профілю
              </Link>
            </div>
          </>
        ) : (
          <>
            <Clock size={40} style={{ color: "var(--text-muted)", margin: "0 auto" }} />
            <h3 className="text-lg font-bold" style={{ color: "var(--text)" }}>Надіслано на перевірку</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Пісня зʼявиться в каталозі після перевірки модератором. Зазвичай це швидко — статус видно у профілі.
            </p>
            <Link href="/profile" className="inline-block te-pill-btn px-6 py-3 text-sm font-bold">
              До профілю
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={() => setRuDismissed(false)} className="space-y-8">
      {/* Default button for implicit (Enter-key) submission — first submit
          button in tree order wins, so Enter means «Надіслати», not draft. */}
      <button type="submit" name="intent" value="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
      <input type="hidden" name="artist" value={finalArtist} />
      {/* Preserve metadata not exposed in the form so an edit doesn't reset it. */}
      {isEdit && initial && (
        <>
          <input type="hidden" name="genre" value={initial.genre} />
          <input type="hidden" name="key" value={initial.key} />
          <input type="hidden" name="difficulty" value={initial.difficulty} />
        </>
      )}

      {/* Error / rejection banner */}
      {result && !result.ok && (
        <div className="flex items-start gap-3 p-4" style={{ borderRadius: "1rem", background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.25)" }}>
          <XCircle size={18} style={{ color: "#dc3c3c", flexShrink: 0, marginTop: 1 }} />
          <p className="text-sm" style={{ color: "var(--text)" }}>{result.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="add-song-title" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>
            Назва пісні *
          </label>
          <div className="te-inset px-4 py-3" style={{ borderRadius: "1rem" }}>
            <input
              id="add-song-title"
              name="title"
              required
              aria-required="true"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Напр. Без бою"
              className="w-full bg-transparent outline-none text-sm font-medium"
              style={{ color: "var(--text)" }}
            />
          </div>
          {slugPreview && (
            <p className="ml-1 text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
              slug: <span style={{ color: "var(--orange-text)" }}>{slugPreview}</span>
            </p>
          )}
        </div>

        {/* Artist autocomplete */}
        <div className="space-y-2">
          <label htmlFor="add-song-artist" className="text-xs font-bold tracking-widest uppercase ml-1" style={{ color: "var(--text-muted)" }}>
            Виконавець *
          </label>
          <div className="relative">
            <div className="te-inset px-4 py-3 flex items-center gap-2" style={{ borderRadius: "1rem" }}>
              {selected && artists.find(a => a.name === selected)?.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={artists.find(a => a.name === selected)!.photo_url!} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
              )}
              <input
                id="add-song-artist"
                ref={inputRef}
                value={input}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => input.trim() && setShowSuggestions(true)}
                onBlur={handleBlur}
                placeholder="Напр. Океан Ельзи"
                required
                aria-required="true"
                className="w-full bg-transparent outline-none text-sm font-medium"
                style={{ color: "var(--text)" }}
                autoComplete="off"
              />
            </div>

            {showSuggestions && (suggestions.length > 0 || canCreate) && (
              <div className="absolute z-10 w-full mt-1 te-surface overflow-hidden" style={{ borderRadius: "1rem", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
                {suggestions.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onMouseDown={() => pick(a.name)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm font-medium transition-colors hover:bg-[rgba(0,0,0,0.04)]"
                    style={{ color: "var(--text)" }}
                  >
                    {a.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-7 h-7 rounded-full te-inset flex-shrink-0" />
                    )}
                    <span>{a.name}</span>
                    {a.genre && <span className="ml-auto text-xs opacity-40">{a.genre}</span>}
                  </button>
                ))}
                {canCreate && (
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setShowSuggestions(false); setCreateOpen(true); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-bold transition-colors hover:bg-[rgba(255,140,60,0.08)]"
                    style={{ color: "var(--orange)", borderTop: suggestions.length > 0 ? "1px solid var(--surface-dk)" : undefined }}
                  >
                    <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,140,60,0.12)" }}>
                      <UserPlus size={15} />
                    </span>
                    <span>Створити «{input.trim()}»</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strumming pattern — above the lyrics so the user can set the groove
          right away. Draft mode (no live songId): serialized into a hidden
          `strumming_patterns` field. Admins get the full editor; regular users
          get the simplified picker. In edit mode both are seeded with the
          song's existing patterns so saving doesn't wipe them. */}
      <div className="te-inset p-5" style={{ borderRadius: "1.5rem" }}>
        {isAdmin
          ? <StrumPatternsEditor initial={initial?.patterns ?? []} allowTemplates />
          : <SimpleStrumPicker initial={initial?.patterns} />}
      </div>

      <div className="space-y-2">
        <label htmlFor="add-song-lyrics" className="text-xs font-bold tracking-widest uppercase ml-1 flex items-baseline justify-between" style={{ color: "var(--text-muted)" }}>
          <span>Текст і акорди *</span>
          <span className="hidden sm:inline text-[10px] opacity-70 normal-case tracking-normal">
            Акорди в дужках [Am]. Секції розділяйте порожнім рядком. Назва секції з двокрапкою: &quot;Приспів:&quot;
          </span>
        </label>
        <div
          className="te-inset p-4"
          style={{
            borderRadius: "1.5rem",
            boxShadow:
              lyricsLevel === "hard" ? "inset 0 0 0 1.5px rgba(220,60,60,0.55)"
              : lyricsLevel === "soft" ? "inset 0 0 0 1.5px rgba(230,150,40,0.5)"
              : undefined,
          }}
        >
          <textarea
            id="add-song-lyrics"
            name="lyrics_with_chords"
            required
            aria-required="true"
            aria-invalid={lyricsLevel === "hard"}
            rows={12}
            value={lyrics}
            onChange={(e) => { setLyrics(e.target.value); setLyricsLevel(russianLevel(e.target.value)); }}
            placeholder={`Куплет 1:\n[Am]Вставай, мила [C]моя, вставай\n[G]Більшого вимагай\n\nПриспів:\n[F]Ти моя, [C]моя земля\n[G]Ти моє тепле [Am]вогнище`}
            className="w-full bg-transparent outline-none text-sm font-medium min-h-[200px] resize-y font-mono leading-relaxed"
            style={{ color: "var(--text)" }}
          />
        </div>

        {/* Live language warning — soft (a couple of Russian words → gentle
            nudge, still submittable) vs hard (substantially Russian → blocked).
            Both appear the moment text is typed or pasted. */}
        {lyricsLevel === "hard" && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3.5 mt-1"
            style={{ borderRadius: "0.9rem", background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.28)" }}
          >
            <AlertTriangle size={16} style={{ color: "#dc3c3c", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "var(--text)", lineHeight: 1.55 }}>
              <span className="font-bold">Текст містить російську.</span> Платформа не публікує пісні
              російською мовою — це порушує правила публікації, тож таку пісню не буде опубліковано.
              Подайте текст українською (чи іншою мовою, крім російської).
            </p>
          </div>
        )}
        {lyricsLevel === "soft" && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3.5 mt-1"
            style={{ borderRadius: "0.9rem", background: "rgba(230,150,40,0.10)", border: "1px solid rgba(230,150,40,0.32)" }}
          >
            <AlertTriangle size={16} style={{ color: "#c8801e", flexShrink: 0, marginTop: 1 }} />
            <p className="text-xs" style={{ color: "var(--text)", lineHeight: 1.55 }}>
              <span className="font-bold">У тексті є кілька російських слів.</span> Краще замінити їх
              українськими відповідниками. Пісню можна надіслати — її перегляне модератор.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 space-y-3">
        {!isAdmin && (
          <p className="text-[11px] sm:text-right" style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            Пісню перевірить модератор перед публікацією — у каталозі вона зʼявиться після підтвердження.{" "}
            <Link href="/terms" target="_blank" className="underline" style={{ color: "var(--text-mid)" }}>
              Правила публікації
            </Link>.
          </p>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
          {/* Delete (edit mode only) — far left */}
          {isEdit && (
            confirmDelete ? (
              <span className="flex items-center gap-2 sm:mr-auto text-xs" style={{ color: "var(--text-muted)" }}>
                Видалити пісню?
                <button type="button" onClick={() => handleDeleteDraft()} disabled={deleting} className="font-bold text-red-500 disabled:opacity-60">
                  {deleting ? "Видаляємо…" : "Так"}
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting} className="font-bold" style={{ color: "var(--text-mid)" }}>Ні</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 text-xs font-bold sm:mr-auto text-red-500">
                <Trash2 size={14} /> Видалити
              </button>
            )
          )}

          {/* Save as draft — formNoValidate: the server accepts a title-only
              draft, so native required-field validation must not block it. */}
          <button
            type="submit"
            name="intent"
            value="draft"
            formNoValidate
            disabled={pending || !title.trim()}
            className="te-pressable inline-flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ border: "1px solid var(--border, rgba(0,0,0,0.15))", color: "var(--text-mid)" }}
          >
            <FileText size={15} /> Зберегти чернеткою
          </button>

          {/* Primary submit */}
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={!finalArtist.trim() || pending}
            className="te-pill-btn inline-flex items-center justify-center gap-3 px-8 py-4 text-sm font-bold tracking-widest disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {pending ? "ЗБЕРІГАЄМО…" : isAdmin ? (isEdit ? "ЗБЕРЕГТИ Й ОПУБЛІКУВАТИ" : "ОПУБЛІКУВАТИ") : "НАДІСЛАТИ"}
          </button>
        </div>
      </div>

      {createOpen && (
        <ArtistCreateModal
          initialName={input.trim()}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </form>
  );
}

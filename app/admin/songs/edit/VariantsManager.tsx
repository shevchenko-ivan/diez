import Link from "next/link";
import { Plus, Star, Trash2 } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { setPrimaryVariant, deleteVariant } from "@/features/song/actions/admin";

interface VariantRow {
  id: string;
  label: string;
  created_at: string;
  views: number | null;
  key: string;
}

interface Props {
  songId: string;
  songSlug: string;
  primaryVariantId: string | null;
  variants: VariantRow[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function VariantsManager({ songId, songSlug, primaryVariantId, variants }: Props) {
  return (
    <div className="te-surface p-8 md:p-10" style={{ borderRadius: "2rem" }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold uppercase tracking-tighter" style={{ color: "var(--text)" }}>
          Варіанти ({variants.length})
        </h2>
        <TeButton
          shape="pill"
          href={`/admin/songs/variants/new?songId=${songId}`}
          className="px-4 py-2 flex items-center gap-2 text-xs font-bold"
        >
          <Plus size={13} />
          Додати варіант
        </TeButton>
      </div>

      <ul className="space-y-2">
        {variants.map((v) => {
          const isPrimary = v.id === primaryVariantId;
          return (
            <li
              key={v.id}
              className="te-inset p-4 flex items-center gap-3 flex-wrap"
              style={{ borderRadius: "1rem" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" style={{ color: "var(--text)" }}>
                    {v.label}
                  </span>
                  {isPrimary && (
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase px-1.5 py-0.5"
                      style={{
                        borderRadius: 4,
                        color: "var(--orange)",
                        background: "rgba(255,140,60,0.12)",
                      }}
                    >
                      Основний
                    </span>
                  )}
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "var(--text-muted)", opacity: 0.6 }}
                  >
                    {v.key}
                  </span>
                </div>
                <div
                  className="flex items-center gap-3 mt-0.5 text-[11px]"
                  style={{ color: "var(--text-muted)", opacity: 0.7 }}
                >
                  <span>{formatDate(v.created_at)}</span>
                  <span>{(v.views ?? 0).toLocaleString("uk-UA")} переглядів</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/songs/${songSlug}?v=${v.id}`}
                  className="te-pressable px-3 py-1.5 text-xs font-bold"
                  style={{ borderRadius: "0.75rem", color: "var(--text-muted)" }}
                >
                  Відкрити
                </Link>

                {!isPrimary && (
                  <form action={setPrimaryVariant}>
                    <input type="hidden" name="songId" value={songId} />
                    <input type="hidden" name="variantId" value={v.id} />
                    <button
                      type="submit"
                      className="te-pressable px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      style={{ borderRadius: "0.75rem", color: "var(--orange)" }}
                      title="Зробити основним"
                    >
                      <Star size={12} />
                      Основний
                    </button>
                  </form>
                )}

                {!isPrimary && (
                  <form action={deleteVariant}>
                    <input type="hidden" name="variantId" value={v.id} />
                    <button
                      type="submit"
                      className="te-pressable px-2.5 py-1.5 text-xs font-bold"
                      style={{ borderRadius: "0.75rem", color: "var(--danger, #e46060)" }}
                      title="Видалити варіант"
                    >
                      <Trash2 size={13} />
                    </button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

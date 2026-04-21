import Link from "next/link";
import { Plus } from "lucide-react";

interface VariantTab {
  id: string;
  label: string;
}

interface Props {
  songId: string;
  activeVariantId: string;
  primaryVariantId: string | null;
  variants: VariantTab[];
  basePath: string;
  fromParam?: string;
}

export function VariantTabs({ songId, activeVariantId, primaryVariantId, variants, basePath, fromParam }: Props) {
  const q = (variantId: string) => {
    const params = new URLSearchParams({ id: songId, variant: variantId });
    if (fromParam) params.set("from", fromParam);
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-end gap-1 px-2 mb-0 relative z-10">
      {variants.map((v) => {
        const isActive = v.id === activeVariantId;
        const isPrimary = v.id === primaryVariantId;
        return (
          <Link
            key={v.id}
            href={q(v.id)}
            scroll={false}
            className="inline-flex items-center gap-1.5 px-4 text-xs font-bold transition-all"
            style={{
              borderTopLeftRadius: "0.9rem",
              borderTopRightRadius: "0.9rem",
              paddingTop: isActive ? 10 : 8,
              paddingBottom: isActive ? 16 : 10,
              background: isActive ? "var(--surface)" : "rgba(255,255,255,0.04)",
              color: isActive ? "var(--orange)" : "var(--text-muted)",
              boxShadow: isActive
                ? "0 -2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "inset 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            <span>{v.label}</span>
            {isPrimary && (
              <span
                className="text-[8px] font-bold tracking-widest uppercase px-1 py-0.5"
                style={{
                  borderRadius: 3,
                  color: "var(--orange)",
                  background: "rgba(255,140,60,0.12)",
                }}
              >
                Осн.
              </span>
            )}
          </Link>
        );
      })}
      <Link
        href={`/admin/songs/variants/new?songId=${songId}`}
        className="inline-flex items-center gap-1 px-4 text-xs font-bold transition-all"
        style={{
          borderTopLeftRadius: "0.9rem",
          borderTopRightRadius: "0.9rem",
          paddingTop: 8,
          paddingBottom: 10,
          background: "rgba(255,140,60,0.08)",
          color: "var(--orange)",
        }}
      >
        <Plus size={12} strokeWidth={2.4} />
        Новий варіант
      </Link>
    </div>
  );
}

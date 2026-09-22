"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { TeButton } from "@/shared/components/TeButton";
import { getSavedSlugsList } from "@/features/home/actions";
import { toast } from "@/shared/components/Toaster";

const SLUGS_KEY = "diez:random-saved:slugs";
const LAST_KEY = "diez:random-saved:last";

/** Every storage access is best-effort — private mode throws on all of them. */
function readCachedSlugs(): string[] | null {
  try {
    const raw = sessionStorage.getItem(SLUGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedSlugs(list: string[]) {
  try {
    sessionStorage.setItem(SLUGS_KEY, JSON.stringify(list));
  } catch {
    /* nothing worth breaking the button over */
  }
}

function readLastSlug(): string | null {
  try {
    return sessionStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

function writeLastSlug(slug: string) {
  try {
    sessionStorage.setItem(LAST_KEY, slug);
  } catch {
    /* see above */
  }
}

/** Never hand back the song we just opened, unless it is the only one saved. */
function pick(list: string[], last: string | null): string | null {
  if (list.length === 0) return null;
  const pool = list.length > 1 && last ? list.filter((s) => s !== last) : list;
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

/**
 * "Випадкова пісня" — opens one of the user's saved songs at random.
 * Requested by a reader who wanted to just start playing something instead of
 * scrolling their own lists.
 *
 * The slugs are fetched on click, not on page load: only whoever presses the
 * button needs them, and this page already renders per request. Both the list
 * and the last pick live in sessionStorage rather than component state —
 * pressing the button navigates away and unmounts this component, so state
 * would be gone by the time the user comes back and presses again. That is
 * exactly when not repeating the song they just saw matters.
 */
export function RandomSavedSongButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      try {
        const list = readCachedSlugs() ?? (await getSavedSlugsList());
        writeCachedSlugs(list);
        const next = pick(list, readLastSlug());
        if (!next) {
          toast("У збережених ще немає пісень");
          return;
        }
        writeLastSlug(next);
        router.push(`/songs/${next}`);
      } catch {
        toast("Не вдалося підібрати пісню — спробуйте ще раз");
      }
    });
  };

  return (
    <TeButton
      shape="pill"
      onClick={handleClick}
      disabled={pending}
      aria-label="Підібрати випадкову пісню зі збережених"
      className="px-4 py-2 text-xs font-bold tracking-widest"
    >
      <Shuffle size={14} strokeWidth={2} />
      {pending ? "Підбираємо…" : "Випадкова пісня"}
    </TeButton>
  );
}

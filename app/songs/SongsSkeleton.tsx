import { Skeleton } from "@/shared/components/Skeleton";

// Suspense fallback for /songs. Mirrors SongsContent's layout — header block
// (h1, subtitle, search pill + submit), heading/sort row, then 80px song rows
// (p-3 + 56px cover) — so the streamed-in content lands in place and the
// footer starts below the fold instead of jumping a full screen down.
export function SongsSkeleton() {
  return (
    <>
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-80 max-w-full mb-4" />
        <div className="flex items-center gap-3 w-full">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col items-start gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-9 w-52 rounded-full" />
      </div>
      <ul className="flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 p-3" style={{ borderRadius: "1rem" }}>
            <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

import { Skeleton } from "@/shared/components/Skeleton";

// Suspense fallbacks for /profile/lists and /profile/lists/[id]. Both mirror
// the final layout of their page (same wrappers, gaps and breakpoints as
// ListsContent / PlaylistManager) so the streamed-in content replaces the
// skeleton in place: the footer starts below the fold and never jumps. The
// old one-line "Завантаження..." fallback parked the footer near the top of
// the viewport and the swap alone cost ~0.7 field CLS on these pages.

export function ListsSkeleton() {
  return (
    <>
      <div className="mb-10">
        <Skeleton className="h-8 md:h-10 w-44 md:w-64 mb-3 md:mb-5" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <div className="-mt-6 mb-10">
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col">
            <div className="w-full aspect-[4/3] relative">
              <Skeleton
                className="absolute"
                style={{ width: "55%", aspectRatio: "1 / 1", left: "22.5%", top: "15%" }}
              />
            </div>
            <div className="px-1 mt-2">
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="px-1 mt-1.5">
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ManageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 gap-y-3 mb-2">
        <div className="justify-self-start">
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <div className="col-span-3 md:col-span-1 md:col-start-3 flex justify-center md:justify-end">
          <Skeleton className="h-9 w-56 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3" style={{ borderRadius: "1rem" }}>
            <Skeleton className="w-16 h-16 rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

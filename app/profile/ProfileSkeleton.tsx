import { Skeleton } from "@/shared/components/Skeleton";

// Suspense fallback for /profile. Mirrors ProfileDashboard's layout — avatar
// card + menu card in the sidebar, two card-grid sections in the content
// column — so the streamed-in dashboard replaces the skeleton in place
// instead of popping in from a one-line loading message.
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      <aside className="w-full md:w-80 flex flex-col gap-6 shrink-0">
        <div className="p-8 flex flex-col items-center" style={{ borderRadius: "2rem" }}>
          <Skeleton className="w-24 h-24 mb-4 rounded-full" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-44 mb-8" />
          <div className="flex gap-4 w-full">
            <Skeleton className="flex-1 h-[66px] rounded-2xl" />
            <Skeleton className="flex-1 h-[66px] rounded-2xl" />
          </div>
        </div>
        <div className="flex flex-col gap-2 p-4" style={{ borderRadius: "1.5rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-xl" />
          ))}
        </div>
      </aside>
      <div className="flex-1 w-full space-y-12">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s}>
            <div className="mb-6">
              <Skeleton className="h-7 w-48" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col">
                  <Skeleton className="w-full aspect-square" style={{ borderRadius: "0.7rem" }} />
                  <div className="mt-2.5 px-0.5">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <div className="mt-1.5 px-0.5">
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

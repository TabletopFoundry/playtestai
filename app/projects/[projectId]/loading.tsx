import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { TopNav } from "@/components/chrome/top-nav";

export default function ProjectLoading() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-8 focus:outline-none sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-10 w-72" />
                <Skeleton className="mt-3 h-4 w-full max-w-xl" />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-3 h-8 w-12" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-28 rounded-full" />
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
                <Skeleton className="h-5 w-24" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-3xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

import { SkeletonCard } from "@/components/ui/skeleton";
import { TopNav } from "@/components/chrome/top-nav";

export default function ProjectsLoading() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-12 focus:outline-none sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
            <div className="mt-3 h-10 w-64 animate-pulse rounded-xl bg-white/5" />
            <div className="mt-3 h-4 w-96 animate-pulse rounded bg-white/5" />
          </div>
          <div className="h-12 w-40 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    </div>
  );
}

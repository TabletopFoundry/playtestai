export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-7 w-48" />
      <Skeleton className="mt-4 h-4 w-full max-w-md" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-8 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="rounded-3xl border border-white/10 overflow-hidden">
      <div className="bg-slate-950/70 px-4 py-3">
        <Skeleton className="h-3 w-full" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="border-t border-white/10 px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

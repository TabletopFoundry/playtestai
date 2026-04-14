"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ProjectError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Project error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md rounded-[2rem] border border-rose-500/30 bg-white/5 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-rose-300">Error</p>
        <h2 className="mt-4 text-2xl font-semibold text-white">Failed to load project</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          {error.message || "Could not load this project. It may have been deleted or the data is corrupted."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            Try again
          </button>
          <Link
            href="/projects"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            Back to projects
          </Link>
        </div>
      </div>
    </div>
  );
}

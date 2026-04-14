"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#060816] px-4">
      <div className="max-w-md rounded-[2rem] border border-rose-500/30 bg-white/5 p-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-rose-300">Something went wrong</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">Unexpected error</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

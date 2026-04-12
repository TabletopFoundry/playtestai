import Link from "next/link";
import { GitBranchPlus, Sparkles } from "lucide-react";

export function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060816]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-cyan-200">PlaytestAI</p>
            <p className="text-xs text-slate-400">Board game balance lab</p>
          </div>
        </Link>

        <nav className="flex items-center gap-3 text-sm text-slate-300">
          <Link href="/projects" className="rounded-full border border-white/10 px-4 py-2 transition hover:border-cyan-400/40 hover:text-white">
            Projects
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
          >
            <GitBranchPlus className="h-4 w-4" />
            New project
          </Link>
        </nav>
      </div>
    </header>
  );
}

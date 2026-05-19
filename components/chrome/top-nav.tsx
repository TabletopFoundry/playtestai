"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranchPlus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/projects",
    label: "Projects",
    isActive: (pathname: string) => pathname === "/projects" || (pathname.startsWith("/projects/") && pathname !== "/projects/new"),
  },
  {
    href: "/status",
    label: "Status",
    isActive: (pathname: string) => pathname === "/status",
  },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const newProjectActive = pathname === "/projects/new";

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#060816]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 self-start rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-cyan-200">PlaytestAI</p>
            <p className="text-xs text-slate-400">Board game balance lab</p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-3 text-sm text-slate-300" aria-label="Primary">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full border px-4 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                  active ? "border-cyan-400/40 bg-cyan-400/10 text-white" : "border-white/10 hover:border-cyan-400/40 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/projects/new"
            aria-current={newProjectActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 font-medium text-slate-950 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
              newProjectActive ? "bg-cyan-300" : "bg-cyan-400 hover:bg-cyan-300",
            )}
          >
            <GitBranchPlus className="h-4 w-4" />
            New project
          </Link>
        </nav>
      </div>
    </header>
  );
}

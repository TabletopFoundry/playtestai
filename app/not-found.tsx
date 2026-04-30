import Link from "next/link";
import { TopNav } from "@/components/chrome/top-nav";

export default function NotFound() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main id="main-content" tabIndex={-1} className="flex min-h-[70vh] items-center justify-center px-4 focus:outline-none">
        <div className="max-w-md text-center">
          <p className="font-mono text-7xl font-bold text-cyan-200">404</p>
          <h1 className="mt-4 text-2xl font-semibold text-white">Page not found</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-cyan-400 px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              Go home
            </Link>
            <Link
              href="/projects"
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              View projects
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

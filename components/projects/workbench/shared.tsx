import { cn } from "@/lib/utils";

/** Shared dark-theme styles for Recharts Tooltip components */
export const darkTooltipProps = {
  contentStyle: { backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem" },
  labelStyle: { color: "#94a3b8" },
  itemStyle: { color: "#e2e8f0" },
} as const;

export function MetricCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "accent" | "warn" }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className={cn("mt-3 font-mono text-2xl text-white", tone === "accent" && "text-cyan-200", tone === "warn" && "text-amber-200")}>{value}</p>
    </div>
  );
}

export function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {description ? <p className="text-sm text-slate-400">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

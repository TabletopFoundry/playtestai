"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WinConditionType } from "@/lib/types";

const initialState = {
  name: "",
  description: "",
  playerCountMin: 2,
  playerCountMax: 4,
  winConditionType: "highest_score" as WinConditionType,
};

export function CreateProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to create project.");
      }

      const payload = (await response.json()) as { projectId: string };
      router.push(`/projects/${payload.projectId}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200">Create project</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Launch a new balance lab</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Start with the included starter deck, then edit cards, resources, and variants inside the workbench.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Project name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
            placeholder="Spellforge Arena"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Description</span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
            placeholder="What are you testing?"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Minimum players</span>
          <input
            type="number"
            min={2}
            max={6}
            value={form.playerCountMin}
            onChange={(event) => setForm((current) => ({ ...current, playerCountMin: Number(event.target.value) }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Maximum players</span>
          <input
            type="number"
            min={2}
            max={6}
            value={form.playerCountMax}
            onChange={(event) => setForm((current) => ({ ...current, playerCountMax: Number(event.target.value) }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
          />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-slate-300">Win condition</span>
          <select
            value={form.winConditionType}
            onChange={(event) => setForm((current) => ({ ...current, winConditionType: event.target.value as WinConditionType }))}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40"
          >
            <option value="highest_score">Highest score</option>
            <option value="first_to_x">First to X</option>
            <option value="last_standing">Last player standing</option>
          </select>
        </label>
      </div>

      {error ? <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating project..." : "Create project"}
      </button>
    </form>
  );
}

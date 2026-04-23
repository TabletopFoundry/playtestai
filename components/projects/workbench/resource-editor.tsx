"use client";

import { Plus, Trash2 } from "lucide-react";
import type { GameVersion } from "@/lib/types";
import { SectionCard } from "./shared";

interface ResourceEditorProps {
  workingVersion: GameVersion;
  setWorkingVersion: (version: GameVersion) => void;
  onDeleteResource: (index: number) => void;
}

export function ResourceEditor({ workingVersion, setWorkingVersion, onDeleteResource }: ResourceEditorProps) {
  const updateResource = (index: number, field: keyof GameVersion["resources"][number], value: string | number) => {
    setWorkingVersion({
      ...workingVersion,
      resources: workingVersion.resources.map((resource, resourceIndex) =>
        resourceIndex === index ? { ...resource, [field]: value } : resource,
      ),
    });
  };

  return (
    <SectionCard title="Resource definition" description="Resources are aggregated into the economy model for the MVP simulation engine.">
      {/* Column headers for resource editor (QW-1) */}
      {workingVersion.resources.length > 0 && (
        <div className="mb-3 hidden gap-3 px-4 text-xs uppercase tracking-[0.25em] text-slate-500 md:grid md:grid-cols-[1.3fr_repeat(2,minmax(0,1fr))_auto]">
          <span>Name</span>
          <span>Start amount</span>
          <span>Per turn</span>
          <span className="invisible">Actions</span>
        </div>
      )}
      <div className="space-y-3">
        {workingVersion.resources.map((resource, index) => (
          <div key={resource.id} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4 md:grid-cols-[1.3fr_repeat(2,minmax(0,1fr))_auto]">
            <label className="space-y-1">
              <span className="text-xs text-slate-500 md:hidden">Name</span>
              <input value={resource.name} onChange={(event) => updateResource(index, "name", event.target.value)} placeholder="Resource name" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500 md:hidden">Start amount</span>
              <input type="number" value={resource.startAmount} onChange={(event) => updateResource(index, "startAmount", Number(event.target.value))} placeholder="0" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500 md:hidden">Per turn</span>
              <input type="number" value={resource.gainPerTurn} onChange={(event) => updateResource(index, "gainPerTurn", Number(event.target.value))} placeholder="1" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
            </label>
            <button
              type="button"
              onClick={() => onDeleteResource(index)}
              aria-label={`Delete resource ${resource.name}`}
              className="rounded-2xl border border-white/10 px-4 py-3 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setWorkingVersion({ ...workingVersion, resources: [...workingVersion.resources, { id: crypto.randomUUID(), name: "New resource", startAmount: 0, gainPerTurn: 1 }] })} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
        <Plus className="h-4 w-4" />
        Add resource
      </button>
    </SectionCard>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Trash2 } from "lucide-react";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { WorkbenchState } from "./types";
import { SectionCard } from "./shared";

interface VersionSidebarProps {
  state: WorkbenchState;
}

export function VersionSidebar({ state }: VersionSidebarProps) {
  const {
    project,
    selectedVersionId,
    selectedRunId,
    setSelectedRunId,
    setActiveTab,
    syncVersionSelection,
    setStatusMessage,
    setErrorMessage,
    updateFromResponse,
  } = state;

  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ type: "project" | "version" | "run"; id: string; label: string } | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;

    const target = deleteTarget;
    let response: Response | null = null;
    let closeDialog = false;
    setErrorMessage(null);

    try {
      if (target.type === "project") {
        response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
        if (response.ok) {
          closeDialog = true;
          router.push("/projects");
          return;
        }
      } else if (target.type === "version") {
        response = await fetch(`/api/projects/${project.id}/versions/${target.id}`, { method: "DELETE" });
        if (response.ok) {
          const nextProject = await updateFromResponse(response);
          setStatusMessage(`Deleted version "${target.label}".`);
          if (selectedVersionId === target.id && nextProject.versions[0]) {
            syncVersionSelection(nextProject, nextProject.versions[0].id);
          }
          closeDialog = true;
        }
      } else {
        response = await fetch(`/api/projects/${project.id}/runs/${target.id}`, { method: "DELETE" });
        if (response.ok) {
          await updateFromResponse(response);
          setStatusMessage(`Deleted run "${target.label}".`);
          closeDialog = true;
        }
      }

      if (!response?.ok) {
        const payload = (await response?.json()) as { error?: string } | undefined;
        throw new Error(payload?.error ?? "Delete failed.");
      }
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Delete failed.");
    } finally {
      if (closeDialog) {
        setDeleteTarget(null);
      }
    }
  }

  return (
    <aside className="space-y-6">
      <ConfirmDialog
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.type ?? "item"}?`}
        description={
          deleteTarget?.type === "project"
            ? `This will permanently delete "${deleteTarget.label}" and all its versions and simulation runs. This cannot be undone.`
            : deleteTarget?.type === "version"
              ? `This will permanently delete version "${deleteTarget?.label}" and all associated simulation runs. This cannot be undone.`
              : `This will permanently delete the simulation run "${deleteTarget?.label}". This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

      <SectionCard title="Versions" description="Published versions are locked. Editing a published version creates a new draft.">
        <div className="space-y-3">
          {project.versions.map((version) => (
            <div key={version.id} className="group relative">
              <button
                type="button"
                onClick={() => syncVersionSelection(project, version.id)}
                className={cn(
                  "w-full rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                  selectedVersionId === version.id ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-slate-950/60 hover:border-cyan-400/20",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {version.published && <Lock className="h-3.5 w-3.5 text-cyan-400" aria-label="Published (locked)" />}
                    <p className="font-medium text-white">{version.label}</p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">{formatDate(version.updatedAt)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  {version.published ? "Published · " : "Draft · "}{version.cards.length} cards · {version.resources.length} resources · {version.winConditionType.replaceAll("_", " ")}
                </p>
              </button>
              <div className="absolute right-2 top-2 flex gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {!version.published && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/projects/${project.id}/versions/${version.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "publish" }),
                        });
                        await updateFromResponse(response);
                        setStatusMessage(`Published version "${version.label}". It is now locked.`);
                      } catch (caught) {
                        setErrorMessage(caught instanceof Error ? caught.message : "Failed to publish.");
                      }
                    }}
                    aria-label={`Publish version ${version.label}`}
                    className="rounded-xl border border-white/10 p-1.5 text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                  </button>
                )}
                {project.versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "version", id: version.id, label: version.label })}
                    aria-label={`Delete version ${version.label}`}
                    className="rounded-xl border border-white/10 p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Simulation history" description="Saved runs remain attached to the project with core metrics and timestamps.">
        <div className="space-y-3">
          {project.runs.length ? (
            project.runs.map((run) => (
              <div key={run.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRunId(run.id);
                    setActiveTab("dashboard");
                  }}
                  className={cn(
                    "w-full rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
                    selectedRunId === run.id ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-slate-950/60 hover:border-cyan-400/20",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{run.label}</p>
                    <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">{formatDate(run.createdAt)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-3">
                    <span>Balance {Math.round(run.result.summary.overallBalanceScore)}</span>
                    <span>Seat 1 {formatPercent(run.result.summary.firstPlayerAdvantage)}</span>
                    <span>{run.config.games} games</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ type: "run", id: run.id, label: run.label })}
                  aria-label={`Delete run ${run.label}`}
                  className="absolute right-2 top-2 rounded-xl border border-white/10 p-1.5 text-slate-400 opacity-60 transition hover:border-rose-500/40 hover:text-rose-200 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No runs saved yet.</p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Quick guidance" description="What the current workspace is telling you.">
        <div className="space-y-3 text-sm leading-7 text-slate-300">
          <p>Use Rule definition to update cards or import CSV data.</p>
          <p>Use Simulations for full history runs that persist to SQLite.</p>
          <p>Use A/B testing after duplicating a snapshot to get a side-by-side recommendation.</p>
        </div>
      </SectionCard>

      {/* Delete project button (MT-5) */}
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5 sm:p-6">
        <p className="text-sm text-slate-400">Danger zone</p>
        <button
          type="button"
          onClick={() => setDeleteTarget({ type: "project", id: project.id, label: project.name })}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/30 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-500/50 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
        >
          <Trash2 className="h-4 w-4" />
          Delete project
        </button>
      </div>
    </aside>
  );
}

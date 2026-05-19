"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Trash2 } from "lucide-react";
import { cn, formatDate, formatPercent } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getVersionStateLabel } from "./status-utils";
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
  const [deletePending, setDeletePending] = useState(false);
  const [publishVersionId, setPublishVersionId] = useState<string | null>(null);

  async function handlePublishVersion(versionId: string, label: string) {
    if (publishVersionId || deletePending) return;

    setPublishVersionId(versionId);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/versions/${versionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      await updateFromResponse(response);
      setStatusMessage(`Published version "${label}". It is now locked.`);
    } catch (caught) {
      setErrorMessage(caught instanceof Error ? caught.message : "Failed to publish.");
    } finally {
      setPublishVersionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget || deletePending) return;

    const target = deleteTarget;
    let response: Response | null = null;
    let closeDialog = false;
    setDeletePending(true);
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
      setDeletePending(false);
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
        pendingLabel="Deleting..."
        variant="danger"
        busy={deletePending}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deletePending) {
            setDeleteTarget(null);
          }
        }}
      />

      <SectionCard title="Versions" description="Published versions are locked checkpoints. Saving changes from one creates a fresh draft.">
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
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{version.label}</p>
                      <span className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.22em]",
                        version.published
                          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                          : "border-white/10 bg-slate-950/70 text-slate-300",
                      )}>
                        {getVersionStateLabel(version)}
                      </span>
                      {selectedVersionId === version.id ? (
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-100">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-400">
                      {version.cards.length} cards · {version.resources.length} resources · {version.winConditionType.replaceAll("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {version.published ? "Locked checkpoint — save edits to spin up a new draft." : "Editable draft — publish when the metrics are stable."}
                    </p>
                  </div>
                  <span className="font-mono text-xs uppercase tracking-[0.25em] text-slate-500">{formatDate(version.updatedAt)}</span>
                </div>
              </button>
              <div className="absolute right-2 top-2 flex gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                {!version.published && (
                  <button
                    type="button"
                    onClick={() => void handlePublishVersion(version.id, version.label)}
                    disabled={deletePending || publishVersionId !== null}
                    aria-label={`Publish version ${version.label}`}
                    className="rounded-xl border border-white/10 p-1.5 text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  >
                    {publishVersionId === version.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  </button>
                )}
                {project.versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ type: "version", id: version.id, label: version.label })}
                    disabled={deletePending || publishVersionId !== null}
                    aria-label={`Delete version ${version.label}`}
                    className="rounded-xl border border-white/10 p-1.5 text-slate-400 transition hover:border-rose-500/40 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
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
                  disabled={deletePending || publishVersionId !== null}
                  aria-label={`Delete run ${run.label}`}
                  className="absolute right-2 top-2 rounded-xl border border-white/10 p-1.5 text-slate-400 opacity-60 transition hover:border-rose-500/40 hover:text-rose-200 group-hover:opacity-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
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
          disabled={deletePending || publishVersionId !== null}
          className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-500/30 px-4 py-2 text-sm text-rose-200 transition hover:border-rose-500/50 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
        >
          <Trash2 className="h-4 w-4" />
          Delete project
        </button>
      </div>
    </aside>
  );
}

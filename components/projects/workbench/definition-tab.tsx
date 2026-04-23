"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CopyPlus, Loader2, Save } from "lucide-react";
import type { GameVersion } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { WorkbenchState } from "./types";
import { SectionCard } from "./shared";
import { ResourceEditor } from "./resource-editor";
import { CardEditor } from "./card-editor";
import { CsvImportPanel } from "./csv-import-panel";

interface DefinitionTabProps {
  state: WorkbenchState;
  savingProject: boolean;
  savingVersion: boolean;
  handleSaveProject: () => void;
}

export function DefinitionTab({ state, savingProject, savingVersion, handleSaveProject }: DefinitionTabProps) {
  const {
    workingVersion,
    setWorkingVersion,
    projectDraft,
    setProjectDraft,
    setStatusMessage,
    setErrorMessage,
    versionValidation,
    dirty,
    handleSaveVersion,
    handleCreateSnapshot,
    cardStatsInput,
    setCardStatsInput,
  } = state;

  const [confirmAction, setConfirmAction] = useState<{ type: "card" | "resource" | "csv"; index?: number; handler?: () => void } | null>(null);

  // Autosave: debounced save 5 seconds after last edit
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    if (!dirty || !workingVersion) {
      return;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      await handleSaveVersion(true);
      setAutosaveStatus("saved");
      resetTimerRef.current = setTimeout(() => setAutosaveStatus("idle"), 2000);
    }, 5000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, [dirty, workingVersion, handleSaveVersion]);

  const deleteResource = useCallback(
    (index: number) => {
      if (!workingVersion) return;
      setWorkingVersion({
        ...workingVersion,
        resources: workingVersion.resources.filter((_, resourceIndex) => resourceIndex !== index),
      });
    },
    [workingVersion, setWorkingVersion],
  );

  const deleteCard = useCallback(
    (index: number) => {
      if (!workingVersion) return;
      setWorkingVersion({
        ...workingVersion,
        cards: workingVersion.cards.filter((_, cardIndex) => cardIndex !== index),
      });
    },
    [workingVersion, setWorkingVersion],
  );

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.type === "card" && confirmAction.index !== undefined) {
      deleteCard(confirmAction.index);
    } else if (confirmAction.type === "resource" && confirmAction.index !== undefined) {
      deleteResource(confirmAction.index);
    } else if (confirmAction.type === "csv" && confirmAction.handler) {
      confirmAction.handler();
    }
    setConfirmAction(null);
  }, [confirmAction, deleteCard, deleteResource]);

  if (!workingVersion) return null;

  const validationErrors = versionValidation.filter((issue) => issue.severity === "error");
  const validationWarnings = versionValidation.filter((issue) => issue.severity === "warning");

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmAction !== null}
        title={
          confirmAction?.type === "csv"
            ? "Import cards from CSV?"
            : confirmAction?.type === "card"
              ? "Delete card?"
              : "Delete resource?"
        }
        description={
          confirmAction?.type === "csv"
            ? "This will import cards from the CSV file. This cannot be undone."
            : confirmAction?.type === "card"
              ? "This card will be permanently removed from the version. This cannot be undone."
              : "This resource will be permanently removed. This cannot be undone."
        }
        confirmLabel={confirmAction?.type === "csv" ? "Import" : "Delete"}
        variant={confirmAction?.type === "csv" ? "default" : "danger"}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />

      <SectionCard title="Project metadata" description="Keep a high-signal description for collaborators and future reports.">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Project name</span>
            <input value={projectDraft.name} onChange={(event) => setProjectDraft({ ...projectDraft, name: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-slate-300">Description</span>
            <textarea value={projectDraft.description} onChange={(event) => setProjectDraft({ ...projectDraft, description: event.target.value })} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
        </div>
        <button type="button" onClick={handleSaveProject} disabled={savingProject} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
          {savingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save project
        </button>
      </SectionCard>

      <SectionCard title="Version settings" description="Snapshots are immutable checkpoints you can branch from for what-if analysis.">
        {workingVersion.published && (
          <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">
            This version is published and locked. Saving changes will create a new draft version.
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Version label</span>
            <input value={workingVersion.label} onChange={(event) => setWorkingVersion({ ...workingVersion, label: event.target.value })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Min players</span>
            <input type="number" min={2} max={6} value={workingVersion.playerCountMin} onChange={(event) => setWorkingVersion({ ...workingVersion, playerCountMin: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Max players</span>
            <input type="number" min={2} max={6} value={workingVersion.playerCountMax} onChange={(event) => setWorkingVersion({ ...workingVersion, playerCountMax: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Win condition</span>
            <select value={workingVersion.winConditionType} onChange={(event) => setWorkingVersion({ ...workingVersion, winConditionType: event.target.value as GameVersion["winConditionType"] })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
              <option value="highest_score">Highest score</option>
              <option value="first_to_x">First to X</option>
              <option value="last_standing">Last player standing</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Target score</span>
            <input type="number" min={10} value={workingVersion.targetScore} onChange={(event) => setWorkingVersion({ ...workingVersion, targetScore: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Max turns</span>
            <input type="number" min={4} max={30} value={workingVersion.maxTurns} onChange={(event) => setWorkingVersion({ ...workingVersion, maxTurns: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Starting health</span>
            <input type="number" min={8} value={workingVersion.startingHealth} onChange={(event) => setWorkingVersion({ ...workingVersion, startingHealth: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Starting hand size</span>
            <input type="number" min={3} max={8} value={workingVersion.startingHandSize} onChange={(event) => setWorkingVersion({ ...workingVersion, startingHandSize: Number(event.target.value) })} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void handleSaveVersion()} disabled={savingVersion} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            {savingVersion ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save version
          </button>
          <button type="button" onClick={() => void handleCreateSnapshot()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
            <CopyPlus className="h-4 w-4" />
            Create snapshot
          </button>
          {autosaveStatus === "saving" && <span className="text-sm text-slate-400">Saving...</span>}
          {autosaveStatus === "saved" && <span className="text-sm text-cyan-200">Saved</span>}
        </div>
        {dirty ? <p className="mt-3 text-sm text-amber-200">Unsaved changes are ready to snapshot or simulate.</p> : null}
      </SectionCard>

      {/* Validation panel (MT-6) */}
      {versionValidation.length > 0 && (
        <SectionCard title="Validation" description="Issues found with the current version configuration.">
          <div className="space-y-2">
            {validationErrors.map((issue, index) => (
              <div key={`error-${index}`} className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{issue.message}{issue.field ? <span className="ml-1 text-rose-400/60">({issue.field})</span> : null}</span>
              </div>
            ))}
            {validationWarnings.map((issue, index) => (
              <div key={`warn-${index}`} className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>{issue.message}{issue.field ? <span className="ml-1 text-amber-400/60">({issue.field})</span> : null}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      <ResourceEditor
        workingVersion={workingVersion}
        setWorkingVersion={setWorkingVersion}
        onDeleteResource={(index) => setConfirmAction({ type: "resource", index })}
      />

      <SectionCard title="Card & component definition" description="Cards drive the simplified simulation. Custom numeric stats are supported via key:value pairs.">
        <CardEditor
          workingVersion={workingVersion}
          setWorkingVersion={setWorkingVersion}
          cardStatsInput={cardStatsInput}
          setCardStatsInput={setCardStatsInput}
          onDeleteCard={(index) => setConfirmAction({ type: "card", index })}
        />

        <CsvImportPanel
          workingVersion={workingVersion}
          setWorkingVersion={setWorkingVersion}
          setCardStatsInput={setCardStatsInput}
          setStatusMessage={setStatusMessage}
          setErrorMessage={setErrorMessage}
          onConfirmImport={(handler) => setConfirmAction({ type: "csv", handler })}
        />
      </SectionCard>
    </div>
  );
}

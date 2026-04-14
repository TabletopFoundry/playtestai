"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CopyPlus, Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
import type { CardDefinition, GameVersion } from "@/lib/types";
import { parseStatsText, stringifyStats } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { WorkbenchState } from "./types";
import { emptyCard, parseCsvCards } from "./types";
import { SectionCard } from "./shared";

interface DefinitionTabProps {
  state: WorkbenchState;
  savingProject: boolean;
  savingVersion: boolean;
  handleSaveProject: () => void;
}

type CsvImportMode = "replace" | "append";

interface CsvPreview {
  cards: CardDefinition[];
  headers: string[];
  rawRows: string[][];
}

function parseCsvForPreview(csvText: string): CsvPreview {
  const rows = csvText
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split(",").map((cell) => cell.trim()));

  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = rows[0];
  const cards = parseCsvCards(csvText);
  return { cards, headers, rawRows: rows.slice(1) };
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

  const [confirmAction, setConfirmAction] = useState<{ type: "card" | "resource" | "csv"; index?: number } | null>(null);
  const [, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvImportMode, setCsvImportMode] = useState<CsvImportMode>("replace");
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autosave: debounced save 5 seconds after last edit
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setTimeout(() => setAutosaveStatus("idle"), 2000);
    }, 5000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [dirty, workingVersion, handleSaveVersion]);

  const updateResource = useCallback(
    (index: number, field: keyof GameVersion["resources"][number], value: string | number) => {
      if (!workingVersion) return;
      setWorkingVersion({
        ...workingVersion,
        resources: workingVersion.resources.map((resource, resourceIndex) =>
          resourceIndex === index ? { ...resource, [field]: value } : resource,
        ),
      });
    },
    [workingVersion, setWorkingVersion],
  );

  const updateCard = useCallback(
    (index: number, field: keyof CardDefinition, value: string | number | Record<string, number>) => {
      if (!workingVersion) return;
      setWorkingVersion({
        ...workingVersion,
        cards: workingVersion.cards.map((card, cardIndex) =>
          cardIndex === index ? ({ ...card, [field]: value } as CardDefinition) : card,
        ),
      });
    },
    [workingVersion, setWorkingVersion],
  );

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

  const handleFileUpload = useCallback(async (file: File) => {
    setCsvFile(file);
    setCsvError(null);
    setCsvPreview(null);
    try {
      const text = await file.text();
      const preview = parseCsvForPreview(text);
      setCsvPreview(preview);
    } catch (caught) {
      setCsvError(caught instanceof Error ? caught.message : "Failed to parse CSV file.");
    }
  }, []);

  const handleImportCsv = useCallback(() => {
    if (!csvPreview || !workingVersion) return;
    const newCards = csvImportMode === "append"
      ? [...workingVersion.cards, ...csvPreview.cards]
      : csvPreview.cards;
    setWorkingVersion({ ...workingVersion, cards: newCards });
    setCardStatsInput((current: Record<string, string>) => {
      const next = csvImportMode === "append" ? { ...current } : {};
      for (const card of csvPreview.cards) {
        next[card.id] = stringifyStats(card.stats);
      }
      return next;
    });
    setStatusMessage(`Imported ${csvPreview.cards.length} cards from CSV (${csvImportMode}).`);
    setErrorMessage(null);
    setCsvPreview(null);
    setCsvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [csvPreview, csvImportMode, workingVersion, setWorkingVersion, setCardStatsInput, setStatusMessage, setErrorMessage]);

  const handleConfirmAction = useCallback(() => {
    if (!confirmAction) return;
    if (confirmAction.type === "card" && confirmAction.index !== undefined) {
      deleteCard(confirmAction.index);
    } else if (confirmAction.type === "resource" && confirmAction.index !== undefined) {
      deleteResource(confirmAction.index);
    } else if (confirmAction.type === "csv") {
      handleImportCsv();
    }
    setConfirmAction(null);
  }, [confirmAction, deleteCard, deleteResource, handleImportCsv]);

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
            ? `This will ${csvImportMode === "replace" ? "replace all existing cards" : "append to existing cards"}. This cannot be undone.`
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
                onClick={() => setConfirmAction({ type: "resource", index })}
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

      <SectionCard title="Card & component definition" description="Cards drive the simplified simulation. Custom numeric stats are supported via key:value pairs.">
        {/* Column headers for card editor (QW-1) */}
        {workingVersion.cards.length > 0 && (
          <div className="mb-3 hidden gap-3 px-4 text-xs uppercase tracking-[0.25em] text-slate-500 xl:grid xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]">
            <span>Name</span>
            <span>Cost</span>
            <span>Power</span>
            <span>Qty</span>
            <span>Stats</span>
            <span className="invisible">Actions</span>
          </div>
        )}
        <div className="space-y-3">
          {workingVersion.cards.map((card, index) => (
            <div key={card.id} className="grid gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4 xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]">
              <label className="space-y-1">
                <span className="text-xs text-slate-500 xl:hidden">Name</span>
                <input value={card.name} onChange={(event) => updateCard(index, "name", event.target.value)} placeholder="Card name" className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500 xl:hidden">Cost</span>
                <input type="number" value={card.cost} onChange={(event) => updateCard(index, "cost", Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500 xl:hidden">Power</span>
                <input type="number" value={card.power} onChange={(event) => updateCard(index, "power", Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500 xl:hidden">Qty</span>
                <input type="number" value={card.quantity} onChange={(event) => updateCard(index, "quantity", Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-slate-500 xl:hidden">Stats</span>
                <input
                  value={cardStatsInput[card.id] ?? stringifyStats(card.stats)}
                  onChange={(event) => {
                    const input = event.target.value;
                    setCardStatsInput((current: Record<string, string>) => ({ ...current, [card.id]: input }));
                    updateCard(index, "stats", parseStatsText(input));
                  }}
                  placeholder="damage:2, draw:1"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                />
              </label>
              <button
                type="button"
                onClick={() => setConfirmAction({ type: "card", index })}
                aria-label={`Delete card ${card.name}`}
                className="rounded-2xl border border-white/10 px-4 py-3 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              const card = emptyCard();
              setWorkingVersion({ ...workingVersion, cards: [...workingVersion.cards, card] });
              setCardStatsInput((current: Record<string, string>) => ({ ...current, [card.id]: stringifyStats(card.stats) }));
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            <Plus className="h-4 w-4" />
            Add card
          </button>
        </div>

        {/* CSV file upload with preview (MT-2) */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-white">Import cards from CSV</h3>
              <p className="mt-2 text-sm text-slate-400">Headers: name, cost, power, quantity, plus any numeric custom stat columns.</p>
            </div>
            <Upload className="h-5 w-5 text-cyan-200" />
          </div>

          <div className="mt-4">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Choose a CSV file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
                className="block w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
              />
            </label>
          </div>

          {csvError && (
            <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{csvError}</div>
          )}

          {csvPreview && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-300">Preview ({csvPreview.cards.length} cards detected):</p>
              <div className="max-h-48 overflow-auto rounded-2xl border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-[0.25em] text-slate-500">
                    <tr>
                      {csvPreview.headers.map((header) => (
                        <th key={header} scope="col" className="px-3 py-2">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-white/[0.02]">
                    {csvPreview.rawRows.slice(0, 5).map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-3 py-2 text-white">{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {csvPreview.rawRows.length > 5 && (
                      <tr>
                        <td colSpan={csvPreview.headers.length} className="px-3 py-2 text-center text-slate-400">
                          ...and {csvPreview.rawRows.length - 5} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <fieldset>
                  <legend className="sr-only">Import mode</legend>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="csvImportMode" value="replace" checked={csvImportMode === "replace"} onChange={() => setCsvImportMode("replace")} className="accent-cyan-400" />
                      Replace all cards
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input type="radio" name="csvImportMode" value="append" checked={csvImportMode === "append"} onChange={() => setCsvImportMode("append")} className="accent-cyan-400" />
                      Append to existing
                    </label>
                  </div>
                </fieldset>
                <button
                  type="button"
                  onClick={() => setConfirmAction({ type: "csv" })}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                >
                  <Upload className="h-4 w-4" />
                  Import {csvPreview.cards.length} cards
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

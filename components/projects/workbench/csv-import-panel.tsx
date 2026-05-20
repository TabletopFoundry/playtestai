"use client";

import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { CardDefinition, GameVersion } from "@/lib/types";
import { stringifyStats } from "@/lib/utils";
import { parseCsvCards, parseCsvRows } from "./types";

type CsvImportMode = "replace" | "append";

interface CsvPreview {
  cards: CardDefinition[];
  headers: string[];
  rawRows: string[][];
}

function parseCsvForPreview(csvText: string): CsvPreview {
  const rows = parseCsvRows(csvText);

  if (rows.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = rows[0] ?? [];
  const cards = parseCsvCards(csvText);
  return { cards, headers, rawRows: rows.slice(1) };
}

interface CsvImportPanelProps {
  workingVersion: GameVersion;
  setWorkingVersion: (version: GameVersion) => void;
  setCardStatsInput: (input: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  setStatusMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  onConfirmImport: (action: () => void) => void;
}

export function CsvImportPanel({
  workingVersion,
  setWorkingVersion,
  setCardStatsInput,
  setStatusMessage,
  setErrorMessage,
  onConfirmImport,
}: CsvImportPanelProps) {
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvImportMode, setCsvImportMode] = useState<CsvImportMode>("replace");
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
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
    if (!csvPreview) return;
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [csvPreview, csvImportMode, workingVersion, setWorkingVersion, setCardStatsInput, setStatusMessage, setErrorMessage]);

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-white">Import cards from CSV</h3>
          <p className="mt-2 text-sm text-slate-400">Headers: name, cost, power, quantity, optional notes, plus any numeric custom stat columns.</p>
        </div>
        <Upload className="h-5 w-5 text-cyan-200" />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Template</p>
        <code className="mt-3 block overflow-x-auto rounded-2xl bg-slate-950 px-3 py-3 font-mono text-xs text-cyan-200">
          name,cost,power,quantity,score,draw,damage,notes
        </code>
        <p className="mt-3 text-xs leading-6 text-slate-400">
          Every extra numeric column becomes a custom stat automatically, and the optional <code className="rounded bg-slate-950/80 px-1.5 py-0.5 text-cyan-200">notes</code> column is preserved for card-level annotations.
        </p>
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
              onClick={() => onConfirmImport(handleImportCsv)}
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
            >
              <Upload className="h-4 w-4" />
              Import {csvPreview.cards.length} cards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

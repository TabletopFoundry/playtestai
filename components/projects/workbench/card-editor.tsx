"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CardDefinition, GameVersion } from "@/lib/types";
import { parseStatsText, stringifyStats } from "@/lib/utils";
import { emptyCard } from "./types";

interface CardEditorProps {
  workingVersion: GameVersion;
  setWorkingVersion: (version: GameVersion) => void;
  cardStatsInput: Record<string, string>;
  setCardStatsInput: (input: Record<string, string> | ((current: Record<string, string>) => Record<string, string>)) => void;
  onDeleteCard: (index: number) => void;
}

export function CardEditor({ workingVersion, setWorkingVersion, cardStatsInput, setCardStatsInput, onDeleteCard }: CardEditorProps) {
  const cardNameRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [pendingFocusCardId, setPendingFocusCardId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFocusCardId) {
      return;
    }

    const input = cardNameRefs.current[pendingFocusCardId];
    if (input) {
      input.focus();
      input.select();
      setPendingFocusCardId(null);
    }
  }, [pendingFocusCardId, workingVersion.cards]);

  const updateCard = (index: number, field: keyof CardDefinition, value: string | number | Record<string, number>) => {
    setWorkingVersion({
      ...workingVersion,
      cards: workingVersion.cards.map((card, cardIndex) =>
        cardIndex === index ? ({ ...card, [field]: value } as CardDefinition) : card,
      ),
    });
  };

  const handleAddCard = () => {
    const card = emptyCard();
    setWorkingVersion({ ...workingVersion, cards: [...workingVersion.cards, card] });
    setCardStatsInput((current: Record<string, string>) => ({ ...current, [card.id]: stringifyStats(card.stats) }));
    setPendingFocusCardId(card.id);
  };

  return (
    <>
      <div className="mb-4 rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
        Custom stats use <code className="rounded bg-slate-950/80 px-2 py-1 text-cyan-200">key:value</code> pairs such as <code className="rounded bg-slate-950/80 px-2 py-1 text-cyan-200">damage:2, draw:1</code> or <code className="rounded bg-slate-950/80 px-2 py-1 text-cyan-200">shield:3, economy:1</code>. Use notes to capture intended combos, guardrails, or playtest follow-ups per card.
      </div>

      {workingVersion.cards.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-5">
          <h3 className="text-lg font-semibold text-white">No cards defined yet</h3>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            Add a starter card manually or import a CSV below. You only need a small ruleset to generate an early benchmark and start finding balance issues.
          </p>
          <button
            type="button"
            onClick={handleAddCard}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
          >
            <Plus className="h-4 w-4" />
            Add first card
          </button>
        </div>
      ) : null}

      {workingVersion.cards.length > 0 && (
        <>
          <div className="mb-3 hidden gap-3 px-4 text-xs uppercase tracking-[0.25em] text-slate-500 xl:grid xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]">
            <span>Name</span>
            <span>Cost</span>
            <span>Power</span>
            <span>Qty</span>
            <span>Stats</span>
            <span className="invisible">Actions</span>
          </div>
          <div className="space-y-3">
            {workingVersion.cards.map((card, index) => (
              <div key={card.id} className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                <div className="grid gap-3 xl:grid-cols-[1.4fr_repeat(3,minmax(0,110px))_1.6fr_auto]">
                  <label className="space-y-1">
                    <span className="text-xs text-slate-500 xl:hidden">Name</span>
                    <input
                      ref={(element) => {
                        cardNameRefs.current[card.id] = element;
                      }}
                      value={card.name}
                      onChange={(event) => updateCard(index, "name", event.target.value)}
                      placeholder="Card name"
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                    />
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
                    onClick={() => onDeleteCard(index)}
                    aria-label={`Delete card ${card.name}`}
                    className="rounded-2xl border border-white/10 px-4 py-3 text-slate-300 transition hover:border-rose-500/40 hover:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-3 block space-y-1">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Notes</span>
                  <textarea
                    value={card.notes ?? ""}
                    onChange={(event) => updateCard(index, "notes", event.target.value)}
                    rows={2}
                    placeholder="Why this card exists, intended combos, or balance caveats"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                  />
                </label>
              </div>
            ))}
          </div>
        </>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleAddCard}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white transition hover:border-cyan-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
        >
          <Plus className="h-4 w-4" />
          {workingVersion.cards.length === 0 ? "Add starter card" : "Add card"}
        </button>
      </div>
    </>
  );
}

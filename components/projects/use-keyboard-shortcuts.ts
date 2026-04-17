"use client";

import { useEffect } from "react";
import type { ActiveTab } from "./workbench/types";

const TAB_ORDER: ActiveTab[] = ["dashboard", "definition", "simulate", "compare", "report"];

interface KeyboardShortcutOptions {
  onSave: () => void;
  onRunSimulation: () => void;
  onDismissMessages: () => void;
  onSwitchTab: (tab: ActiveTab) => void;
  activeTab: ActiveTab;
}

/** App-wide keyboard shortcuts for the project workbench. */
export function useKeyboardShortcuts({
  onSave,
  onRunSimulation,
  onDismissMessages,
  onSwitchTab,
  activeTab,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      const mod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl+S → Save version
      if (mod && e.key === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      // Cmd/Ctrl+Enter → Run simulation
      if (mod && e.key === "Enter") {
        e.preventDefault();
        onRunSimulation();
        return;
      }

      // Escape → Dismiss status/error banners
      if (e.key === "Escape") {
        onDismissMessages();
        return;
      }

      // Number keys 1-5 → Switch tabs (only when not focused on an input)
      if (!inInput && !mod && !e.altKey && !e.shiftKey) {
        const num = Number(e.key);
        if (num >= 1 && num <= TAB_ORDER.length) {
          e.preventDefault();
          onSwitchTab(TAB_ORDER[num - 1]!);
          return;
        }

        // Arrow keys → Navigate tabs within tablist (when focused on a tab button)
        if (target?.getAttribute("role") === "tab") {
          const currentIdx = TAB_ORDER.indexOf(activeTab);
          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            const nextIdx = (currentIdx + 1) % TAB_ORDER.length;
            onSwitchTab(TAB_ORDER[nextIdx]!);
            document.getElementById(`tab-${TAB_ORDER[nextIdx]}`)?.focus();
          } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            const prevIdx = (currentIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length;
            onSwitchTab(TAB_ORDER[prevIdx]!);
            document.getElementById(`tab-${TAB_ORDER[prevIdx]}`)?.focus();
          }
        }
      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSave, onRunSimulation, onDismissMessages, onSwitchTab, activeTab]);
}

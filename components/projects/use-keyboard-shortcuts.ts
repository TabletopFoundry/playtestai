"use client";

import { useEffect } from "react";
import type { ActiveTab } from "./workbench/types";

const TAB_ORDER: ActiveTab[] = ["dashboard", "definition", "simulate", "compare", "report"];

interface KeyboardShortcutOptions {
  onSave: () => void;
  onRunSimulation: () => void;
  onDismissMessages: () => void;
  onSwitchTab: (tab: ActiveTab) => void;
}

/** App-wide keyboard shortcuts for the project workbench. */
export function useKeyboardShortcuts({
  onSave,
  onRunSimulation,
  onDismissMessages,
  onSwitchTab,
}: KeyboardShortcutOptions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.defaultPrevented || document.querySelector("dialog[open]")) {
        return;
      }

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

      }
    }

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSave, onRunSimulation, onDismissMessages, onSwitchTab]);
}

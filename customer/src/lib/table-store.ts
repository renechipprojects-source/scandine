import { useSyncExternalStore, useState, useEffect } from "react";

const TABLE_STORAGE_KEY = "aura_dine_table_number";

export function formatTableNumber(raw: string): string {
  if (!raw) return "";
  try {
    const decoded = decodeURIComponent(raw);
    const trimmed = decoded.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits) {
      const num = parseInt(digits, 10);
      if (num > 0 && num <= 1000) {
        return `Table ${num}`;
      }
    }
  } catch {}
  return "";
}

let currentTableNumber = ((): string => {
  try {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paramTable = urlParams.get("table") || urlParams.get("t") || urlParams.get("tbl");
      if (paramTable) {
        const formatted = formatTableNumber(paramTable);
        if (formatted) {
          localStorage.setItem(TABLE_STORAGE_KEY, formatted);
          return formatted;
        }
      }
      const pathname = window.location.pathname;
      const match = pathname.match(/\/(?:menu|table|t)\/([^/]+)/i);
      if (match && match[1]) {
        const formatted = formatTableNumber(match[1]);
        if (formatted) {
          localStorage.setItem(TABLE_STORAGE_KEY, formatted);
          return formatted;
        }
      }
      const saved = localStorage.getItem(TABLE_STORAGE_KEY);
      if (saved) {
        const formatted = formatTableNumber(saved);
        if (formatted) return formatted;
      }
    }
  } catch {}
  return "";
})();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const tableStore = {
  getTableNumber(): string {
    return currentTableNumber;
  },
  setTableNumber(table: string) {
    const formatted = formatTableNumber(table);
    if (formatted) {
      currentTableNumber = formatted;
      try {
        localStorage.setItem(TABLE_STORAGE_KEY, formatted);
      } catch {}
      emit();
    }
  },
  initFromUrl() {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const paramTable = urlParams.get("table") || urlParams.get("t") || urlParams.get("tbl");
        if (paramTable) {
          const formatted = formatTableNumber(paramTable);
          if (formatted && currentTableNumber !== formatted) {
            currentTableNumber = formatted;
            localStorage.setItem(TABLE_STORAGE_KEY, formatted);
            emit();
          }
          return;
        }
        const pathname = window.location.pathname;
        const match = pathname.match(/\/(?:menu|table|t)\/([^/]+)/i);
        if (match && match[1]) {
          const formatted = formatTableNumber(match[1]);
          if (formatted && currentTableNumber !== formatted) {
            currentTableNumber = formatted;
            localStorage.setItem(TABLE_STORAGE_KEY, formatted);
            emit();
          }
        }
      }
    } catch {}
  },
};

import { useHydrated } from "./sync-manager";

export function useTable(): string {
  const isHydrated = useHydrated();
  const table = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (typeof window !== "undefined" ? currentTableNumber : ""),
    () => ""
  );
  return isHydrated ? table : "";
}

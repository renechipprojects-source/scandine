import { useSyncExternalStore } from "react";

const TABLE_STORAGE_KEY = "aura_dine_table_number";

function formatTableNumber(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits) {
    return `Table ${digits}`;
  }
  if (trimmed.toLowerCase().startsWith("table")) {
    const rest = trimmed.substring(5).trim();
    return rest ? `Table ${rest}` : "Table 1";
  }
  return trimmed ? `Table ${trimmed}` : "Table 1";
}

let currentTableNumber = ((): string => {
  try {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const paramTable = urlParams.get("table");
      if (paramTable) {
        const formatted = formatTableNumber(paramTable);
        localStorage.setItem(TABLE_STORAGE_KEY, formatted);
        return formatted;
      }
      const pathname = window.location.pathname;
      const match = pathname.match(/\/(?:menu|table|t)\/([^/]+)/i);
      if (match && match[1]) {
        const formatted = formatTableNumber(match[1]);
        localStorage.setItem(TABLE_STORAGE_KEY, formatted);
        return formatted;
      }
      const saved = localStorage.getItem(TABLE_STORAGE_KEY);
      if (saved) return formatTableNumber(saved);
    }
  } catch {}
  return "Table 1";
})();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const tableStore = {
  getTableNumber(): string {
    return currentTableNumber;
  },
  setTableNumber(table: string) {
    const formatted = formatTableNumber(table);
    currentTableNumber = formatted;
    try {
      localStorage.setItem(TABLE_STORAGE_KEY, formatted);
    } catch {}
    emit();
  },
  initFromUrl() {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const paramTable = urlParams.get("table") || urlParams.get("t") || urlParams.get("tbl");
        if (paramTable) {
          const formatted = formatTableNumber(paramTable);
          if (currentTableNumber !== formatted) {
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
          if (currentTableNumber !== formatted) {
            currentTableNumber = formatted;
            localStorage.setItem(TABLE_STORAGE_KEY, formatted);
            emit();
          }
        }
      }
    } catch {}
  },
};

export function useTable(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentTableNumber,
    () => currentTableNumber
  );
}

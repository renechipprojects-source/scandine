import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "aura_dine_theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

let currentTheme: Theme = ((): Theme => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (stored) return stored;
    }
  } catch {}
  return "system";
})();

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const resolved = theme === "system" ? getSystemTheme() : theme;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

// Initial apply
if (typeof window !== "undefined") {
  applyTheme(currentTheme);
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const themeStore = {
  getTheme(): Theme {
    return currentTheme;
  },
  setTheme(theme: Theme) {
    currentTheme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    applyTheme(theme);
    emit();
  },
  toggleTheme() {
    const next = currentTheme === "dark" ? "light" : "dark";
    this.setTheme(next);
  },
};

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => currentTheme,
    () => currentTheme
  );
}

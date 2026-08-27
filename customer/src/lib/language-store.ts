import { useSyncExternalStore } from "react";

export type Language = {
  code: string;
  name: string;
  native: string;
  flag: string;
};

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", native: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", native: "తెలుగు", flag: "🇮🇳" },
  { code: "es", name: "Spanish", native: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", native: "Français", flag: "🇫🇷" },
];

const LANG_STORAGE_KEY = "aura_dine_language";

let currentLangCode: string = ((): string => {
  try {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANG_STORAGE_KEY);
      if (stored) return stored;
    }
  } catch {}
  return "en";
})();

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const languageStore = {
  getLanguage(): Language {
    return LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];
  },
  setLanguage(code: string) {
    currentLangCode = code;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, code);
    } catch {}
    emit();
  },
};

import { useHydrated } from "./sync-manager";

const SERVER_LANG = LANGUAGES[0];

export function useLanguage(): Language {
  const isHydrated = useHydrated();
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (typeof window !== "undefined" ? languageStore.getLanguage() : SERVER_LANG),
    () => SERVER_LANG
  );
  return isHydrated ? lang : SERVER_LANG;
}

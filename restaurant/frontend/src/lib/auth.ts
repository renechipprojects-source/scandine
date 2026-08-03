// Authentication helpers for the Savora / Restaurant Hub front end with Supabase Auth.
import { supabase, isSupabaseConfigured } from "./supabase";

export type Role = "reception" | "kitchen" | "admin";
export type SystemRole = "owner" | "manager" | "cashier" | "waiter" | "kitchen_staff";

const STORAGE_KEY = "savora.auth";

export type Session = {
  email: string;
  redirect: `/${Role}`;
  systemRole?: SystemRole;
};

function readFromStore(store: Storage | undefined): Session | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed || typeof parsed.email !== "string" || typeof parsed.redirect !== "string") {
      return null;
    }
    return {
      email: parsed.email,
      redirect: parsed.redirect as Session["redirect"],
      systemRole: parsed.systemRole,
    };
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  return readFromStore(window.localStorage) ?? readFromStore(window.sessionStorage);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}

export function hasRole(role: Role): boolean {
  const session = getSession();
  return session?.redirect === `/${role}`;
}

export function saveSession(session: Session, remember: boolean = true): void {
  if (typeof window === "undefined") return;
  const store = remember ? window.localStorage : window.sessionStorage;
  store.setItem(STORAGE_KEY, JSON.stringify(session));
}

export async function signInWithSupabase(email: string, password: string, redirectRole: Role): Promise<{ session: Session | null; error: string | null }> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Return the real error — do NOT silently grant access on failed auth
      return { session: null, error: error.message };
    }
    const session: Session = {
      email: data.user.email ?? email,
      redirect: `/${redirectRole}`,
    };
    saveSession(session);
    return { session, error: null };
  } else {
    const session: Session = { email, redirect: `/${redirectRole}` };
    saveSession(session);
    return { session, error: null };
  }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

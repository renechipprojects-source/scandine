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

export async function verifySessionActive(role: Role): Promise<boolean> {
  const session = getSession();
  if (!session || session.redirect !== `/${role}`) {
    return false;
  }
  // Allow system admin/preset credentials
  if (session.email.endsWith("@restaurant.com")) {
    return true;
  }
  const cleanEmail = session.email.toLowerCase();

  // 1. Check custom local credentials store
  try {
    if (typeof window !== "undefined") {
      const storedJson = window.localStorage.getItem("sd_custom_credentials");
      if (storedJson) {
        const credsMap: Record<string, { role?: string; status?: string }> = JSON.parse(storedJson);
        const customUser = credsMap[cleanEmail];
        if (customUser) {
          const status = (customUser.status || "active").toLowerCase();
          const normalizedRole = (customUser.role || "").toLowerCase();
          const isAllowed =
            normalizedRole === "receptionist" ||
            normalizedRole === "kitchen_staff" ||
            normalizedRole === "chef" ||
            normalizedRole === "admin";
          if (status === "active" && isAllowed) {
            return true;
          }
        }
      }
    }
  } catch (e) {
    console.warn("verifySessionActive local check notice:", e);
  }

  // 2. Check Supabase database if configured
  if (isSupabaseConfigured) {
    try {
      const { data: rows, error } = await supabase
        .from("sd_employees")
        .select("*")
        .eq("email", cleanEmail);

      const emp = rows && rows.length > 0 ? rows[0] : null;

      if (!error && emp) {
        const status = (emp.status || "active").toLowerCase();
        if (status === "active") {
          const normalizedRole = (emp.role || "").toLowerCase();
          const isAllowed =
            normalizedRole === "receptionist" ||
            normalizedRole === "kitchen_staff" ||
            normalizedRole === "chef" ||
            normalizedRole === "admin";
          if (isAllowed) return true;
        }
      }
    } catch {
      /* ignore */
    }
  }

  // 3. Fallback: check active Supabase Auth session
  try {
    const { data: authSession } = await supabase.auth.getSession();
    if (authSession?.session) return true;
  } catch {}

  // If all checks fail, revoke session
  await signOut();
  return false;
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

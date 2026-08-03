import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://nyhnkftlkigoliyogwvp.supabase.co";
const DEFAULT_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aG5rZnRsa2lnb2xpeW9nd3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NzQ2NTMsImV4cCI6MjEwMTA1MDY1M30.KxjH42Wg0IVLfXLLJSbBLvcZ098hvJRUHkDu10NJfB4";

const envUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(/^['"]|['"]$/g, "").trim();
const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").replace(/^['"]|['"]$/g, "").trim();

const supabaseUrl = (envUrl.length > 0 && !envUrl.includes("placeholder") && !envUrl.includes("your-supabase")) ? envUrl : DEFAULT_URL;
const supabaseAnonKey = (envKey.length > 0 && !envKey.includes("placeholder") && !envKey.includes("your-supabase")) ? envKey : DEFAULT_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

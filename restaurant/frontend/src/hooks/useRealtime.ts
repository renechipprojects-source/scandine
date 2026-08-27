import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

const playedAlertIds = new Set<string>();

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function unlockAudioOnGesture() {
  if (typeof window === "undefined") return;

  // Check browser user activation state before attempting AudioContext instantiation
  if (typeof navigator !== "undefined" && "userActivation" in navigator && !navigator.userActivation.hasBeenActive) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }

    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx
        .resume()
        .then(() => {
          isAudioUnlocked = true;
        })
        .catch(() => {});
    } else if (sharedAudioCtx.state === "running") {
      isAudioUnlocked = true;
    }
  } catch {
    // Ignore audio initialization errors silently
  }
}

if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    unlockAudioOnGesture();
    if (isAudioUnlocked) {
      window.removeEventListener("click", handleUserGesture);
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
      window.removeEventListener("pointerdown", handleUserGesture);
    }
  };
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("touchstart", handleUserGesture);
  window.addEventListener("keydown", handleUserGesture);
  window.addEventListener("pointerdown", handleUserGesture);
}

export function playOrderAlertSound(eventId?: string) {
  if (eventId) {
    if (playedAlertIds.has(eventId)) return;
    playedAlertIds.add(eventId);
  }

  // Only play synth chime if AudioContext is instantiated, unlocked, and currently running
  if (!sharedAudioCtx || sharedAudioCtx.state !== "running" || !isAudioUnlocked) return;

  try {
    const ctx = sharedAudioCtx;

    // First chime (E5 ~ 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second chime (A5 ~ 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    console.warn("Audio chime play error:", err);
  }
}

export function playServiceRequestAlertSound(eventId?: string) {
  if (eventId) {
    if (playedAlertIds.has(eventId)) return;
    playedAlertIds.add(eventId);
  }

  // Only play synth chime if AudioContext is instantiated, unlocked, and currently running
  if (!sharedAudioCtx || sharedAudioCtx.state !== "running" || !isAudioUnlocked) return;

  try {
    const ctx = sharedAudioCtx;

    // Rapid 3-bell chime (C6 ~ 1046.5 Hz, E6 ~ 1318.5 Hz, G6 ~ 1567.98 Hz)
    const notes = [1046.5, 1318.51, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + idx * 0.12;
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.4, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  } catch (err) {
    console.warn("Service alert sound play error:", err);
  }
}

export function useRealtimeTable(
  tableName: string,
  onPayload: (payload: { eventType: string; new: unknown; old: unknown }) => void,
) {
  // Keep a ref to the latest callback so the effect doesn't need it as a dependency
  const callbackRef = useRef(onPayload);
  useEffect(() => {
    callbackRef.current = onPayload;
  }, [onPayload]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channelId = `realtime_${tableName}_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tableName },
        (payload) => {
          if (tableName === "sd_orders" && payload.eventType === "INSERT") {
            const orderData = payload.new as { table_number?: string | number; order_number?: string; id?: string };
            const orderId = orderData?.id || orderData?.order_number || `ord_${Date.now()}`;
            playOrderAlertSound(orderId);
            const tableNum = orderData?.table_number ? `Table ${orderData.table_number}` : "";
            const displayId = orderData?.order_number || orderData?.id || "";
            toast.success(`🔔 New Order Received! ${displayId} (${tableNum})`, {
              duration: 5000,
            });
          } else if ((tableName === "service_requests" || tableName === "sd_notifications") && payload.eventType === "INSERT") {
            const srv = payload.new as { id?: string; table_number?: string | number; label?: string; request_type?: string; customer_name?: string };
            if (tableName !== "sd_notifications" || srv.request_type) {
              const srvId = srv.id || `srv_${Date.now()}`;
              playServiceRequestAlertSound(srvId);
              const tableStr = srv?.table_number ? `Table ${srv.table_number}` : "Table";
              const serviceStr = srv?.request_type || srv?.label || "Service Request";
              const custStr = srv?.customer_name ? ` (${srv.customer_name})` : "";
              toast.info(`🛎️ New Service Request: ${serviceStr} for ${tableStr}${custStr}`, {
                duration: 6000,
              });
            }
          }

          // Dispatch local update event so useSupabaseTable re-fetches immediately
          window.dispatchEvent(new CustomEvent("local-table-updated", { detail: { tableName } }));

          // Always call the latest version of the callback via ref
          callbackRef.current({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        },
      )
      .subscribe((status, err) => {
        if (err && status === "CHANNEL_ERROR") {
          console.warn(`[Realtime Channel Notice on ${tableName}]:`, err?.message || status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName]);
}

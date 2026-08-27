import { useSyncExternalStore } from "react";
import type { FoodItem } from "./mock-data";
import { tableStore } from "./table-store";
import { isValidId } from "./supabase";
import { useHydrated } from "./sync-manager";

export type CartItem = {
  food: FoodItem;
  qty: number;
  note?: string;
  addons?: string[];
};

type State = { items: CartItem[]; activeOrderId?: string };

const getCartStorageKey = () => {
  const table = tableStore.getTableNumber();
  return `scandine_cart_${table.toLowerCase().replace(/\s+/g, "")}`;
};

let cachedCartKey: string | null = null;
let cachedCartRaw: string | null = null;
let state: State = { items: [] };

function loadState(): State {
  try {
    if (typeof window !== "undefined") {
      const key = getCartStorageKey();
      const raw = localStorage.getItem(key);
      if (key === cachedCartKey && raw === cachedCartRaw && state) {
        return state;
      }
      cachedCartKey = key;
      cachedCartRaw = raw;
      if (raw) {
        state = JSON.parse(raw);
        return state;
      }
    }
  } catch {}
  if (!state) {
    state = { items: [] };
  }
  return state;
}

// Initialize state
state = loadState();

function saveState(s: State) {
  try {
    const key = getCartStorageKey();
    const raw = JSON.stringify(s);
    cachedCartKey = key;
    cachedCartRaw = raw;
    localStorage.setItem(key, raw);
  } catch {}
}

const listeners = new Set<() => void>();
const emit = () => {
  saveState(state);
  listeners.forEach((l) => l());
};

export const cart = {
  add(food: FoodItem, qty = 1) {
    state = loadState();
    const existing = state.items.find((i) => i.food.id === food.id);
    if (existing) {
      state = {
        ...state,
        items: state.items.map((i) =>
          i.food.id === food.id ? { ...i, qty: i.qty + qty } : i,
        ),
      };
    } else {
      state = { ...state, items: [...state.items, { food, qty }] };
    }
    emit();
  },
  remove(id: string) {
    state = loadState();
    state = { ...state, items: state.items.filter((i) => i.food.id !== id) };
    emit();
  },
  setQty(id: string, qty: number) {
    if (qty <= 0) return cart.remove(id);
    state = loadState();
    state = {
      ...state,
      items: state.items.map((i) => (i.food.id === id ? { ...i, qty } : i)),
    };
    emit();
  },
  setActiveOrderId(orderId?: string) {
    state = loadState();
    if (isValidId(orderId)) {
      state = { ...state, activeOrderId: orderId };
      try {
        const rawCust = localStorage.getItem("scandine_current_customer");
        const sid = rawCust ? JSON.parse(rawCust)?.sessionId : "guest";
        localStorage.setItem(`scandine_active_order_${sid}`, orderId!);
        localStorage.setItem("scandine_active_order_id", orderId!);
      } catch {}
    } else {
      state = { ...state, activeOrderId: undefined };
      try {
        const rawCust = localStorage.getItem("scandine_current_customer");
        const sid = rawCust ? JSON.parse(rawCust)?.sessionId : "guest";
        localStorage.removeItem(`scandine_active_order_${sid}`);
        localStorage.removeItem("scandine_active_order_id");
      } catch {}
    }
    emit();
  },
  getActiveOrderId(): string | undefined {
    state = loadState();
    if (isValidId(state.activeOrderId)) return state.activeOrderId;
    try {
      const rawCust = localStorage.getItem("scandine_current_customer");
      const sid = rawCust ? JSON.parse(rawCust)?.sessionId : null;
      if (sid) {
        const val = localStorage.getItem(`scandine_active_order_${sid}`);
        if (isValidId(val)) return val!;
      }
      const val = localStorage.getItem("scandine_active_order_id");
      if (isValidId(val)) return val!;
    } catch {
      return undefined;
    }
    return undefined;
  },
  clear() {
    const currentActiveOrder = state.activeOrderId || this.getActiveOrderId();
    state = { items: [], activeOrderId: currentActiveOrder };
    emit();
  },
  clearCartForNewSession() {
    state = { items: [], activeOrderId: undefined };
    cachedCartKey = null;
    cachedCartRaw = null;
    try {
      const key = getCartStorageKey();
      localStorage.removeItem(key);
      const rawCust = localStorage.getItem("scandine_current_customer");
      const sid = rawCust ? JSON.parse(rawCust)?.sessionId : "guest";
      localStorage.removeItem(`scandine_active_order_${sid}`);
      localStorage.removeItem("scandine_active_order_id");
    } catch {}
    listeners.forEach((l) => l());
  },
};

const SERVER_CART_STATE: State = { items: [] };

export function useCart() {
  const isHydrated = useHydrated();
  const cartState = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (typeof window !== "undefined" ? loadState() : SERVER_CART_STATE),
    () => SERVER_CART_STATE
  );
  return isHydrated ? cartState : SERVER_CART_STATE;
}

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.food.price * i.qty, 0);
  const discount = 0;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;
  const itemsCount = items.reduce((s, i) => s + i.qty, 0);
  return { subtotal, discount, gst, total, itemsCount };
}

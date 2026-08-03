import { useSyncExternalStore } from "react";
import type { FoodItem } from "./mock-data";
import { tableStore } from "./table-store";

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
  setActiveOrder(orderId: string) {
    state = loadState();
    state = { ...state, activeOrderId: orderId };
    try {
      localStorage.setItem(`scandine_active_order_${tableStore.getTableNumber().toLowerCase().replace(/\s+/g, "")}`, orderId);
    } catch {}
    emit();
  },
  getActiveOrderId(): string | undefined {
    state = loadState();
    if (state.activeOrderId) return state.activeOrderId;
    try {
      return localStorage.getItem(`scandine_active_order_${tableStore.getTableNumber().toLowerCase().replace(/\s+/g, "")}`) || undefined;
    } catch {
      return undefined;
    }
  },
  clear() {
    const currentActiveOrder = state.activeOrderId || this.getActiveOrderId();
    state = { items: [], activeOrderId: currentActiveOrder };
    emit();
  },
};

const SERVER_CART_STATE: State = { items: [] };

export function useCart() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => loadState(),
    () => SERVER_CART_STATE
  );
}

export function cartTotals(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + i.food.price * i.qty, 0);
  const discount = 0;
  const gst = Math.round(subtotal * 0.05);
  const total = subtotal + gst;
  const itemsCount = items.reduce((s, i) => s + i.qty, 0);
  return { subtotal, discount, gst, total, itemsCount };
}

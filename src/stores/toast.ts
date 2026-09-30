import { create } from 'zustand';

export interface ToastAction {
  label: string;
  run: () => void;
}

export interface ToastItem {
  id: number;
  msg: string;
  action?: ToastAction;
}

interface ToastState {
  items: ToastItem[];
  push: (msg: string, action?: ToastAction) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set) => ({
  items: [],
  push: (msg, action) => {
    const id = nextId++;
    set((st) => ({ items: [...st.items, { id, msg, action }] }));
    setTimeout(() => {
      set((st) => ({ items: st.items.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismiss: (id) => set((st) => ({ items: st.items.filter((t) => t.id !== id) })),
}));

export function toast(msg: string, action?: ToastAction) {
  useToastStore.getState().push(msg, action);
}

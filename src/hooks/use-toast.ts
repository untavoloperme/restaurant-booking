"use client";

import * as React from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 3000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type State = { toasts: ToasterToast[] };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const listeners: Array<(state: State) => void> = [];
let memoryState: State = { toasts: [] };

function dispatch(toasts: ToasterToast[]) {
  memoryState = { toasts };
  listeners.forEach((l) => l(memoryState));
}

function toast(props: Omit<ToasterToast, "id">) {
  const id = genId();
  const update = (p: Partial<ToasterToast>) =>
    dispatch(memoryState.toasts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const dismiss = () =>
    dispatch(memoryState.toasts.map((t) => (t.id === id ? { ...t, open: false } : t)));

  dispatch([
    ...memoryState.toasts.slice(0, TOAST_LIMIT - 1),
    { ...props, id, open: true, onOpenChange: (open) => { if (!open) dismiss(); } },
  ]);

  setTimeout(dismiss, TOAST_REMOVE_DELAY + 1000);
  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);
  React.useEffect(() => {
    listeners.push(setState);
    return () => { const idx = listeners.indexOf(setState); if (idx > -1) listeners.splice(idx, 1); };
  }, []);
  return { ...state, toast, dismiss: (id?: string) => dispatch(id ? memoryState.toasts.filter(t => t.id !== id) : []) };
}

export { useToast, toast };

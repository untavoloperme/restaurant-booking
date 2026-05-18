// In-memory pub/sub for Server-Sent Events (single process)
type Listener = (event: string, data: unknown) => void;

const listeners: Listener[] = [];

export function subscribe(fn: Listener) {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

export function emitEvent(event: string, data: unknown) {
  for (const fn of listeners) {
    try {
      fn(event, data);
    } catch {
      // client disconnected
    }
  }
}

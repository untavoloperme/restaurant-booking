"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

/* ── Barra di progresso in cima ───────────────────────── */
export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startBar = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setVisible(true);
    setProgress(0);
    // Due RAF garantiscono che il browser abbia registrato progress=0 prima di animare
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setProgress(75))
    );
  }, []);

  const completeBar = useCallback(() => {
    setProgress(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 380);
  }, []);

  // Completamento quando la pathname cambia
  useEffect(() => {
    completeBar();
  }, [pathname, completeBar]);

  // Avvio quando il sidebar segnala l'inizio navigazione
  useEffect(() => {
    const handler = () => startBar();
    window.addEventListener("admin-nav-start", handler);
    return () => window.removeEventListener("admin-nav-start", handler);
  }, [startBar]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[200] h-[2.5px] rounded-r-full pointer-events-none"
      style={{
        width: `${progress}%`,
        background: "linear-gradient(to right, #3b82f6, #6366f1, #8b5cf6)",
        boxShadow: "0 0 10px rgba(99, 102, 241, 0.6)",
        transition:
          progress === 0
            ? "none"
            : progress === 100
            ? "width 300ms ease-out"
            : "width 550ms cubic-bezier(0.1, 0.4, 0.3, 1)",
      }}
    />
  );
}

/* ── Wrapper del contenuto — fade-in ad ogni cambio pagina ── */
export function AdminPageWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-admin-page h-full">
      {children}
    </div>
  );
}

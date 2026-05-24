"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStaleDeployment =
    error.message?.includes("Failed to find Server Action") ||
    error.message?.includes("older or newer deployment");

  useEffect(() => {
    if (isStaleDeployment) {
      window.location.reload();
    }
  }, [isStaleDeployment]);

  if (isStaleDeployment) {
    return (
      <html>
        <body>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "8px", fontFamily: "sans-serif" }}>
            <p style={{ color: "#666", fontSize: "0.875rem" }}>Aggiornamento in corso…</p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html>
      <body>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: "12px", fontFamily: "sans-serif" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Qualcosa è andato storto</h2>
          <p style={{ color: "#666", fontSize: "0.875rem" }}>{error.message}</p>
          <button onClick={reset} style={{ padding: "8px 16px", background: "#111", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}

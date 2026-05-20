"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "12px", fontFamily: "sans-serif" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Errore di pagina</h2>
      <p style={{ color: "#666", fontSize: "0.875rem" }}>{error.message}</p>
      <button onClick={reset} style={{ padding: "8px 16px", background: "#111", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>
        Riprova
      </button>
    </div>
  );
}

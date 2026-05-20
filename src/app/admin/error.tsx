"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <h2 className="text-lg font-semibold">Errore</h2>
      <p className="text-sm text-muted-foreground font-mono bg-red-50 border border-red-200 px-3 py-2 rounded max-w-lg break-all">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
      >
        Riprova
      </button>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Phone, PhoneOff, Smartphone, RefreshCw, ExternalLink, Loader2, Eye, EyeOff } from "lucide-react";

interface MissedCallRow {
  id: string;
  phone: string;
  isMobile: boolean;
  whatsappSent: boolean;
  whatsappError: string | null;
  confirmed: boolean;
  createdAt: string;
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone;
  return phone.slice(0, 3) + "•".repeat(phone.length - 6) + phone.slice(-3);
}

export default function AsteriskPage() {
  const [rows, setRows] = useState<MissedCallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showNumbers, setShowNumbers] = useState(false);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/missed-calls?page=${p}`);
      const data = await res.json() as { rows: MissedCallRow[]; total: number };
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
    } catch { /* non-critical */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(page); }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prenotazioni Telefoniche & Whatsapp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chiamate intercettate dal trunk Messagenet — {total} totali
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNumbers(v => !v)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors"
          >
            {showNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showNumbers ? "Nascondi numeri" : "Mostra numeri"}
          </button>
          <button
            onClick={() => load(page)}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Aggiorna
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Caricamento…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <PhoneOff className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-muted-foreground">Nessuna chiamata registrata.<br />Le chiamate appaiono non appena il worker Asterisk è attivo.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-slate-500 text-xs font-medium">
                    <th className="px-4 py-3 text-left">Data e ora</th>
                    <th className="px-4 py-3 text-left">Numero</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">WhatsApp</th>
                    <th className="px-4 py-3 text-left">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("it-IT")}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-800">
                        {showNumbers ? row.phone : maskPhone(row.phone)}
                      </td>
                      <td className="px-4 py-3">
                        {row.isMobile ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                            <Smartphone className="h-3 w-3" /> Cellulare
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            <Phone className="h-3 w-3" /> Fisso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!row.isMobile ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : row.confirmed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                            Confermato
                          </span>
                        ) : row.whatsappSent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                            Inviato
                          </span>
                        ) : row.whatsappError ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600" title={row.whatsappError}>
                            Errore
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Non inviato</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.isMobile && (
                          <a
                            href={`https://wa.me/39${row.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Apri WhatsApp
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50 text-xs text-slate-500">
                <span>Pagina {page} di {totalPages} · {total} chiamate</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-300 disabled:opacity-40 transition-colors"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-300 disabled:opacity-40 transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

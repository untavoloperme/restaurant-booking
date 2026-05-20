"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BackstageLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/backstage/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Errore"); return; }
      if (data.requiresTotp) {
        router.push("/backstage/2fa");
      } else {
        router.push("/backstage");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Glow sottile */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl overflow-hidden border border-slate-700/60"
          style={{ background: "rgba(15,18,30,0.97)", boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}>
          <div className="h-[2px] w-full bg-gradient-to-r from-indigo-600 via-violet-500 to-indigo-600" />
          <div className="px-8 pt-8 pb-9">
            <div className="flex justify-center mb-5">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                <Lock className="h-6 w-6 text-white" />
              </div>
            </div>
            <h1 className="text-center text-xl font-bold text-white mb-1">Accesso riservato</h1>
            <p className="text-center text-xs text-slate-500 mb-7 tracking-wide uppercase">Pannello di controllo</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-400 text-sm">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required autoComplete="username"
                  className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-400 text-sm">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 h-10" />
              </div>

              {error && (
                <p className="text-xs text-red-400 text-center bg-red-500/10 rounded-lg py-2 px-3">{error}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full h-10 rounded-lg font-semibold text-white flex items-center justify-center gap-2 mt-1 transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Accedi
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteFooter from "@/components/site-footer";

export default function TwoFactorPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session?.user?.id) return;
    setError("");
    setLoading(true);

    const result = await signIn("totp", {
      userId: session.user.id,
      code: code.replace(/\s/g, ""),
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError("Codice non valido. Riprova.");
      setCode("");
    } else {
      router.push("/admin");
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d0905 0%, #1a1008 40%, #0e0d12 100%)" }}
    >
      <div className="flex-1 flex items-center justify-center px-4">
      {/* Blob ambra */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 520, height: 520, top: "-120px", left: "-100px",
          background: "radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%)",
          animation: "blob-drift 14s ease-in-out infinite",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 440, height: 440, bottom: "-80px", right: "-80px",
          background: "radial-gradient(circle, rgba(180,83,9,0.18) 0%, transparent 70%)",
          animation: "blob-drift 18s ease-in-out infinite reverse",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div
        className="animate-fade-in-scale relative z-10 w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        <div className="px-8 pt-8 pb-9">
          <div className="flex justify-center mb-5">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
            >
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
          </div>

          <h1 className="text-center text-2xl font-bold text-stone-800 mb-1">Verifica identità</h1>
          <p className="text-center text-sm text-stone-400 mb-7">
            Inserisci il codice a 6 cifre dalla tua app autenticatore
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-stone-700 font-medium">Codice TOTP</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]{6,7}"
                placeholder="000 000"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                autoComplete="one-time-code"
                className="h-11 text-center text-xl tracking-[0.3em] border-stone-200 focus:border-amber-400 focus:ring-amber-400/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200"
              style={{
                background: loading ? "#92400e" : "linear-gradient(135deg, #b45309, #d97706)",
                boxShadow: loading ? "none" : "0 4px 16px rgba(217,119,6,0.40)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verifica
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors pt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Torna al login
            </button>
          </form>
        </div>
      </div>
      </div>{/* fine contenuto centrato */}
      <SiteFooter dark />
    </div>
  );
}

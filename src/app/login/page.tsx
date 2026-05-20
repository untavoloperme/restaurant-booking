"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  UtensilsCrossed, Loader2, Wine, ChefHat, Coffee,
  Star, Flame, Utensils,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* Icone flottanti di sfondo */
const FLOATERS = [
  { Icon: UtensilsCrossed, top: "7%",  left: "6%",  size: 44, dur: "9s",  delay: "0s",   opacity: 0.10 },
  { Icon: Wine,            top: "12%", right: "8%", size: 36, dur: "11s", delay: "1.4s", opacity: 0.09 },
  { Icon: ChefHat,         top: "55%", left: "4%",  size: 50, dur: "13s", delay: "2s",   opacity: 0.08 },
  { Icon: Coffee,          bottom:"18%",right:"6%", size: 34, dur: "8s",  delay: "0.6s", opacity: 0.10 },
  { Icon: Star,            top: "78%", left: "18%", size: 28, dur: "10s", delay: "3.2s", opacity: 0.07 },
  { Icon: Flame,           top: "38%", right:"4%",  size: 38, dur: "12s", delay: "1s",   opacity: 0.08 },
  { Icon: Utensils,        bottom:"8%",left:"38%",  size: 30, dur: "9s",  delay: "4s",   opacity: 0.07 },
  { Icon: Wine,            top: "30%", left: "2%",  size: 26, dur: "14s", delay: "2.8s", opacity: 0.06 },
  { Icon: Star,            top: "20%", left: "42%", size: 22, dur: "7s",  delay: "5s",   opacity: 0.06 },
  { Icon: ChefHat,         bottom:"32%",right:"3%", size: 32, dur: "11s", delay: "3.5s", opacity: 0.07 },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<{ name: string; logo: string } | null>(null);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((d) => setBranding({
        name: d["restaurant.name"] ?? "",
        logo: d["restaurant.logo"] ?? "",
      }));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("Email o password non corretti.");
      return;
    }

    const session = await getSession();
    setLoading(false);
    if (session?.user?.pendingTotp) {
      router.push("/login/2fa");
    } else {
      router.push("/admin");
    }
  }

  const restaurantName = branding?.name || "Gestionale";
  const logoUrl = branding?.logo || null;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4"
         style={{ background: "linear-gradient(135deg, #0d0905 0%, #1a1008 40%, #0e0d12 100%)" }}>

      {/* Blob luminosi ambra che pulsano */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 520, height: 520,
          top: "-120px", left: "-100px",
          background: "radial-gradient(circle, rgba(217,119,6,0.22) 0%, transparent 70%)",
          animation: "blob-drift 14s ease-in-out infinite",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 440, height: 440,
          bottom: "-80px", right: "-80px",
          background: "radial-gradient(circle, rgba(180,83,9,0.18) 0%, transparent 70%)",
          animation: "blob-drift 18s ease-in-out infinite reverse",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: 280, height: 280,
          top: "40%", left: "55%",
          background: "radial-gradient(circle, rgba(251,191,36,0.10) 0%, transparent 70%)",
          animation: "blob-drift 11s ease-in-out infinite 4s",
          filter: "blur(30px)",
        }}
      />

      {/* Griglia sottile in overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Icone flottanti */}
      {FLOATERS.map(({ Icon, size, dur, delay, opacity, ...pos }, i) => (
        <div
          key={i}
          className="absolute pointer-events-none text-amber-400"
          style={{
            ...pos,
            opacity,
            animation: `float-drift ${dur} ease-in-out infinite`,
            animationDelay: delay,
          }}
        >
          <Icon style={{ width: size, height: size }} />
        </div>
      ))}

      {/* Card login */}
      <div
        className="animate-fade-in-scale relative z-10 w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.97)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        }}
      >
        {/* Striscia decorativa ambra in cima */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        <div className="px-8 pt-8 pb-9">
          {/* Logo / icona */}
          <div className="flex justify-center mb-5">
            {logoUrl ? (
              <div className="relative h-16 w-44">
                <Image src={logoUrl} alt={restaurantName} fill className="object-contain" priority />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}
              >
                <UtensilsCrossed className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          <h1 className="text-center text-2xl font-bold text-stone-800 mb-1">{restaurantName}</h1>
          <p className="text-center text-sm text-stone-400 mb-7">Inserisci le credenziali per continuare</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-stone-700 font-medium">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@ristorante.it"
                required
                autoComplete="username"
                className="h-11 border-stone-200 focus:border-amber-400 focus:ring-amber-400/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-stone-700 font-medium">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-11 border-stone-200 focus:border-amber-400 focus:ring-amber-400/20"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition-all duration-200 mt-2"
              style={{
                background: loading
                  ? "#92400e"
                  : "linear-gradient(135deg, #b45309, #d97706)",
                boxShadow: loading ? "none" : "0 4px 16px rgba(217,119,6,0.40)",
              }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Accedi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

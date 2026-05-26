export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { isModuleEnabled } from "@/lib/modules";
import { UtensilsCrossed, Phone } from "lucide-react";

export const metadata: Metadata = {
  title: "Prenota un tavolo",
  description: "Prenota il tuo tavolo online in pochi secondi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#d97706",
};

export default async function PrenotaLayout({ children }: { children: React.ReactNode }) {
  const enabled = await isModuleEnabled("module.webapp");

  if (!enabled) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-5 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
          <UtensilsCrossed className="w-8 h-8 text-stone-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-lg font-bold text-stone-700">Prenotazioni temporaneamente sospese</p>
          <p className="text-sm text-stone-500">
            Le prenotazioni online non sono al momento disponibili.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-5 py-3 text-amber-800 text-sm">
          <Phone className="w-4 h-4 shrink-0" />
          <span>Contatta direttamente il ristorante per prenotare.</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

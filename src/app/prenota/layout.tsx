import type { Metadata, Viewport } from "next";
import { isModuleEnabled } from "@/lib/modules";
import { UtensilsCrossed } from "lucide-react";

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center">
          <UtensilsCrossed className="w-8 h-8 text-stone-400" />
        </div>
        <div>
          <p className="font-semibold text-stone-700">Prenotazioni temporaneamente sospese</p>
          <p className="text-sm text-stone-500 mt-1">
            Il servizio non è al momento disponibile. Riprova più tardi.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export const dynamic = "force-dynamic";

import dynamicImport from "next/dynamic";
import { isModuleEnabled } from "@/lib/modules";
import { UtensilsCrossed, Phone } from "lucide-react";

const Chatbot = dynamicImport(() => import("@/components/chatbot/chatbot"), { ssr: false });

export const metadata = {
  title: "Prenota un tavolo",
};

export default async function WidgetPage() {
  const [enabled, phoneSetting] = await Promise.all([
    isModuleEnabled("module.chatbot"),
    import("@/lib/prisma").then(({ prisma }) =>
      prisma.setting.findUnique({ where: { key: "restaurant.phone" } })
    ),
  ]);
  const phone = phoneSetting?.value ?? "";

  if (!enabled) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-4 p-8 text-center">
        <UtensilsCrossed className="w-10 h-10 text-stone-300" />
        <div className="space-y-1">
          <p className="font-semibold text-stone-700">Prenotazioni temporaneamente sospese</p>
          <p className="text-sm text-stone-500">
            Le prenotazioni online non sono al momento disponibili.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-amber-800 text-sm">
          <Phone className="w-4 h-4 shrink-0" />
          {phone ? (
            <span>
              Chiama al{" "}
              <a href={`tel:${phone.replace(/\s/g, "")}`} className="font-bold underline">
                {phone}
              </a>
            </span>
          ) : (
            <span>Contatta direttamente il ristorante per prenotare.</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <Chatbot />
    </div>
  );
}

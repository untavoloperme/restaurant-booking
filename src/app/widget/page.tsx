import dynamic from "next/dynamic";
import { isModuleEnabled } from "@/lib/modules";
import { UtensilsCrossed } from "lucide-react";

const Chatbot = dynamic(() => import("@/components/chatbot/chatbot"), { ssr: false });

export const metadata = {
  title: "Prenota un tavolo",
};

export default async function WidgetPage() {
  const enabled = await isModuleEnabled("module.chatbot");

  if (!enabled) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white gap-3 p-8 text-center">
        <UtensilsCrossed className="w-10 h-10 text-stone-300" />
        <p className="text-sm text-stone-500">
          Il servizio di prenotazione online non è al momento disponibile.
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <Chatbot />
    </div>
  );
}

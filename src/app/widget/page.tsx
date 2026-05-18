import dynamic from "next/dynamic";

const Chatbot = dynamic(() => import("@/components/chatbot/chatbot"), { ssr: false });

export const metadata = {
  title: "Prenota un tavolo",
};

export default function WidgetPage() {
  return (
    <div className="h-screen w-full overflow-hidden">
      <Chatbot />
    </div>
  );
}

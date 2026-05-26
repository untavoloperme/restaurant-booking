import type { Metadata, Viewport } from "next";

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

export default function PrenotaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

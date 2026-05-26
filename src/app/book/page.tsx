import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function BookPage() {
  const ua = headers().get("user-agent") ?? "";
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);
  redirect(isMobile ? "/prenota" : "/widget");
}

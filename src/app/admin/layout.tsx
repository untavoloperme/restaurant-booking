import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import AdminSidebar from "@/components/admin/sidebar";
import AdminTopbar from "@/components/admin/topbar";
import {
  NavigationProgress,
  AdminPageWrapper,
} from "@/components/admin/navigation-progress";
import { MODULE_KEYS } from "@/lib/modules";
import { PowerOff } from "lucide-react";

/* Mappa path → chiave modulo */
const PATH_TO_MODULE: Record<string, string> = {
  "/admin/reservations":  "module.reservations",
  "/admin/floor":         "module.floor",
  "/admin/kitchen":       "module.kitchen",
  "/admin/stats":         "module.stats",
  "/admin/layout-editor": "module.layout-editor",
  "/admin/menu":          "module.menu",
  "/admin/settings":      "module.settings",
  "/admin/users":         "module.users",
};

async function fetchModules(): Promise<Record<string, boolean>> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: [...MODULE_KEYS] } },
  });
  const result: Record<string, boolean> = {};
  for (const key of MODULE_KEYS) {
    const row = rows.find((r) => r.key === key);
    result[key] = row ? row.value !== "false" : true;
  }
  return result;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersList = headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const modules = await fetchModules();

  const moduleKey = Object.entries(PATH_TO_MODULE).find(([path]) =>
    pathname.startsWith(path)
  )?.[1];
  const isDisabled = moduleKey ? modules[moduleKey] === false : false;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <NavigationProgress />
      <AdminSidebar modules={modules} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminTopbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {isDisabled ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <PowerOff className="h-6 w-6 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-700">Modulo non attivo</h2>
              <p className="text-sm text-slate-400 max-w-xs">
                Questa funzionalità è stata disabilitata. Contatta il responsabile del sistema per riattivarla.
              </p>
            </div>
          ) : (
            <AdminPageWrapper>{children}</AdminPageWrapper>
          )}
        </main>
      </div>
    </div>
  );
}

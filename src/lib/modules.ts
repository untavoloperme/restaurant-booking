export const MODULE_KEYS = [
  "module.reservations",
  "module.floor",
  "module.kitchen",
  "module.stats",
  "module.layout-editor",
  "module.menu",
  "module.settings",
  "module.users",
  "module.chatbot",
  "module.webapp",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  const { prisma } = await import("./prisma");
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? row.value !== "false" : true;
}

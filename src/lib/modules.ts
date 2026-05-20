export const MODULE_KEYS = [
  "module.reservations",
  "module.floor",
  "module.kitchen",
  "module.stats",
  "module.layout-editor",
  "module.menu",
  "module.settings",
  "module.users",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

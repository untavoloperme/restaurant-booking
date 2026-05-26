import { prisma } from "./prisma";

export async function getSoldoutRoomIds(): Promise<Set<string>> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "soldout.room." }, value: "true" },
  });
  return new Set(rows.map((r) => r.key.replace("soldout.room.", "")));
}

export async function setRoomSoldout(roomId: string, soldout: boolean): Promise<void> {
  await prisma.setting.upsert({
    where: { key: `soldout.room.${roomId}` },
    create: { key: `soldout.room.${roomId}`, value: soldout ? "true" : "false" },
    update: { value: soldout ? "true" : "false" },
  });
}

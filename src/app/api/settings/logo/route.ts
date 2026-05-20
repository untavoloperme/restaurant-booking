import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["jpg", "jpeg", "png", "webp", "svg"].includes(ext))
    return NextResponse.json({ error: "Formato non supportato" }, { status: 400 });

  if (file.size > 2 * 1024 * 1024)
    return NextResponse.json({ error: "File troppo grande (max 2MB)" }, { status: 400 });

  // Rimuovi il logo precedente se esiste
  const existing = await prisma.setting.findUnique({ where: { key: "restaurant.logo" } });
  if (existing?.value && existing.value.startsWith("/uploads/logo.")) {
    const oldPath = path.join(process.cwd(), "public", existing.value);
    await unlink(oldPath).catch(() => null);
  }

  const filename = `logo.${ext}`;
  const dest = path.join(process.cwd(), "public", "uploads", filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buffer);

  const url = `/uploads/${filename}`;
  await prisma.setting.upsert({
    where: { key: "restaurant.logo" },
    create: { key: "restaurant.logo", value: url },
    update: { value: url },
  });

  return NextResponse.json({ url });
}

export async function DELETE() {
  const session = await getAuth();
  if (!session || (session.user as { role?: string })?.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const existing = await prisma.setting.findUnique({ where: { key: "restaurant.logo" } });
  if (existing?.value && existing.value.startsWith("/uploads/logo.")) {
    const oldPath = path.join(process.cwd(), "public", existing.value);
    await unlink(oldPath).catch(() => null);
  }

  await prisma.setting.upsert({
    where: { key: "restaurant.logo" },
    create: { key: "restaurant.logo", value: "" },
    update: { value: "" },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma, isPrismaNotFound } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads", "menu");
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE = 5 * 1024 * 1024;
const EXTS = ["jpg", "png", "webp"] as const;

async function deleteImageFiles(itemId: string) {
  await Promise.all(EXTS.map((ext) => unlink(join(UPLOAD_DIR, `${itemId}.${ext}`)).catch(() => {})));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "File troppo grande (max 5 MB)" }, { status: 400 });

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Formato non supportato (jpeg, png, webp)" }, { status: 400 });

  const filename = `${params.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await deleteImageFiles(params.id);
  await writeFile(join(UPLOAD_DIR, filename), buffer);

  const imageUrl = `/uploads/menu/${filename}`;
  try {
    const updated = await prisma.menuItem.update({ where: { id: params.id }, data: { imageUrl } });
    return NextResponse.json(updated);
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Piatto non trovato" }, { status: 404 });
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getAuth();
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });

  await deleteImageFiles(params.id);
  try {
    const updated = await prisma.menuItem.update({ where: { id: params.id }, data: { imageUrl: null } });
    return NextResponse.json(updated);
  } catch (err) {
    if (isPrismaNotFound(err)) return NextResponse.json({ error: "Piatto non trovato" }, { status: 404 });
    throw err;
  }
}

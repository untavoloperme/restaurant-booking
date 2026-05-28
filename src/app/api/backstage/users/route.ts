import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { hash } from "bcryptjs";
import { z } from "zod";

const CreateSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Password min. 8 caratteri"),
  name: z.string().min(2, "Nome obbligatorio"),
  role: z.enum(["ADMIN", "STAFF", "KITCHEN"]).default("STAFF"),
});

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const user = await prisma.user.create({
      data: {
        ...parsed.data,
        email: parsed.data.email.toLowerCase(),
        password: await hash(parsed.data.password, 12),
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
  }
}

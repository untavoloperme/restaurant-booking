import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SA_EMAIL ?? "superadmin@sistema.it";
  const password = process.env.SA_PASSWORD ?? "SuperAdmin1234!";

  const existing = await prisma.superAdmin.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ SuperAdmin già esistente: ${email}`);
    return;
  }

  await prisma.superAdmin.create({
    data: {
      email,
      password: await hash(password, 12),
    },
  });

  console.log(`✔ SuperAdmin creato`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log(`  URL:      /backstage/login`);
  console.log(`\n  ⚠  Cambia la password dopo il primo accesso.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@ristorante.it";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "Admin1234!";
  const name = process.env.SEED_ADMIN_NAME ?? "Amministratore";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        password: await hash(password, 12),
        name,
        role: Role.ADMIN,
      },
    });
    console.log(`✔ Admin creato: ${email}`);
  } else {
    console.log(`ℹ Admin già esistente: ${email}`);
  }

  const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
  for (let day = 0; day < 7; day++) {
    const existing = await prisma.openingHours.findUnique({
      where: { dayOfWeek: day },
    });
    if (!existing) {
      const isWeekend = day === 0 || day === 6;
      await prisma.openingHours.create({
        data: {
          dayOfWeek: day,
          active: true,
          slotInterval: 15,
          shifts: isWeekend
            ? [{ start: "19:00", end: "23:00" }]
            : [
                { start: "12:00", end: "14:30" },
                { start: "19:00", end: "23:00" },
              ],
        },
      });
      console.log(`✔ Orari inseriti: ${DAYS[day]}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

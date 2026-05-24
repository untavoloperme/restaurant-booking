import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSaSession } from "@/lib/sa-auth";
import { hash } from "bcryptjs";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

// ── Dati demo ────────────────────────────────────────────────

const ALLERGENS = [
  { number: 1,  name: "Glutine",          icon: "🌾", color: "#D97706" },
  { number: 2,  name: "Crostacei",        icon: "🦐", color: "#EF4444" },
  { number: 3,  name: "Uova",             icon: "🥚", color: "#F59E0B" },
  { number: 4,  name: "Pesce",            icon: "🐟", color: "#3B82F6" },
  { number: 5,  name: "Arachidi",         icon: "🥜", color: "#92400E" },
  { number: 6,  name: "Soia",             icon: "🫘", color: "#65A30D" },
  { number: 7,  name: "Latte",            icon: "🥛", color: "#6B7280" },
  { number: 8,  name: "Frutta a guscio",  icon: "🌰", color: "#78350F" },
  { number: 9,  name: "Sedano",           icon: "🥬", color: "#16A34A" },
  { number: 10, name: "Senape",           icon: "🌿", color: "#CA8A04" },
  { number: 11, name: "Sesamo",           icon: "⚪", color: "#9CA3AF" },
  { number: 12, name: "Solfiti",          icon: "🍷", color: "#7C3AED" },
  { number: 13, name: "Lupini",           icon: "🫛", color: "#B45309" },
  { number: 14, name: "Molluschi",        icon: "🐚", color: "#0EA5E9" },
];

const ROOMS = [
  {
    name: "Sala Principale", width: 1000, height: 700,
    tables: [
      { name: "T1", capacity: 2, shape: "round",  x: 100, y: 120, width: 80,  height: 80  },
      { name: "T2", capacity: 2, shape: "round",  x: 230, y: 120, width: 80,  height: 80  },
      { name: "T3", capacity: 4, shape: "round",  x: 380, y: 120, width: 90,  height: 90  },
      { name: "T4", capacity: 4, shape: "round",  x: 520, y: 120, width: 90,  height: 90  },
      { name: "T5", capacity: 6, shape: "rect",   x: 670, y: 100, width: 130, height: 90  },
      { name: "T6", capacity: 2, shape: "round",  x: 100, y: 320, width: 80,  height: 80  },
      { name: "T7", capacity: 4, shape: "round",  x: 260, y: 320, width: 90,  height: 90  },
      { name: "T8", capacity: 4, shape: "round",  x: 420, y: 320, width: 90,  height: 90  },
      { name: "T9", capacity: 6, shape: "rect",   x: 580, y: 300, width: 130, height: 90  },
      { name: "T10",capacity: 8, shape: "rect",   x: 100, y: 520, width: 200, height: 100 },
    ],
  },
  {
    name: "Terrazza", width: 800, height: 500,
    tables: [
      { name: "E1", capacity: 2, shape: "round",  x: 100, y: 100, width: 80, height: 80 },
      { name: "E2", capacity: 2, shape: "round",  x: 250, y: 100, width: 80, height: 80 },
      { name: "E3", capacity: 4, shape: "round",  x: 400, y: 100, width: 90, height: 90 },
      { name: "E4", capacity: 4, shape: "round",  x: 560, y: 100, width: 90, height: 90 },
      { name: "E5", capacity: 2, shape: "round",  x: 100, y: 300, width: 80, height: 80 },
      { name: "E6", capacity: 4, shape: "rect",   x: 280, y: 290, width: 110, height: 80 },
    ],
  },
];

const MENU: {
  name: string; order: number;
  subcategories?: { name: string; order: number }[];
  items: { name: string; desc?: string; price: number; order: number; allergens?: number[]; featured?: boolean; mealPeriod?: string; sub?: string }[];
}[] = [
  {
    name: "Antipasti", order: 0,
    items: [
      { name: "Bruschetta al pomodoro",       desc: "Pane tostato, pomodorini, basilico, aglio e olio evo",         price: 7,   order: 0, allergens: [1] },
      { name: "Tagliere di salumi e formaggi",desc: "Selezione di salumi artigianali e formaggi locali con miele",  price: 16,  order: 1 },
      { name: "Carpaccio di manzo",           desc: "Manzo battuto al coltello, rucola, parmigiano e limone",       price: 13,  order: 2, allergens: [7], featured: true },
      { name: "Polpo alla brace",             desc: "Polpo grigliato con patate, olive e prezzemolo",               price: 15,  order: 3, allergens: [14] },
      { name: "Burrata con prosciutto crudo", desc: "Burrata fresca, prosciutto di Parma DOP, pomodori e basilico", price: 14,  order: 4, allergens: [7] },
    ],
  },
  {
    name: "Primi", order: 1,
    subcategories: [
      { name: "Pasta", order: 0 },
      { name: "Risotti", order: 1 },
    ],
    items: [
      { name: "Spaghetti alla carbonara",     desc: "Guanciale, uova, pecorino e pepe nero",                        price: 14,  order: 0, allergens: [1,3,7], featured: true, sub: "Pasta" },
      { name: "Pappardelle al cinghiale",     desc: "Ragù di cinghiale toscano con pappardelle all'uovo",          price: 16,  order: 1, allergens: [1,3], sub: "Pasta" },
      { name: "Gnocchi al pomodoro",          desc: "Gnocchi di patate fatti in casa con pomodoro San Marzano",    price: 12,  order: 2, allergens: [1,3], sub: "Pasta" },
      { name: "Tonnarelli cacio e pepe",      desc: "Pasta fresca, pecorino romano DOP e pepe",                    price: 13,  order: 3, allergens: [1,7], sub: "Pasta" },
      { name: "Risotto ai funghi porcini",    desc: "Riso Carnaroli, porcini freschi, parmigiano e burro",         price: 16,  order: 4, allergens: [7], featured: true, sub: "Risotti" },
      { name: "Risotto al tartufo nero",      desc: "Riso Carnaroli, tartufo nero di Norcia, parmigiano",          price: 22,  order: 5, allergens: [7], sub: "Risotti" },
    ],
  },
  {
    name: "Secondi", order: 2,
    items: [
      { name: "Bistecca alla fiorentina",     desc: "Chianina IGP, 800g, al sangue servita con sale e rosmarino",  price: 42,  order: 0, featured: true },
      { name: "Branzino al forno",            desc: "Branzino intero, patate al limone, capperi e olive",          price: 24,  order: 1, allergens: [4] },
      { name: "Pollo arrosto con patate",     desc: "Pollo ruspante, patate novelle, rosmarino e aglio",           price: 17,  order: 2 },
      { name: "Costolette di agnello",        desc: "Scottadito con menta e limone, verdure di stagione",          price: 26,  order: 3 },
      { name: "Tagliata di manzo con rucola", desc: "Controfiletto, rucola, grana padano, pomodorini",             price: 28,  order: 4 },
    ],
  },
  {
    name: "Contorni", order: 3,
    items: [
      { name: "Patate al forno",              desc: "Con rosmarino e aglio",                                        price: 5,   order: 0 },
      { name: "Verdure grigliate",            desc: "Zucchine, melanzane, peperoni e radicchio",                   price: 6,   order: 1 },
      { name: "Insalata mista",               desc: "Lattuga, rucola, pomodorini e carote",                        price: 4,   order: 2 },
      { name: "Spinaci saltati",              desc: "Con aglio, olio e peperoncino",                               price: 5,   order: 3 },
    ],
  },
  {
    name: "Dolci", order: 4,
    items: [
      { name: "Tiramisù della casa",          desc: "Ricetta originale con savoiardi, mascarpone e caffè",         price: 7,   order: 0, allergens: [1,3,7], featured: true },
      { name: "Panna cotta ai frutti di bosco",desc: "Con coulis di lamponi e mirtilli freschi",                  price: 6,   order: 1, allergens: [7] },
      { name: "Cannolo siciliano",            desc: "Ricotta di pecora, gocce di cioccolato e scorza d'arancia",  price: 6,   order: 2, allergens: [1,3,7] },
      { name: "Semifreddo al limone",         desc: "Limoni di Amalfi, meringa e coulis di fragole",              price: 7,   order: 3, allergens: [3,7] },
    ],
  },
  {
    name: "Vini", order: 5,
    subcategories: [
      { name: "Rossi", order: 0 },
      { name: "Bianchi", order: 1 },
      { name: "Bollicine", order: 2 },
    ],
    items: [
      { name: "Chianti Classico DOCG",        desc: "Toscana — corpo medio, tannini eleganti",                    price: 35,  order: 0, allergens: [12], sub: "Rossi", mealPeriod: "DINNER" },
      { name: "Brunello di Montalcino DOCG",  desc: "Toscana — strutturato, affinato 5 anni in botte",           price: 75,  order: 1, allergens: [12], sub: "Rossi", mealPeriod: "DINNER", featured: true },
      { name: "Montepulciano d'Abruzzo DOC",  desc: "Abruzzo — morbido, frutti rossi e spezie",                  price: 28,  order: 2, allergens: [12], sub: "Rossi", mealPeriod: "DINNER" },
      { name: "Pinot Grigio delle Venezie",   desc: "Veneto — fresco, floreale, ottimo con il pesce",            price: 28,  order: 3, allergens: [12], sub: "Bianchi", mealPeriod: "DINNER" },
      { name: "Vermentino di Sardegna DOC",   desc: "Sardegna — aromatico, minerale",                            price: 30,  order: 4, allergens: [12], sub: "Bianchi", mealPeriod: "DINNER" },
      { name: "Prosecco DOC Treviso",         desc: "Veneto — fine perlage, pesco e fiori bianchi",              price: 25,  order: 5, allergens: [12], sub: "Bollicine" },
      { name: "Franciacorta DOCG Brut",       desc: "Lombardia — metodo classico, elegante e persistente",       price: 45,  order: 6, allergens: [12], sub: "Bollicine", featured: true },
    ],
  },
  {
    name: "Bevande", order: 6,
    items: [
      { name: "Acqua naturale 75cl",          price: 2.5, order: 0 },
      { name: "Acqua frizzante 75cl",         price: 2.5, order: 1 },
      { name: "Coca-Cola 33cl",               price: 3,   order: 2 },
      { name: "Birra artigianale 33cl",       desc: "Bionda o ambrata",                                            price: 5,   order: 3, allergens: [1] },
      { name: "Succo di frutta",              desc: "Albicocca, pesca o arancia",                                 price: 3,   order: 4 },
      { name: "Caffè espresso",               price: 1.5, order: 5 },
      { name: "Tè caldo",                     price: 2.5, order: 6 },
    ],
  },
];

const USERS = [
  { name: "Marco Rossi",    email: "marco@demo.local", role: "STAFF",   password: "Staff1234!"   },
  { name: "Luigi Bianchi",  email: "luigi@demo.local", role: "KITCHEN", password: "Kitchen1234!" },
];

const GUEST_NAMES = [
  "Rossi Mario","Bianchi Lucia","Ferrari Giuseppe","Romano Chiara","Esposito Andrea",
  "Ricci Martina","Marino Davide","Greco Valentina","Bruno Francesco","Gallo Serena",
  "Conti Luca","Mancini Elena","Costa Roberto","Fontana Sara","Barbieri Matteo",
  "Lombardi Anna","Moretti Simone","Caruso Giulia","Russo Paolo","De Luca Federica",
];

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function generateCode(): string { return "BCK-" + nanoid(6).toUpperCase(); }

async function seedDemo() {
  // Controlla se già seeded
  const existing = await prisma.setting.findUnique({ where: { key: "demo.seeded" } });
  if (existing) throw new Error("Dati demo già presenti. Esegui prima la pulizia.");

  // ── Allergeni ──────────────────────────────────────────────
  const allergenIds: string[] = [];
  for (const a of ALLERGENS) {
    const existing = await prisma.allergen.findUnique({ where: { number: a.number } });
    if (!existing) {
      const created = await prisma.allergen.create({ data: a });
      allergenIds.push(created.id);
    } else {
      allergenIds.push(existing.id);
    }
  }

  // Mappa numero → id per allergeni
  const allergenRows = await prisma.allergen.findMany({ select: { id: true, number: true } });
  const allergenMap = Object.fromEntries(allergenRows.map(a => [a.number, a.id]));

  // ── Utenti demo ────────────────────────────────────────────
  const userIds: string[] = [];
  for (const u of USERS) {
    const ex = await prisma.user.findUnique({ where: { email: u.email } });
    if (!ex) {
      const created = await prisma.user.create({
        data: {
          email: u.email, name: u.name,
          password: await hash(u.password, 10),
          role: u.role as "STAFF" | "KITCHEN",
        },
      });
      userIds.push(created.id);
    } else {
      userIds.push(ex.id);
    }
  }

  // ── Planimetria ────────────────────────────────────────────
  const roomIds: string[] = [];
  const allTableIds: string[] = [];

  for (const roomDef of ROOMS) {
    const room = await prisma.room.upsert({
      where: { name: roomDef.name },
      create: { name: roomDef.name, width: roomDef.width, height: roomDef.height, active: true },
      update: {},
    });
    roomIds.push(room.id);

    for (const t of roomDef.tables) {
      const table = await prisma.table.upsert({
        where: { roomId_name: { roomId: room.id, name: t.name } },
        create: { roomId: room.id, ...t },
        update: {},
      });
      allTableIds.push(table.id);
    }
  }

  // ── Menu ───────────────────────────────────────────────────
  const categoryIds: string[] = [];

  for (const catDef of MENU) {
    const cat = await prisma.menuCategory.create({
      data: { name: catDef.name, order: catDef.order },
    });
    categoryIds.push(cat.id);

    // Subcategorie
    const subMap: Record<string, string> = {};
    if (catDef.subcategories) {
      for (const sub of catDef.subcategories) {
        const created = await prisma.menuSubcategory.create({
          data: { categoryId: cat.id, name: sub.name, order: sub.order },
        });
        subMap[sub.name] = created.id;
      }
    }

    // Items
    for (const item of catDef.items) {
      const subId = item.sub ? subMap[item.sub] : undefined;
      const allergenIdList = (item.allergens ?? []).map((n: number) => allergenMap[n]).filter(Boolean);
      await prisma.menuItem.create({
        data: {
          categoryId: cat.id,
          subcategoryId: subId ?? null,
          name: item.name,
          description: item.desc ?? null,
          price: item.price,
          order: item.order,
          allergenIds: allergenIdList,
          featured: item.featured ?? false,
          mealPeriod: item.mealPeriod ?? "ALWAYS",
          available: true,
        },
      });
    }
  }

  // ── Prenotazioni demo ──────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const slots = ["12:30","13:00","13:30","19:30","20:00","20:30","21:00","21:30"];
  const sizes = [2, 2, 2, 4, 4, 6, 8];

  for (let dayOffset = -3; dayOffset <= 7; dayOffset++) {
    const date = addDays(today, dayOffset);
    const resCount = dayOffset < 0 ? 3 : dayOffset === 0 ? 5 : 3;

    for (let i = 0; i < resCount; i++) {
      const partySize = randomItem(sizes);
      const time = randomItem(slots);
      let status: string;
      if (dayOffset < 0) {
        status = randomItem(["CHECKED_OUT","CHECKED_OUT","ARRIVED","CANCELLED","NO_SHOW"]);
      } else if (dayOffset === 0) {
        status = randomItem(["ARRIVED","ARRIVED","PENDING","PENDING","CHECKED_OUT"]);
      } else {
        status = randomItem(["PENDING","PENDING","PENDING","CANCELLED"]);
      }

      // Cerca un tavolo disponibile
      const suitableTable = allTableIds[Math.floor(Math.random() * allTableIds.length)];

      await prisma.reservation.create({
        data: {
          code: generateCode(),
          customerName: randomItem(GUEST_NAMES),
          phone: `+39 ${Math.floor(3000000000 + Math.random() * 999999999)}`,
          partySize,
          date,
          time,
          tableId: suitableTable,
          status: status as "PENDING" | "ARRIVED" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW",
          source: "DEMO",
          notes: Math.random() > 0.7 ? randomItem(["Tavolo vicino alla finestra", "Allergia al glutine", "Compleanno", "Anniversario", "Sedia per bambini"]) : null,
        },
      });
    }
  }

  // ── Salva marker ───────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      { key: "demo.seeded",       value: new Date().toISOString() },
      { key: "demo.roomIds",      value: JSON.stringify(roomIds) },
      { key: "demo.categoryIds",  value: JSON.stringify(categoryIds) },
      { key: "demo.userIds",      value: JSON.stringify(userIds) },
      { key: "demo.allergenIds",  value: JSON.stringify(allergenIds) },
    ],
    skipDuplicates: true,
  });
}

async function cleanDemo() {
  const seeded = await prisma.setting.findUnique({ where: { key: "demo.seeded" } });
  if (!seeded) throw new Error("Nessun dato demo trovato.");

  const roomIdsRow      = await prisma.setting.findUnique({ where: { key: "demo.roomIds" } });
  const categoryIdsRow  = await prisma.setting.findUnique({ where: { key: "demo.categoryIds" } });
  const userIdsRow      = await prisma.setting.findUnique({ where: { key: "demo.userIds" } });
  const allergenIdsRow  = await prisma.setting.findUnique({ where: { key: "demo.allergenIds" } });

  const roomIds:     string[] = roomIdsRow     ? JSON.parse(roomIdsRow.value)     : [];
  const categoryIds: string[] = categoryIdsRow ? JSON.parse(categoryIdsRow.value) : [];
  const userIds:     string[] = userIdsRow     ? JSON.parse(userIdsRow.value)     : [];
  const allergenIds: string[] = allergenIdsRow ? JSON.parse(allergenIdsRow.value) : [];

  // Tavoli nelle sale demo
  const demoTables = await prisma.table.findMany({
    where: { roomId: { in: roomIds } },
    select: { id: true },
  });
  const tableIds = demoTables.map(t => t.id);

  // Cancella ordini e items degli ordini sui tavoli demo
  const demoOrders = await prisma.order.findMany({
    where: { tableId: { in: tableIds } },
    select: { id: true },
  });
  const orderIds = demoOrders.map(o => o.id);
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });

  // Cancella prenotazioni demo
  await prisma.reservation.deleteMany({ where: { source: "DEMO" } });

  // Cancella sale (cascade tables)
  await prisma.room.deleteMany({ where: { id: { in: roomIds } } });

  // Cancella categorie menu (cascade subcategorie e items)
  await prisma.menuCategory.deleteMany({ where: { id: { in: categoryIds } } });

  // Cancella utenti demo
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  // Cancella allergeni demo (solo quelli che non sono usati altrove)
  const usedAllergens = await prisma.menuItem.findMany({
    where: { allergenIds: { isEmpty: false } },
    select: { allergenIds: true },
  });
  const usedIds = new Set(usedAllergens.flatMap(m => m.allergenIds));
  const toDelete = allergenIds.filter(id => !usedIds.has(id));
  if (toDelete.length > 0) {
    await prisma.allergen.deleteMany({ where: { id: { in: toDelete } } });
  }

  // Cancella settings demo
  await prisma.setting.deleteMany({
    where: { key: { startsWith: "demo." } },
  });
}

// ── Route handler ─────────────────────────────────────────────

export async function GET() {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const seeded = await prisma.setting.findUnique({ where: { key: "demo.seeded" } });
  return NextResponse.json({ seeded: !!seeded, seededAt: seeded?.value ?? null });
}

export async function POST(req: Request) {
  const session = await getSaSession();
  if (!session) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  const { action } = await req.json() as { action: string };

  try {
    if (action === "seed") {
      await seedDemo();
      return NextResponse.json({ ok: true, message: "Dati demo importati con successo." });
    }
    if (action === "clean") {
      await cleanDemo();
      return NextResponse.json({ ok: true, message: "Dati demo rimossi con successo." });
    }
    return NextResponse.json({ error: "Azione non valida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

-- ── Room: colonna active mancante ────────────────────────────
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

-- ── Reservation: colonna extraTableIds mancante ──────────────
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "extraTableIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ── MenuItem: colonne aggiunte dopo init ─────────────────────
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "subcategoryId" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "allergenIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "mealPeriod" TEXT NOT NULL DEFAULT 'ALWAYS';
ALTER TABLE "MenuItem" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

-- ── MenuSubcategory: tabella mancante ────────────────────────
CREATE TABLE IF NOT EXISTS "MenuSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MenuSubcategory_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MenuSubcategory"
    ADD CONSTRAINT IF NOT EXISTS "MenuSubcategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MenuItem"
    ADD CONSTRAINT IF NOT EXISTS "MenuItem_subcategoryId_fkey"
    FOREIGN KEY ("subcategoryId") REFERENCES "MenuSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── OrderStatus enum ─────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PREPARING', 'READY', 'DELIVERED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Order: tabella mancante ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_tableId_idx" ON "Order"("tableId");

ALTER TABLE "Order"
    ADD CONSTRAINT IF NOT EXISTS "Order_tableId_fkey"
    FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── OrderItem: tabella mancante ──────────────────────────────
CREATE TABLE IF NOT EXISTS "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrderItem"
    ADD CONSTRAINT IF NOT EXISTS "OrderItem_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
    ADD CONSTRAINT IF NOT EXISTS "OrderItem_menuItemId_fkey"
    FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── WinePairings: tabella relazione self-referencing MenuItem ─
CREATE TABLE IF NOT EXISTS "_WinePairings" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_WinePairings_AB_unique" ON "_WinePairings"("A", "B");
CREATE INDEX IF NOT EXISTS "_WinePairings_B_index" ON "_WinePairings"("B");

ALTER TABLE "_WinePairings"
    ADD CONSTRAINT IF NOT EXISTS "_WinePairings_A_fkey"
    FOREIGN KEY ("A") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_WinePairings"
    ADD CONSTRAINT IF NOT EXISTS "_WinePairings_B_fkey"
    FOREIGN KEY ("B") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

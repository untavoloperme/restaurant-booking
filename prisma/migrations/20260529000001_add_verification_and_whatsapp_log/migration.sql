-- AlterTable: add verification fields to Reservation
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "verificationCode" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: WhatsappLog
CREATE TABLE IF NOT EXISTS "WhatsappLog" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappLog_pkey" PRIMARY KEY ("id")
);

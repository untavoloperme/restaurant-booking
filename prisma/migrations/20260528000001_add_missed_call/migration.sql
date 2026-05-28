-- CreateTable
CREATE TABLE "MissedCall" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isMobile" BOOLEAN NOT NULL,
    "whatsappSent" BOOLEAN NOT NULL DEFAULT false,
    "whatsappError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissedCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissedCall_createdAt_idx" ON "MissedCall"("createdAt");

CREATE TABLE "SuperAdmin" (
    "id"          TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "password"    TEXT NOT NULL,
    "totpSecret"  TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

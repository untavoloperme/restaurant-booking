import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isPrismaUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code: string }).code === "P2002";
}

export function isPrismaNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code: string }).code === "P2025";
}

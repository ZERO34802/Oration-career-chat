// src/server/db.ts
import { PrismaClient } from "@prisma/client";

/**
 * Extend the global type to cache a single PrismaClient instance during development.
 * This prevents creating multiple connections on Next.js hot reload.
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a new client with minimal logging in production and helpful logs in development if desired.
const prismaClientSingleton = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

// Use the global cached instance in dev; create a new one in prod.
export const prisma = global.prisma ?? prismaClientSingleton();

// Cache on global in dev to avoid re-instantiation on HMR.
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export default prisma;

// src/server/trpc.ts
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

type Ctx = {
  userId?: string;
};

export const createTRPCContext = (opts?: Partial<Ctx>): Ctx => {
  return { userId: opts?.userId };
};

const t = initTRPC.context<Ctx>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return next({ ctx: { userId: ctx.userId } });
});

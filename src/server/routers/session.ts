// src/server/routers/session.ts
import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";

export const sessionRouter = router({
  // List sessions owned by the signed-in user (new auth-safe version)
  list: protectedProcedure
    .input(z.object({ cursor: z.string().nullish(), take: z.number().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const take = input?.take ?? 20;
      const items = await prisma.chatSession.findMany({
        where: { userId: ctx.userId! },
        orderBy: { updatedAt: "desc" },
        take: take + 1,
        ...(input?.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
        select: { id: true, title: true, updatedAt: true },
      });

      let nextCursor: string | null = null;
      if (items.length > take) {
        const next = items.pop()!;
        nextCursor = next.id;
      }

      return { items, nextCursor };
    }),

  // Create a session and attach the current user as owner
  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(100) }).optional())
    .mutation(async ({ ctx, input }) => {
      const session = await prisma.chatSession.create({
        data: {
          title: input?.title ?? "New Chat",
          userId: ctx.userId!, // attach owner
        },
        select: { id: true, title: true, updatedAt: true },
      });
      return session;
    }),

  // Rename with ownership check
  rename: protectedProcedure
    .input(z.object({ id: z.string().uuid(), title: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const s = await prisma.chatSession.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });
      if (!s || s.userId !== ctx.userId) {
        throw new Error("NOT_FOUND");
      }

      return prisma.chatSession.update({
        where: { id: input.id },
        data: { title: input.title, updatedAt: new Date() },
        select: { id: true, title: true, updatedAt: true },
      });
    }),
});

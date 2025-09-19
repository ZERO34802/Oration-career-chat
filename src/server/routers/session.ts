import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";

export const sessionRouter = router({
  list: publicProcedure
    .input(z.object({ cursor: z.string().nullish(), take: z.number().default(20) }).optional())
    .query(async ({ input }) => {
      const take = input?.take ?? 20;
      const items = await prisma.chatSession.findMany({
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

  create: publicProcedure
    .input(z.object({ title: z.string().min(1).max(100) }).optional())
    .mutation(async ({ input }) => {
      const session = await prisma.chatSession.create({
        data: { title: input?.title ?? "New session" },
        select: { id: true, title: true, updatedAt: true },
      });
      return session;
    }),

  rename: publicProcedure
  .input(z.object({ id: z.string().uuid(), title: z.string().min(1).max(100) }))
  .mutation(async ({ input }) => {
    return prisma.chatSession.update({
      where: { id: input.id },
      data: { title: input.title },
      select: { id: true, title: true, updatedAt: true },
    });
  }),
});

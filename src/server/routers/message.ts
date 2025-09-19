import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";

export const messageRouter = router({
  listBySession: publicProcedure
    .input(z.object({ sessionId: z.string().uuid(), cursor: z.string().nullish(), take: z.number().default(30) }))
    .query(async ({ input }) => {
      const take = input.take ?? 30;
      const items = await prisma.message.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
        take: take + 1,
        ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
        select: { id: true, role: true, content: true, createdAt: true },
      });
      let nextCursor: string | null = null;
      if (items.length > take) {
        const next = items.pop()!;
        nextCursor = next.id;
      }
      return { items: items.reverse(), nextCursor };
    }),

  addUserMessage: publicProcedure
    .input(z.object({ sessionId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const msg = await prisma.message.create({
        data: { sessionId: input.sessionId, role: "user", content: input.content },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      return msg;
    }),
});

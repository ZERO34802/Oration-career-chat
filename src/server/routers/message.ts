import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getAssistantReply } from "@/server/llm";

export const messageRouter = router({
  // List messages for a session (auth + ownership)
  list: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), cursor: z.string().nullish(), take: z.number().default(30) }))
    .query(async ({ ctx, input }) => {
      const s = await prisma.chatSession.findUnique({ where: { id: input.sessionId }, select: { userId: true } });
      if (!s || s.userId !== ctx.userId) throw new Error("NOT_FOUND");

      const take = input.take ?? 30;
      const items = await prisma.message.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "asc" },
        take: take + 1,
        ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
        select: { id: true, role: true, content: true, createdAt: true },
      });
      let nextCursor: string | null = null;
      if (items.length > take) {
        const next = items.pop()!;
        nextCursor = next.id;
      }
      return { items, nextCursor };
    }),

  // Legacy helper (keep but protect)
  addUserMessage: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const s = await prisma.chatSession.findUnique({ where: { id: input.sessionId }, select: { userId: true } });
      if (!s || s.userId !== ctx.userId) throw new Error("NOT_FOUND");

      const msg = await prisma.message.create({
        data: { sessionId: input.sessionId, role: "user", content: input.content },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      await prisma.chatSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } });
      return msg;
    }),

  // Send user msg, call model, store assistant reply
  send: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const s = await prisma.chatSession.findUnique({ where: { id: input.sessionId }, select: { userId: true, title: true } });
      if (!s || s.userId !== ctx.userId) throw new Error("NOT_FOUND");

      const userMsg = await prisma.message.create({
        data: { sessionId: input.sessionId, role: "user", content: input.content },
        select: { id: true, role: true, content: true, createdAt: true },
      });

      if (/^new\s*/i.test(s.title) || s.title.trim().length === 0) {
        const newTitle = userMsg.content.trim().split(/\s+/).slice(0, 8).join(" ");
        await prisma.chatSession.update({
          where: { id: input.sessionId },
          data: { title: newTitle, updatedAt: new Date() },
        });
      }

      const recent = await prisma.message.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "asc" },
        take: 24,
        select: { role: true, content: true },
      });

      const system = {
        role: "system" as const,
        content:
          "You are a warm, practical career counselor. Give concise, actionable guidance and next steps, and ask clarifying questions when helpful.",
      };

      const replyText = await getAssistantReply([system, ...recent]);
      const aiMsg = await prisma.message.create({
        data: { sessionId: input.sessionId, role: "assistant", content: replyText },
        select: { id: true, role: true, content: true, createdAt: true },
      });

      await prisma.chatSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } });

      return { user: userMsg, assistant: aiMsg };
    }),
});

// Backward-compatible aliases if some components still call old names
export const messageRouterAliases = {
  listBySession: messageRouter._def.procedures.list,
  sendMessage: messageRouter._def.procedures.send,
};

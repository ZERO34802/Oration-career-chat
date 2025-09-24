// src/server/routers/message.ts
import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getAssistantReply } from "@/server/llm";

export const messageRouter = router({
  // List messages (ascending) with cursor pagination
  list: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        cursor: z.string().nullish(),
        take: z.number().min(1).max(50).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Ensure ownership
        const s = await prisma.chatSession.findUnique({
          where: { id: input.sessionId },
          select: { userId: true },
        });
        //debugging line
        console.log("DBG sessionId:", input.sessionId, "ctx.userId:", ctx.userId, "db.userId:", s?.userId);
        if (!s || !ctx.userId || s.userId !== ctx.userId) {
          throw new Error("NOT_FOUND");
        }

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
      } catch (err) {
        console.error("message.list error:", err);
        throw new Error("FAILED_TO_LIST");
      }
    }),

  // Send message -> save user, optional auto-rename, call LLM (safe), save assistant
  send: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure ownership + read title
        const s = await prisma.chatSession.findUnique({
          where: { id: input.sessionId },
          select: { userId: true, title: true },
        });
        //debugging line
        console.log("DBG sessionId:", input.sessionId, "ctx.userId:", ctx.userId, "db.userId:", s?.userId);
        if (!s || !ctx.userId || s.userId !== ctx.userId) {
          throw new Error("NOT_FOUND");
        }

        const userMsg = await prisma.message.create({
          data: { sessionId: input.sessionId, role: "user", content: input.content },
          select: { id: true, role: true, content: true, createdAt: true },
        });

        // Auto-rename first time
        if (/^new\s*/i.test(s.title) || s.title.trim().length === 0) {
          const newTitle = userMsg.content.trim().split(/\s+/).slice(0, 8).join(" ");
          await prisma.chatSession.update({
            where: { id: input.sessionId },
            data: { title: newTitle, updatedAt: new Date() },
          });
        } else {
          await prisma.chatSession.update({
            where: { id: input.sessionId },
            data: { updatedAt: new Date() },
          });
        }

        // Collect short context
        const recent = await prisma.message.findMany({
          where: { sessionId: input.sessionId },
          orderBy: { createdAt: "asc" },
          take: 24,
          select: { role: true, content: true },
        });

        // Call LLM with fallback to avoid 500s if the model fails
        let replyText =
          "Thanks for sharing — give one specific goal or constraint, and practical next steps will be suggested.";
        try {
          replyText = await getAssistantReply([
            { role: "system", content: "You are a warm, practical career counselor. Be concise and actionable." },
            ...recent,
          ]);
        } catch (e) {
          console.error("LLM call failed:", e);
        }

        const aiMsg = await prisma.message.create({
          data: { sessionId: input.sessionId, role: "assistant", content: replyText },
          select: { id: true, role: true, content: true, createdAt: true },
        });

        return { user: userMsg, assistant: aiMsg };
      } catch (err) {
        console.error("message.send error:", err);
        throw new Error("FAILED_TO_SEND");
      }
    }),
});

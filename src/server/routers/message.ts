// src/server/routers/message.ts
import { router, protectedProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { buildCounselorPrompt, getAssistantReply } from "@/server/llm";

function withTimeout<T>(p: Promise<T>, ms = 20000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("LLM_TIMEOUT")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}


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

        const oneMinuteAgo = new Date(Date.now() - 60_000);
        const recentUserCount = await prisma.message.count({
          where: { sessionId: input.sessionId, role: "user", createdAt: { gte: oneMinuteAgo } },
        });
        if (recentUserCount > 20) {
          throw new Error("RATE_LIMIT");
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

        // Collect short context (then build counselor prompt)
        const recent = await prisma.message.findMany({
          where: { sessionId: input.sessionId },
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
          take: 50, // load more; builder will slice to last N turns
        });

        let replyText =
          "Thanks for sharing — give one specific goal or constraint, and practical next steps will be suggested.";
        try {
          const history = recent.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
          const prompt = buildCounselorPrompt(history, 25);
          replyText = await withTimeout(getAssistantReply(prompt), 20000);

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

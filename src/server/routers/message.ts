import { router, publicProcedure } from "@/server/trpc";
import { z } from "zod";
import { prisma } from "@/server/db";
import { getAssistantReply } from "@/server/llm";

export const messageRouter = router({
  // List messages for a session (ascending so chat reads top→bottom)
  listBySession: publicProcedure
    .input(z.object({ sessionId: z.string().uuid(), cursor: z.string().nullish(), take: z.number().default(30) }))
    .query(async ({ input }) => {
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

  // Legacy helper to add only a user message (kept for testing)
  addUserMessage: publicProcedure
    .input(z.object({ sessionId: z.string().uuid(), content: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const msg = await prisma.message.create({
        data: { sessionId: input.sessionId, role: "user", content: input.content },
        select: { id: true, role: true, content: true, createdAt: true },
      });
      await prisma.chatSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } });
      return msg;
    }),

  // New: Saves user msg, calls model, saves assistant reply, returns both
  sendMessage: publicProcedure
  .input(z.object({ sessionId: z.string().uuid(), content: z.string().min(1) }))
  .mutation(async ({ input }) => {
    // 1) Save user message
    const userMsg = await prisma.message.create({
      data: { sessionId: input.sessionId, role: "user", content: input.content },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // 1a) Auto-name from first user message if title is default/empty
    const session = await prisma.chatSession.findUnique({
      where: { id: input.sessionId },
      select: { title: true },
    });
    if (session && (/^new\s*/i.test(session.title) || session.title.trim().length === 0)) {
      const newTitle = userMsg.content.trim().split(/\s+/).slice(0, 8).join(" ");
      await prisma.chatSession.update({
        where: { id: input.sessionId },
        data: { title: newTitle, updatedAt: new Date() },
      });
    }

    // 2) Collect recent context (ascending)
    const recent = await prisma.message.findMany({
      where: { sessionId: input.sessionId },
      orderBy: { createdAt: "asc" },
      take: 24,
      select: { role: true, content: true },
    });

    // 3) System prompt for tone
    const system = {
      role: "system" as const,
      content:
        "You are a warm, practical career counselor. Give concise, actionable guidance and next steps, and ask clarifying questions when helpful.",
    };

    // 4) Call the LLM
    const replyText = await getAssistantReply([system, ...recent]);

    // 5) Save assistant message and touch session
    const aiMsg = await prisma.message.create({
      data: { sessionId: input.sessionId, role: "assistant", content: replyText },
      select: { id: true, role: true, content: true, createdAt: true },
    });
    await prisma.chatSession.update({ where: { id: input.sessionId }, data: { updatedAt: new Date() } });

    return { user: userMsg, assistant: aiMsg };
  }),

});

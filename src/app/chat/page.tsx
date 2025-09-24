// src/app/chat/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";

export default async function ChatIndexPage() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  if (!userId) {
    redirect("/auth/login");
  }

  const latest = await prisma.chatSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest?.id) {
    redirect(`/chat/${latest.id}`);
  } else {
    // No sessions yet; create one and redirect
    const created = await prisma.chatSession.create({
      data: { title: "New Chat", userId },
      select: { id: true },
    });
    redirect(`/chat/${created.id}`);
  }
}

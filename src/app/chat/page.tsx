// src/app/chat/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/server/db";
import { redirect } from "next/navigation";

export default async function ChatIndexPage() {
  // Get the authenticated user
  const session = await getServerSession(authOptions);
  const userId = (session as { userId?: string } | null)?.userId;
  if (!userId) {
    redirect("/auth/login");
  }

  // Find most recently updated session
  const latest = await prisma.chatSession.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (latest?.id) {
    redirect(`/chat/${latest.id}`);
  }

  // Create a new session with a unique title to prevent accidental reuse/rename
  const stamp = new Date().toISOString().slice(11, 19); // HH:MM:SS
  const created = await prisma.chatSession.create({
    data: { title: `New Chat ${stamp}`, userId },
    select: { id: true },
  });

  redirect(`/chat/${created.id}`);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


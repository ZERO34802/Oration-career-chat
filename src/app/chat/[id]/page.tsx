// src/app/chat/[id]/page.tsx (SERVER)
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ChatClient from "./ChatClient";

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient sessionId={params.id} />;
}

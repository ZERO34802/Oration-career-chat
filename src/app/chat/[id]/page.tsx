// src/app/chat/[id]/page.tsx (SERVER)

// Route options must live in a server file
export const dynamic = "force-dynamic";
export const revalidate = 0;

import ChatClient from "./ChatClient";

export default function ChatPage({ params }: { params: { id: string } }) {
  return <ChatClient sessionId={params.id} />;
}

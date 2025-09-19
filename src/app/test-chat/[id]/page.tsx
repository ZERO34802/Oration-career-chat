"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TestChatPage() {
  const { id } = useParams<{ id: string }>();
  const [text, setText] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.message.listBySession.useQuery({
    sessionId: id,
  });

  const send = trpc.message.sendMessage.useMutation({
    onSuccess: () => {
      setText("");
      utils.message.listBySession.invalidate({ sessionId: id });
      utils.session.list.invalidate();
    },
  });

  return (
    <div style={{ padding: 24 }}>
      <h1 className="text-xl font-semibold mb-4">Chat test</h1>

      {isLoading && <p>Loading…</p>}
      {error && <p>Error loading messages</p>}

      <ul className="mb-4">
        {data?.items.map((m) => (
          <li key={m.id}>
            <span className="font-mono text-xs mr-2">{m.role}:</span>
            {m.content}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message"
          className="border px-3 py-2 rounded w-80"
        />
        <Button
          disabled={!text || send.isPending}
          onClick={() => send.mutate({ sessionId: id, content: text })}
        >
          {send.isPending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

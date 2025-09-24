// src/app/chat/[id]/page.tsx
"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter, useParams } from "next/navigation";
import React, { useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

export default function ChatById() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const router = useRouter();
  const [text, setText] = useState("");
  

  // Sidebar: sessions
  const {
    data: sessions,
    isLoading: sessionsLoading,
    error: sessionsError,
  } = trpc.session.list.useQuery({});

  // Messages for this session (paginated shape)
  const {
    data: messages,
    isLoading: msgsLoading,
    error: msgsError,
  } = trpc.message.list.useQuery({ sessionId: id });

  // Create session
  const create = trpc.session.create.useMutation({
    onSuccess: (s) => {
      utils.session.list.invalidate();
      if (s?.id) router.push(`/chat/${s.id}`);
    },
  });

  // Send message
  const send = trpc.message.send.useMutation({
    onSuccess: () => {
      setText("");
      utils.message.list.invalidate({ sessionId: id });
      utils.session.list.invalidate();
    },
  });

  // Normalize messages to an array for rendering
  const messageItems = Array.isArray(messages) ? messages : messages?.items ?? [];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 border-r p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <Button size="sm" onClick={() => create.mutate({ title: "New Chat" })}>
            New
          </Button>
        </div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <div className="flex items-center gap-2">
            {/* existing New button, etc. */}
            <LogoutButton />
          </div>
        </div>
        {sessionsLoading && <p>Loading…</p>}
        {sessionsError && <p className="text-red-600">Error loading sessions</p>}
        <ul className="space-y-2 overflow-auto pr-1">
          {(sessions?.items ?? []).map((s) => (
            <li key={s.id} className={`truncate ${s.id === id ? "font-semibold" : ""}`}>
              <Link className="block hover:underline" href={`/chat/${s.id}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Chat pane */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto p-4">
          {msgsLoading && <p>Loading…</p>}
          {msgsError && <p className="text-red-600">Error loading messages</p>}
          <div className="space-y-3">
            {messageItems.map((m: any) => (
              <div key={m.id} className="max-w-2xl">
                <div className="text-xs text-gray-500 mb-1">{m.role}</div>
                <div className="rounded border p-3 whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        </div>

        <form
          className="border-t p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            send.mutate({ sessionId: id, content: text });
          }}
        >
          <input
            className="flex-1 border rounded p-2"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button type="submit" disabled={send.isPending}>
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </form>
      </main>
    </div>
  );
}

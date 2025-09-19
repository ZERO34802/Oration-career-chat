"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ChatSessionPage() {
  // Resolve id from route
  const p = useParams();
  const raw = (p as any).id as string | string[];
  const id = Array.isArray(raw) ? raw[0] : raw;

  const utils = trpc.useUtils();

  // Pagination state
  const [cursor, setCursor] = useState<string | null>(null);

  // Messages query with cursor
  const { data, isLoading, error, isFetching } = trpc.message.listBySession.useQuery(
    { sessionId: id, cursor, take: 30 },
    {
      placeholderData: (prev) => prev,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    }
  );

  // Session list for the sidebar
  const sessions = trpc.session.list.useQuery();

  // Rename mutation
  const rename = trpc.session.rename.useMutation({
    onSuccess: () => sessions.refetch(),
  });

  // Send message mutation
  const send = trpc.message.sendMessage.useMutation({
    onSuccess: () => {
      utils.message.listBySession.invalidate({ sessionId: id });
      utils.session.list.invalidate();
      setText("");
    },
  });

  // Title input state
  const currentTitle = useMemo(() => {
    return sessions.data?.items.find((s) => s.id === id)?.title ?? "Chat";
  }, [sessions.data, id]);
  const [title, setTitle] = useState(currentTitle);
  useEffect(() => setTitle(currentTitle), [currentTitle]);

  const [text, setText] = useState("");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 border-r p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <Link href="/chat" className="text-sm underline">
            All
          </Link>
        </div>
        <ul className="space-y-2 overflow-auto pr-1">
          {sessions.data?.items.map((s) => (
            <li key={s.id} className="truncate">
              <Link className="block hover:underline" href={`/chat/${s.id}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Header with rename */}
        <header className="border-b p-3 flex items-center gap-2">
          <input
            className="border px-2 py-1 rounded w-[420px] max-w-[70vw]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== currentTitle) {
                rename.mutate({ id, title: trimmed });
              } else {
                setTitle(currentTitle);
              }
            }}
          />
          {rename.isPending && <span className="text-xs text-gray-500">Saving…</span>}
        </header>

        {/* Messages and controls */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && <p>Loading…</p>}
          {error && <p className="text-red-600">Error loading messages</p>}

          {/* Load older */}
          {data?.nextCursor && (
            <div className="mb-3">
              <Button
                variant="outline"
                size="sm"
                disabled={isFetching}
                onClick={() => setCursor(data.nextCursor!)}
              >
                {isFetching ? "Loading…" : "Load older"}
              </Button>
            </div>
          )}

          {/* Pending/error for send */}
          {send.isPending && (
            <div className="px-1 pb-2 text-sm text-gray-500">Assistant is thinking…</div>
          )}
          {send.error && <p className="text-red-600">Send error: {send.error.message}</p>}

          <ul className="space-y-2">
            {data?.items.map((m) => (
              <li key={m.id} className="whitespace-pre-wrap break-words">
                <span className="font-mono text-xs mr-2">{m.role}:</span>
                {m.content}
              </li>
            ))}
          </ul>
        </div>

        {/* Composer */}
        <footer className="border-t p-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="border px-3 py-2 rounded flex-1"
          />
          <Button
            disabled={!text || send.isPending}
            onClick={() => send.mutate({ sessionId: id, content: text })}
          >
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </footer>
      </main>
    </div>
  );
}

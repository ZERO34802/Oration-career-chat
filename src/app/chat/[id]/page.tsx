"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";


export default function ChatSessionPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const router = useRouter();

  const create = trpc.session.create.useMutation({
    onSuccess: (s) => {
      // Refresh the list and navigate to the new session
      utils.session.list.invalidate();
      if (s?.id) router.push(`/chat/${s.id}`);
    },
  });


  // Pagination state
  const [cursor, setCursor] = useState<string | null>(null);

  // Messages query with cursor
  const { data, isLoading, error, isFetching } = trpc.message.listBySession.useQuery(
  { sessionId: id, cursor, take: 30 },
  {
    placeholderData: (prev) => prev, // keeps previous page while fetching
    refetchOnWindowFocus: false,
    staleTime: 5_000,
  }
  );
  
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [assistantTyping, setAssistantTyping] = useState(false);


  // Session list for the sidebar
  const sessions = trpc.session.list.useQuery();

  // Rename mutation
  const rename = trpc.session.rename.useMutation({
    onSuccess: () => sessions.refetch(),
  });

  const [optimistic, setOptimistic] = useState<string | null>(null);

  // sendMessage mutation
  const send = trpc.message.sendMessage.useMutation({
    onMutate: (vars) => {
      setPendingUser(vars.content);       // show just-typed user text at bottom
      setAssistantTyping(true);           // show typing bubble
    },
    onSuccess: () => {
      setText("");
      setPendingUser(null);               // clear pending user bubble
      setAssistantTyping(false);          // hide typing bubble
      utils.message.listBySession.invalidate({ sessionId: id });
      utils.session.list.invalidate();
    },
    onError: () => {
      setAssistantTyping(false);
      setPendingUser(null);               // remove pending on error to avoid duplication
    },
  });



  // Compose title input
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
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => create.mutate({ title: "New Chat" })}>
              New
            </Button>
            <Link href="/chat" className="text-sm underline">
              All
            </Link>
          </div>
        </div>

        <ul className="space-y-2 overflow-auto pr-1">
          {sessions.data?.items.map((s) => (
            <li key={s.id} className={`truncate ${s.id === id ? "font-semibold" : ""}`}>
              <Link className="block hover:underline" href={`/chat/${s.id}`}>
                {s.title}
                <span className="block text-xs text-gray-500">
                  {new Date((s as any).updatedAt ?? Date.now()).toLocaleString?.() ?? ""}
                </span>
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

        {/* Messages */}
        <section className="flex-1 overflow-auto p-4">
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

          {/* Optimistic user bubble */}
          {optimistic && (
            <div className="mb-2 rounded-md px-3 py-2 bg-white border max-w-3xl">
              <div className="text-xs text-gray-500 mb-1">User</div>
              <div className="whitespace-pre-wrap break-words">{optimistic}</div>
            </div>
          )}


          <ul className="space-y-3 max-w-3xl">
            {data?.items.map((m) => (
              <li key={m.id} className="flex">
                <div
                  className={
                    "rounded-md px-3 py-2 whitespace-pre-wrap break-words " +
                    (m.role === "assistant" ? "bg-gray-100" : "bg-white border")
                  }
                >
                  <div className="text-xs text-gray-500 mb-1">{m.role === "assistant" ? "Assistant" : "User"}</div>
                  <div>{m.content}</div>
                </div>
              </li>
            ))}

            {pendingUser && (
              <li className="flex">
                <div className="rounded-md px-3 py-2 bg-white border whitespace-pre-wrap break-words">
                  <div className="text-xs text-gray-500 mb-1">User</div>
                  <div>{pendingUser}</div>
                </div>
              </li>
            )}

            {assistantTyping && (
              <li className="flex">
                <div className="rounded-md px-3 py-2 bg-gray-100">
                  <div className="text-xs text-gray-500 mb-1">Assistant</div>
                  <span className="inline-flex gap-1 items-end">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.3s]"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.15s]"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  </span>
                </div>
              </li>
            )}
          </ul>

        </section>

        {/* Composer */}
        <footer className="border-t p-3 flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="border px-3 py-2 rounded flex-1 resize-none h-[44px] max-h-[120px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const content = text.trim();
                if (content) send.mutate({ sessionId: id, content });
              }
            }}
          />
          <Button
            disabled={!text.trim() || send.isPending}
            onClick={() => {
              const content = text.trim();
              if (content) send.mutate({ sessionId: id, content });
            }}
          >
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </footer>

      </main>
    </div>
  );
}

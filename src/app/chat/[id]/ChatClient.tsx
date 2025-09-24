// src/app/chat/[id]/ChatClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function ChatClient({ sessionId }: { sessionId: string }) {
  const id = sessionId;
  const router = useRouter();
  const utils = trpc.useUtils();

  // Sidebar sessions
  const sessions = trpc.session.list.useQuery({});

  // Local state
  const [title, setTitle] = useState("Chat");
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [lastSentId, setLastSentId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
  };

  
  const [creating, setCreating] = useState(false);

  // Typewriter
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navBusyRef = useRef(false);

  useEffect(() => {
  // when id changes, reset local view state
  setCursor(null);
  setPendingUser(null);
  setAssistantTyping(false);
  setLastSentId(null);
  setTypingMsgId(null);
  setTypedText("");
  // optional: scroll reset aids visual confirmation
  setTimeout(() => scrollToBottom(false), 0);
  }, [id]);
  

  const goToSession = (sid: string) => {
    console.log("goTo", sid); // verify tap fires

    // Ignore if already navigating or tapping the same session
    if (navBusyRef.current || String(sid) === String(id)) return;

    navBusyRef.current = true;

    // Close the sidebar first so the overlay can't intercept
    setSidebarOpen(false);

    const href = `/chat/${sid}`;
    const nonce = Date.now(); // cache buster for mobile Safari

    // Allow the sidebar/backdrop to unmount before navigation
    setTimeout(() => {
      try {
        // Preferred: client-side replace to keep app state
        router.replace(`${href}?n=${nonce}`);
      } catch (e) {
        // Fallback: full navigation (bulletproof on older mobile browsers)
        // eslint-disable-next-line no-restricted-globals
        location.assign(`${href}?n=${nonce}`);
      } finally {
        // Release lock a bit later to avoid rapid double taps
        setTimeout(() => {
          navBusyRef.current = false;
        }, 150);
      }
    }, 100); // 100ms works best on iOS to let overlay unmount
  };
  

  const typedKey = `typed:lastAssistant:${id}`;
  const getStoredTypedId = () => (typeof window === "undefined" ? null : localStorage.getItem(typedKey));
  const setStoredTypedId = (val: string) => {
    if (typeof window !== "undefined") localStorage.setItem(typedKey, val);
  };
  

  useEffect(() => {
    if (text.trim().length > 0) {
      setUserTyping(true);
      const t = setTimeout(() => setUserTyping(false), 1200);
      return () => clearTimeout(t);
    } else {
      setUserTyping(false);
    }
  }, [text]);

  const currentTitle = useMemo(
    () => sessions.data?.items.find((s) => s.id === id)?.title ?? "Chat",
    [sessions.data, id]
  );
  useEffect(() => setTitle(currentTitle), [currentTitle]);

  const hasId = typeof id === "string" && id.length > 0;

  // Messages
  const { data, isLoading, error, isFetching } = trpc.message.list.useQuery(
    { sessionId: String(id), cursor, take: 30 },
    { enabled: hasId, placeholderData: (prev) => prev, refetchOnWindowFocus: false, staleTime: 5_000 }
  );

  useEffect(() => {
    if (!data?.items) return;
    scrollToBottom(false);
  }, [data?.items?.length]);

  useEffect(() => {
    if (typingMsgId) scrollToBottom(true);
  }, [typingMsgId, typedText]);

  useEffect(() => {
    const items = data?.items ?? [];
    const latestAssistant = [...items].reverse().find((m: any) => m.role === "assistant");
    if (!latestAssistant) {
      setTypingMsgId(null);
      setTypedText("");
      return;
    }
    const stored = getStoredTypedId();
    if (!stored || stored !== latestAssistant.id) {
      if (typingMsgId !== latestAssistant.id) {
        setTypingMsgId(latestAssistant.id);
        setTypedText("");
      }
    } else {
      setTypingMsgId(null);
      setTypedText("");
    }
  }, [data?.items, typingMsgId]);

  useEffect(() => {
    if (!typingMsgId) return;
    const items = data?.items ?? [];
    const msg = items.find((m: any) => m.id === typingMsgId);
    if (!msg) return;
    const full = msg.content as string;
    if (typedText.length >= full.length) {
      setStoredTypedId(typingMsgId);
      return;
    }
    const t = setTimeout(() => setTypedText(full.slice(0, typedText.length + 2)), 20);
    return () => clearTimeout(t);
  }, [typingMsgId, typedText, data?.items]);

  // Create session
  const create = trpc.session.create.useMutation({
    onMutate: () => setCreating(true),
    onSuccess: (s) => {
      utils.session.list.invalidate();
      if (s?.id) goToSession(s.id);
    },
    onError: (e) => console.error("Create failed:", e),
    onSettled: () => setCreating(false),
  });

  // Rename
  const rename = trpc.session.rename.useMutation({
    onSuccess: () => sessions.refetch(),
  });

  // Send message
  const send = trpc.message.send.useMutation({
    onMutate: (vars) => {
      setPendingUser(vars.content);
      setAssistantTyping(true);
    },
    onSuccess: (res) => {
      setText("");
      setLastSentId(res.user.id);
      setPendingUser(null);
      setAssistantTyping(false);
      utils.message.list.invalidate({ sessionId: String(id) });
      utils.session.list.invalidate();
      scrollToBottom(true);
    },
    onError: () => {
      setAssistantTyping(false);
      setPendingUser(null);
    },
  });

  return (
    <div className="flex h-screen flex-col sm:flex-row bg-white text-black dark:bg-neutral-950 dark:text-neutral-100 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={
          "sm:w-72 w-[85%] max-w-[22rem] sm:max-w-none sm:h-auto h-full sm:h-auto sm:relative fixed inset-y-0 left-0 z-30 " +
          "border-b sm:border-b-0 sm:border-r p-3 flex flex-col bg-gray-50 dark:bg-neutral-900 dark:border-neutral-800 " +
          "overflow-auto transition-transform duration-300 ease-out " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0")
        }
      >
        {sidebarOpen && (
          <div
            className="sm:hidden fixed inset-0 z-20 bg-black/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="flex items-center justify-between mb-3 z-40">
          <h2 className="text-lg font-semibold text-black dark:text-neutral-100">Sessions</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="relative z-40 pointer-events-auto"
              disabled={creating}
              onClick={() => {
                if (creating) return;
                const stamp = new Date().toLocaleTimeString();
                create.mutate({ title: `New Chat ${stamp}` });
              }}
            >
              {creating ? "Creating…" : "New"}
            </Button>
            <Link href="/chat" className="text-sm underline">All</Link>
          </div>
        </div>

        <ul className="space-y-2 overflow-auto pr-1">
          {(sessions.data?.items ?? []).map((s) => (
            <li key={s.id} className={`truncate ${String(s.id) === String(id) ? "font-semibold" : ""}`}>
              <div
                role="link"
                tabIndex={0}
                className="block hover:underline cursor-pointer z-40"
                onClick={() => goToSession(s.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") goToSession(s.id);
                }}
              >
                {s.title}
                <span className="block text-xs text-gray-500">
                  {new Date((s as any).updatedAt ?? Date.now()).toLocaleString?.() ?? ""}
                </span>
              </div>
            </li>

          ))}
        </ul>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col bg-white dark:bg-neutral-950 min-h-0">
        {/* Header with rename */}
        <header className="border-b p-2 sm:p-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-gray-300 dark:border-neutral-700"
            aria-label="Toggle sidebar"
          >
            <span className="block w-5 h-0.5 bg-current mb-1"></span>
            <span className="block w-5 h-0.5 bg-current mb-1"></span>
            <span className="block w-5 h-0.5 bg-current"></span>
          </button>

          <input
            className="border px-2 py-1 rounded w-full sm:w-[420px] sm:max-w-[70vw]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const trimmed = title.trim();
              if (trimmed && trimmed !== currentTitle) {
                rename.mutate({ id: String(id), title: trimmed });
              } else {
                setTitle(currentTitle);
              }
            }}
          />
          {rename.isPending && <span className="text-xs text-gray-500">Saving…</span>}
          <div className="ml-auto">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-auto p-4">
          {isLoading && <p>Loading…</p>}
          {error && <p className="text-red-600">Error loading messages</p>}

          {data?.nextCursor && (
            <div className="mb-3 text-black dark:text-neutral-100">
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

          <ul className="space-y-3 max-w-3xl mx-auto px-1 sm:px-0">
            {(data?.items ?? []).map((m) => (
              <li key={m.id} className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    "rounded-md px-3 py-2 whitespace-pre-wrap break-words max-w-[80%] " +
                    (m.role === "assistant"
                      ? "bg-gray-100 text-black dark:bg-neutral-800 dark:text-neutral-100"
                      : "bg-white text-black border dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800")
                  }
                >
                  <div className="text-xs text-gray-500 dark:text-neutral-400 mb-1">
                    {m.role === "assistant" ? "Assistant" : "User"}
                    {m.role === "user" && lastSentId === m.id && (
                      <span className="ml-2 text-[10px] text-gray-400">Sent ✓</span>
                    )}
                  </div>

                  <div>{m.role === "assistant" && typingMsgId === m.id ? typedText : m.content}</div>
                </div>
              </li>
            ))}

            {pendingUser && (
              <li className="flex justify-end">
                <div className="rounded-md px-3 py-2 bg-white text-black border dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800 whitespace-pre-wrap break-words max-w-[80%]">
                  <div className="text-xs text-gray-500 dark:text-neutral-400 mb-1">User</div>
                  <div>{pendingUser}</div>
                </div>
              </li>
            )}

            {assistantTyping && (
              <li className="flex justify-start">
                <div className="rounded-md px-3 py-2 bg-gray-100 text-black dark:bg-neutral-800 dark:text-neutral-100 max-w-[80%]">
                  <div className="text-xs text-gray-500 dark:text-neutral-400 mb-1">Assistant</div>
                  <span className="inline-flex gap-1 items-end">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.3s]"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-.15s]"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                  </span>
                </div>
              </li>
            )}
          </ul>
          <div ref={bottomRef} />
        </section>

        {/* Typing indicator */}
        {userTyping && <div className="px-3 pb-2 text-xs text-gray-500">Typing…</div>}

        {/* Composer */}
        <footer className="border-t p-2 sm:p-3 flex gap-2 bg-white dark:bg-neutral-950 dark:border-neutral-800">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message"
            className="border px-3 py-2 rounded flex-1 resize-none h-[44px] max-h-[140px] bg-white text-black dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-800"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const content = text.trim();
                if (content && hasId) send.mutate({ sessionId: String(id), content });
              }
            }}
          />
          <Button
            className="min-w-[72px] min-h-[44px]"
            disabled={!text.trim() || send.isPending || !hasId}
            onClick={() => {
              const content = text.trim();
              if (content && hasId) send.mutate({ sessionId: String(id), content });
            }}
          >
            {send.isPending ? "Sending…" : "Send"}
          </Button>
        </footer>
      </main>
    </div>
  );
}

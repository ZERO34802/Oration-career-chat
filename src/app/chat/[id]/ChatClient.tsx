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

  // Typewriter state
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null);
  const [typedText, setTypedText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const goToSession = (sid: string) => {
    setSidebarOpen(false);
    setTimeout(() => router.replace(`/chat/${sid}`), 50);
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

  // Messages (paginated)
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
          <div className="sm:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
        )}

        <div className="flex items-center justify-between mb-3">
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
            <li key={s.id} className={`truncate ${s.id === id ? "font-semibold" : ""}`}>
              <Link
                className="block hover:underline"
                href={`/chat/${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goToSession(s.id);
                }}
              >
                {s.title}
                <span className="block text-xs text-gray-500">{new Date((s as any).updatedAt ?? Date.now()).toLocaleString?.() ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main ... keep the rest of your JSX unchanged */}
      {/* ... header, messages, composer (unchanged from your current file) */}
    </div>
  );
}

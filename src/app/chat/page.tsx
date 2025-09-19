"use client";

import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import React from "react";

export default function ChatHome() {
  const utils = trpc.useUtils();
  const router = useRouter();

  const { data, isLoading, error } = trpc.session.list.useQuery();

  const create = trpc.session.create.useMutation({
    onSuccess: (s) => {
      utils.session.list.invalidate();
      if (s?.id) router.push(`/chat/${s.id}`);
    },
  });

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
        {isLoading && <p>Loading…</p>}
        {error && <p className="text-red-600">Error loading sessions</p>}
        <ul className="space-y-2 overflow-auto pr-1">
          {data?.items.map((s) => (
            <li key={s.id} className="truncate">
              <Link className="block hover:underline" href={`/chat/${s.id}`}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Empty state */}
      <main className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select a session on the left or create a new one.</p>
      </main>
    </div>
  );
}

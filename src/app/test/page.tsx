"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TestPage() {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.session.list.useQuery();
  const create = trpc.session.create.useMutation({
    onSuccess: () => utils.session.list.invalidate(),
  });

  return (
    <div style={{ padding: 24 }}>
      <h1 className="text-xl font-semibold mb-4">Sessions test</h1>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => create.mutate({ title: "First chat" })}>
          Create session
        </Button>
      </div>

      <div className="mt-2">
        {isLoading && <p>Loading…</p>}
        {error && <p>Error loading sessions</p>}
      </div>

      <ul className="mt-2 list-disc pl-6">
        {data?.items.map((s) => (
          <li key={s.id}>
            <span className="font-semibold">{s.title}</span>
            <span className="ml-2 text-xs text-gray-500">{s.id}</span>
            <Link className="ml-3 text-blue-600 underline" href={`/test-chat/${s.id}`}>
              Open
            </Link>
          </li>
        ))}
      </ul>

      {data?.nextCursor && (
        <p className="mt-2 text-sm text-gray-500">More available…</p>
      )}
    </div>
  );
}

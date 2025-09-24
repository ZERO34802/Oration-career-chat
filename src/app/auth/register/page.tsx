// src/app/auth/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({} as any));
      setErr(j.error ?? "Registration failed");
      return;
    }
    router.push("/auth/login?registered=1");
  }

  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-xl mb-4">Create account</h1>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          className="border p-2 rounded"
          placeholder="Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Password (min 8)"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="bg-black text-white rounded py-2" disabled={loading}>
          {loading ? "Creating..." : "Register"}
        </button>
      </form>
    </main>
  );
}

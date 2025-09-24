"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/chat",
      });
      // If credentials invalid, NextAuth may return here without redirect:
      setSubmitting(false);
    } catch (e: any) {
      setError("Invalid email or password");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black dark:bg-neutral-950 dark:text-neutral-100 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md sm:max-w-lg">
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-sm p-4 sm:p-6">
          <h1 className="text-2xl font-semibold mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
            Welcome back. Enter credentials to continue.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <Button type="submit" className="w-full min-h-[44px]" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-gray-500 dark:text-neutral-400">
            New here?{" "}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Create an account
            </Link>
          </p>
        </div>

        <p className="mt-4 sm:mt-6 text-center text-xs text-gray-400">
          By continuing, agreement to Terms and Privacy applies.
        </p>
      </div>
    </main>
  );
}

"use client"
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { trpc } from "@/lib/trpc";

export default function Home() {
  return (
    <main className="p-6">
      <a className="underline text-blue-600" href="/chat">Open chat</a>
    </main>
  );
}

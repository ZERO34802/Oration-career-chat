// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { appRouter } from "@/server/routers/_app";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createTRPCContext } from "@/server/trpc";

const handler = async (req: Request) => {
  const session = await getServerSession(authOptions);
  const ctx = createTRPCContext({ userId: (session as any)?.userId as string | undefined });

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ctx,
  });
};

export { handler as GET, handler as POST };

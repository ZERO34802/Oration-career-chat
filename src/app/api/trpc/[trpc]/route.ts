// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { getServerSession } from "next-auth";
// If you have "@" alias set in tsconfig.json, use this import:
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
// If you do NOT have the "@" alias configured, comment the line above
// and uncomment the relative import below instead:
// import { authOptions } from "../../auth/[...nextauth]/route";

/**
 * Create tRPC context per request.
 * Exposes userId (if signed in) so routers can enforce authorization.
 */
async function createContext() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.userId as string | undefined;
  return { userId };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };

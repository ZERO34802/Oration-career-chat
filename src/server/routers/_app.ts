import { router } from "@/server/trpc";
import { exampleRouter } from "@/server/routers/example";
import { sessionRouter } from "@/server/routers/session";
import { messageRouter } from "@/server/routers/message";

export const appRouter = router({
  example: exampleRouter,
  session: sessionRouter,
  message: messageRouter,
});

export type AppRouter = typeof appRouter;

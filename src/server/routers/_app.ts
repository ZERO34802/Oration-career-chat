// src/server/routers/_app.ts
import { router } from "../trpc";
import { sessionRouter } from "./session";
import { messageRouter } from "./message";
import { exampleRouter } from "./example";

export const appRouter = router({
  session: sessionRouter,
  message: messageRouter,
  example: exampleRouter,
});

export type AppRouter = typeof appRouter;

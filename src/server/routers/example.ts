import { publicProcedure, router } from "@/server/trpc";

export const exampleRouter = router({
ping: publicProcedure.query(() => "pong"),
});
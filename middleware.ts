// middleware.ts
export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/chat/:path*", "/sessions/:path*"],
};

// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const isAuthed = req.cookies.get("next-auth.session-token") || req.cookies.get("__Secure-next-auth.session-token");
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/chat") && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/chat"],
};

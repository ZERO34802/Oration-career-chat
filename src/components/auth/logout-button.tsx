  // src/components/auth/logout-button.tsx
"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signOut({ callbackUrl: "/auth/login" })}
    >
      Logout
    </Button>
  );
}

"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // This disables the automatic session refresh when tab is focused
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
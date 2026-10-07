"use client";
import { SessionProvider } from "next-auth/react";
import TokenRefresh from "@/library/TokenRefresh";
import { TOKEN_REFRESH_WINDOW_MS } from "@/lib/token-refresh";

export default function NextAuthWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={TOKEN_REFRESH_WINDOW_MS / 1000}
      refetchOnWindowFocus={false}
    >
      <TokenRefresh />
      {children}
    </SessionProvider>
  );
}

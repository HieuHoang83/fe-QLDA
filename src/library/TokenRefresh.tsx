"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  TOKEN_REFRESH_MIN_DELAY_MS,
  TOKEN_REFRESH_WINDOW_MS,
} from "@/lib/token-refresh";

export default function TokenRefresh() {
  const { data: session, status, update } = useSession();
  const [tick, setTick] = useState(0);

  const expiresAt = session?.accessTokenExpires;

  useEffect(() => {
    if (status !== "authenticated" || !expiresAt || session?.error) return;

    const delay = Math.max(
      expiresAt - TOKEN_REFRESH_WINDOW_MS - Date.now(),
      TOKEN_REFRESH_MIN_DELAY_MS
    );

    const timer = setTimeout(() => {
      void update().finally(() => setTick((value) => value + 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [status, expiresAt, session?.error, update, tick]);

  return null;
}

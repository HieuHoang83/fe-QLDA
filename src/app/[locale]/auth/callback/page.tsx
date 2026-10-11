"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

/**
 * Trang nhan ket qua quay ve tu Haravan.
 *
 * Luong: FE -> BE `/haravan/auth/login` -> Haravan -> BE `/haravan/auth/callback` ->
 * FE `/auth/callback?code=<ticket>`. Ticket dung mot lan, frontend doi no lay token qua
 * provider `haravan` cua NextAuth roi vao thang trang chinh.
 *
 * Khong in token ra URL: query string duoc ghi vao log proxy va lich su trinh duyet.
 */
function HaravanCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("LoginPage");
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    // StrictMode chay effect hai lan o lan render dau; ticket dung mot lan nen phai chay once.
    if (done.current) return;
    done.current = true;

    const ticket = searchParams.get("code");
    const denied = searchParams.get("error");

    if (denied) {
      setError(t("haravanDenied"));
      return;
    }

    if (!ticket) {
      setError(t("haravanNoTicket"));
      return;
    }

    void (async () => {
      try {
        const res = await signIn("haravan", { ticket, redirect: false });
        if (res?.error) {
          setError(t("haravanFailed"));
          return;
        }
        router.replace("/");
        router.refresh();
      } catch {
        setError(t("haravanFailed"));
      }
    })();
  }, [router, searchParams, t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800">
      {error ? (
        <>
          <p className="text-lg font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/auth/login")}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-gray-800"
          >
            {t("backToLogin")}
          </button>
        </>
      ) : (
        <>
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          <p className="text-lg font-semibold">{t("haravanSigningIn")}</p>
        </>
      )}
    </div>
  );
}

export default function HaravanCallbackPage() {
  return (
    // `useSearchParams` yeu cau co Suspetchung de trang render o server khong loi.
    <Suspense fallback={null}>
      <HaravanCallbackContent />
    </Suspense>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect, type ReactNode } from "react";
import HaravanHeader from "@/components/haravan/HaravanHeader";

interface HaravanShellProps {
  title?: string;
  children: ReactNode;
  fill?: boolean;
}

export default function HaravanShell({
  title,
  children,
  fill = false,
}: HaravanShellProps) {
  const { data: session, status } = useSession();
  const locale = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/${locale}`);
    }
  }, [status, router, locale]);

  if (status === "loading" || !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f2] dark:bg-[#151713]">
        <div className="flex items-center gap-3 text-sm font-semibold text-[#64705d] dark:text-[#c4dfa9]">
          <i className="pi pi-spin pi-spinner text-lg" aria-hidden="true" />
          Đang kiểm tra phiên đăng nhập...
        </div>
      </main>
    );
  }

  return (
    <main
      className={
        fill
          ? "flex h-screen flex-col overflow-hidden bg-[#f5f6f2] text-[#20231f] dark:bg-[#151713] dark:text-[#f4f5ef]"
          : "min-h-screen bg-[#f5f6f2] text-[#20231f] dark:bg-[#151713] dark:text-[#f4f5ef]"
      }
    >
      <HaravanHeader />

      <div
        className={`mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 ${
          fill ? "flex min-h-0 flex-1 flex-col" : ""
        }`}
      >
        {title ? (
          <div className={`mb-5 ${fill ? "shrink-0" : ""}`}>
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          </div>
        ) : null}
        {fill ? (
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        ) : (
          children
        )}
      </div>
    </main>
  );
}

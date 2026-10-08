"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import HaravanHeader from "@/components/haravan/HaravanHeader";
import AccountMenu from "@/components/haravan/AccountMenu";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      className="flex h-screen overflow-hidden bg-[#f7f9fc] text-[#20231f] dark:bg-[#151713] dark:text-[#f4f5ef]"
    >
      <HaravanHeader collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-10 flex h-[62px] shrink-0 items-center gap-5 border-b border-[#d9dde3] bg-white px-5">
          <button type="button" aria-label="Quay lại" onClick={() => router.back()} className="text-xl text-[#475569]"><i className="pi pi-arrow-left" /></button>
          <div className="ml-auto flex items-center gap-5 text-[#334155]">
            <button type="button" aria-label="Tin nhắn" className="relative"><i className="pi pi-comments text-lg" /><span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-[#ef3340] text-xs font-bold text-white">1</span></button>
            <button type="button" aria-label="Thông báo"><i className="pi pi-bell text-lg" /></button>
            <button type="button" aria-label="Hoạt động gần đây"><i className="pi pi-clock text-lg" /></button>
            <AccountMenu />
          </div>
        </header>
        <div className={`flex min-h-0 flex-1 flex-col overflow-auto px-5 py-5 lg:px-7 ${fill ? "overflow-hidden" : ""}`}>
          {title ? <div className="mb-5 shrink-0"><h1 className="text-3xl font-extrabold tracking-tight">{title}</h1></div> : null}
          {fill ? <div className="flex min-h-0 flex-1 flex-col">{children}</div> : children}
        </div>
      </div>
    </main>
  );
}

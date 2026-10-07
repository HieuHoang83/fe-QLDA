"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useLocale } from "next-intl";
import ShopSelector from "@/components/Shop/ShopSelector";

export const HARAVAN_NAV_ITEMS = [
  { href: "", label: "Đơn hàng", icon: "pi-shopping-bag" },
  { href: "/products", label: "Sản phẩm", icon: "pi-box" },
  { href: "/customers", label: "Khách hàng", icon: "pi-users" },
];

export default function HaravanHeader() {
  const { data: session } = useSession();
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-[#e6e9df] bg-[#f5f6f2]/95 backdrop-blur dark:border-[#363b31] dark:bg-[#151713]/95">
      <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <nav className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm dark:bg-[#20231f]">
          {HARAVAN_NAV_ITEMS.map((item) => {
            const href = `/${locale}${item.href}`;
            const active =
              item.href === ""
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={item.label}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-[#527b49] text-white"
                    : "text-[#596052] hover:bg-[#f3f5ef] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                }`}
              >
                <i className={`pi ${item.icon}`} aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ShopSelector />
          {session?.user.phone && (
            <span className="hidden text-sm text-[#73796f] dark:text-[#b3b9ad] sm:inline">
              {session.user.phone}
            </span>
          )}
          <button
            type="button"
            onClick={() => void signOut({ redirect: false })}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e1e5dc] bg-white px-3 text-sm font-semibold text-[#596052] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
          >
            <i className="pi pi-sign-out" aria-hidden="true" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}

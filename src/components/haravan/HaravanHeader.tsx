"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";

interface HaravanHeaderProps { collapsed: boolean; onToggle: () => void }

const sections = [
  { title: "BÁN HÀNG", items: [
    { href: "", label: "Đơn hàng", icon: "pi-shopping-bag" },
    { href: "/products", label: "Sản phẩm", icon: "pi-box" },
    { href: "/customers", label: "Khách hàng", icon: "pi-users" },
  ] },
];

const inventoryItems = [
    { href: "/inventory/transactions", label: "Chi tiết tồn kho", icon: "pi-list" },
    { href: "/inventory/purchasing-orders", label: "Đặt hàng", icon: "pi-file-edit" },
    { href: "/inventory/receives", label: "Nhập hàng", icon: "pi-download" },
    { href: "/inventory/purchase-returns", label: "Trả hàng nhập", icon: "pi-replay" },
    { href: "/inventory/suppliers", label: "Nhà cung cấp", icon: "pi-truck" },
    { href: "/inventory/stock-takes", label: "Kiểm kho", icon: "pi-check-square" },
    { href: "/inventory/transfers", label: "Điều chuyển", icon: "pi-arrow-right-arrow-left" },
    { href: "/inventory/activities", label: "Lịch sử", icon: "pi-history" },
];

export default function HaravanHeader({ collapsed, onToggle }: HaravanHeaderProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const [inventoryOpen, setInventoryOpen] = useState(pathname.includes("/inventory"));

  useEffect(() => {
    if (pathname.includes("/inventory")) setInventoryOpen(true);
  }, [pathname]);

  return (
    <aside className={`flex h-full shrink-0 flex-col border-r border-[#d9dde3] bg-white text-[#344054] transition-[width] duration-200 ${collapsed ? "w-[76px]" : "w-[280px]"}`}>
      <div className={`flex h-[62px] shrink-0 items-center border-b border-[#d9dde3] ${collapsed ? "justify-center" : "justify-between px-5"}`}>
        {!collapsed && <Link href={`/${locale}`} className="text-[30px] font-black tracking-tight text-[#f36b21]">FOXIA</Link>}
        <button type="button" onClick={onToggle} aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"} title={collapsed ? "Mở rộng menu" : "Thu gọn menu"} className="grid h-9 w-9 place-items-center rounded-lg text-[#475569] hover:bg-[#f1f4f8]"><i className={`pi ${collapsed ? "pi-angle-right" : "pi-bars"}`} /></button>
      </div>
      <nav className={`scrollbar-hide flex-1 overflow-y-auto pb-5 pt-3 ${collapsed ? "px-2" : "px-3"}`}>
        {sections.map((section) => <section key={section.title} className="mb-4">
          {!collapsed && <h2 className="px-2 py-2 text-xs font-bold tracking-wide text-[#64748b]">{section.title}</h2>}
          {section.items.map((item) => {
            const href = `/${locale}${item.href}`;
            const active = item.href ? pathname.startsWith(href) : pathname === href;
            return <Link key={`${section.title}-${item.label}`} href={href} title={collapsed ? item.label : undefined} className={`flex h-11 items-center gap-3 rounded-lg px-2 text-[15px] transition ${collapsed ? "justify-center" : ""} ${active ? "bg-[#fff4ed] font-semibold text-[#e96725]" : "hover:bg-[#f5f7fa]"}`}>
              <i className={`pi ${item.icon} w-5 text-center text-[#c5ab82]`} aria-hidden="true" />{!collapsed && item.label}
            </Link>;
          })}
        </section>)}
        <section className="mb-4">
          <button
            type="button"
            onClick={() => setInventoryOpen((open) => !open)}
            title={collapsed ? "Kho hàng" : undefined}
            aria-expanded={inventoryOpen}
            className={`flex h-11 w-full items-center gap-3 rounded-lg px-2 text-[15px] font-semibold transition hover:bg-[#f5f7fa] ${collapsed ? "justify-center" : ""}`}
          >
            <i className="pi pi-warehouse w-5 text-center text-[#c5ab82]" aria-hidden="true" />
            {!collapsed && <><span className="flex-1 text-left">Kho hàng</span><i className={`pi ${inventoryOpen ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-[#98a2b3]`} aria-hidden="true" /></>}
          </button>
          {inventoryOpen && <div className={`${collapsed ? "mt-1" : "ml-3 border-l border-[#e6eaf0] pl-2"}`}>
            {inventoryItems.map((item) => {
              const href = `/${locale}${item.href}`;
              const active = pathname.startsWith(href);
              return <Link key={item.href} href={href} title={collapsed ? item.label : undefined} className={`flex h-10 items-center gap-3 rounded-lg px-2 text-sm transition ${collapsed ? "justify-center" : ""} ${active ? "bg-[#fff4ed] font-semibold text-[#e96725]" : "hover:bg-[#f5f7fa]"}`}>
                <i className={`pi ${item.icon} w-5 text-center text-[#c5ab82]`} aria-hidden="true" />{!collapsed && item.label}
              </Link>;
            })}
          </div>}
        </section>
      </nav>
      <div className={`flex shrink-0 items-center justify-center border-t border-[#e6eaf0] py-3 ${collapsed ? "px-2" : "px-4"}`}>
        <Link href={`/${locale}/settings`} title="Cấu hình" aria-label="Cấu hình" className={`flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-[#475467] hover:bg-[#f5f7fa] ${collapsed ? "w-10 justify-center px-0" : ""}`}>
          <i className="pi pi-cog text-base" aria-hidden="true" />
          {!collapsed && <span>Cấu hình</span>}
        </Link>
      </div>
    </aside>
  );
}

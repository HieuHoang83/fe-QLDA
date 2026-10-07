"use client";

import { useEffect, useRef, useState } from "react";
import { useShop } from "@/context/ShopContext";

export default function ShopSelector() {
  const { shops, currentShop, setCurrentShop, addShop } = useShop();
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        event.target instanceof Element &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = orgId.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("Org ID chỉ gồm chữ số.");
      return;
    }
    addShop({ orgId: trimmed, name: name.trim() || `Shop ${trimmed}` });
    setOrgId("");
    setName("");
    setError("");
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e1e5dc] bg-white px-3 text-sm font-semibold text-[#3f463b] transition hover:bg-[#f3f5ef] dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#e3e7dd] dark:hover:bg-[#30342e]"
      >
        <i className="pi pi-shop text-sm text-[#71836a]" aria-hidden="true" />
        <span className="max-w-[180px] truncate">{currentShop.name}</span>
        <i className="pi pi-chevron-down text-xs" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#e1e5dc] bg-white p-4 shadow-xl dark:border-[#40453b] dark:bg-[#20231f]">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#858a80]">
            Chọn shop
          </p>
          <div className="mb-3 space-y-1">
            {shops.map((shop) => (
              <button
                key={shop.orgId}
                type="button"
                onClick={() => {
                  setCurrentShop(shop.orgId);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                  shop.orgId === currentShop.orgId
                    ? "bg-[#e8f4e9] font-semibold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]"
                    : "hover:bg-[#f5f6f2] dark:hover:bg-[#30342e]"
                }`}
              >
                <span className="flex flex-col">
                  <span className="truncate">{shop.name}</span>
                  <span className="text-xs text-[#858a80]">
                    Org {shop.orgId}
                  </span>
                </span>
                {shop.orgId === currentShop.orgId && (
                  <i className="pi pi-check text-sm" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleAdd}
            className="border-t border-[#eef0ea] pt-3 dark:border-[#363b31]"
          >
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#858a80]">
              Thêm shop
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              placeholder="Org ID (ví dụ 200001220496)"
              className="mb-2 h-10 w-full rounded-lg border border-[#e1e5dc] bg-[#fbfcf9] px-3 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tên shop (không bắt buộc)"
              className="mb-2 h-10 w-full rounded-lg border border-[#e1e5dc] bg-[#fbfcf9] px-3 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
            {error && (
              <p className="mb-2 text-xs font-medium text-[#b33c32]">{error}</p>
            )}
            <button
              type="submit"
              className="h-10 w-full rounded-lg bg-[#527b49] text-sm font-bold text-white transition hover:bg-[#41643a]"
            >
              Lưu shop
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

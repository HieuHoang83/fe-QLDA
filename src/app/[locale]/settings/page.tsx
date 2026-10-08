"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import ShopSelector from "@/components/Shop/ShopSelector";
import { useShop } from "@/context/ShopContext";
import { getShopSettings, updateShopSettings } from "@/services/api/shop-settings";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const [shopName, setShopName] = useState(currentShop.name);
  const [autoCheckRepeatOrders, setAutoCheckRepeatOrders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session?.access_token || !currentShop.orgId) return;
    let active = true;
    setLoading(true);
    setError("");
    getShopSettings(session.access_token, currentShop.orgId)
      .then((settings) => {
        if (!active) return;
        setShopName(settings.name || currentShop.name);
        setAutoCheckRepeatOrders(settings.auto_check_repeat_orders);
      })
      .catch((requestError: Error) => {
        if (active) setError(requestError.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.access_token, currentShop.orgId, currentShop.name]);

  async function saveSettings() {
    if (!session?.access_token) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const settings = await updateShopSettings(session.access_token, currentShop.orgId, {
        name: shopName.trim(),
        auto_check_repeat_orders: autoCheckRepeatOrders,
      });
      setShopName(settings.name);
      setAutoCheckRepeatOrders(settings.auto_check_repeat_orders);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Lưu cấu hình thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <HaravanShell title="Cấu hình cửa hàng">
      <section className="max-w-3xl rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#20231f]">Thông tin cửa hàng</h2>
          <ShopSelector label="Chọn cửa hàng" />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#475467]">
            Tên shop
            <input value={shopName} onChange={(event) => { setShopName(event.target.value); setSaved(false); }} disabled={loading} className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 font-normal text-[#344054] outline-none focus:border-[#527b49] disabled:bg-[#f5f6f7]" />
          </label>
          <label className="text-sm font-semibold text-[#475467]">
            Shop ID
            <input value={currentShop.orgId} readOnly className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] bg-[#f5f6f7] px-3 font-normal text-[#667085]" />
          </label>
        </div>

        <div className="mt-7 border-t border-[#eef0f3] pt-6">
          <h2 className="text-lg font-bold text-[#20231f]">Tự động kiểm tra đơn mua lại</h2>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[#e5e7eb] p-4">
            <input type="checkbox" checked={autoCheckRepeatOrders} onChange={(event) => { setAutoCheckRepeatOrders(event.target.checked); setSaved(false); }} disabled={loading} className="mt-1 h-4 w-4 accent-[#527b49]" />
            <span><span className="block text-sm font-semibold text-[#344054]">Kiểm tra đơn từ lần mua thứ 2</span><span className="mt-1 block text-sm text-[#667085]">Bỏ qua đơn đầu tiên; áp dụng logic kiểm tra cho đơn thứ hai và các đơn tiếp theo.</span></span>
          </label>
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-[#b42318]">{error}</p>}
        {saved && <p role="status" className="mt-4 text-sm text-[#26733c]">Đã lưu cấu hình cửa hàng.</p>}
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => void saveSettings()} disabled={loading || saving || !shopName.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-not-allowed disabled:opacity-50">
            {saving && <i className="pi pi-spin pi-spinner" aria-hidden="true" />}{saving ? "Đang lưu..." : "Lưu cấu hình"}
          </button>
        </div>
      </section>
    </HaravanShell>
  );
}

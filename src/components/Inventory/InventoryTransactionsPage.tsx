"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { formatMoney } from "@/lib/haravan-format";
import { isVirtualLocation, listLocations, type HaravanLocation } from "@/services/api/locations";
import { getInventoryAdjustment, listInventoryAdjustments, type HaravanInventoryAdjustment } from "@/services/api/inventory-adjustments";

const PAGE_SIZE = 20;

export default function InventoryTransactionsPage({ title = "Chi tiết tồn kho" }: { title?: string }) {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HaravanInventoryAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<HaravanInventoryAdjustment | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listLocations(token, currentShop.orgId).then((result) => {
      if (!cancelled) setLocations((result.locations ?? []).filter((item) => !isVirtualLocation(item)));
    }).catch(() => {
      if (!cancelled) setLocations([]);
    });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listInventoryAdjustments(token, currentShop.orgId, {
      page,
      limit: PAGE_SIZE,
      ...(selectedLocation ? { location_id: Number(selectedLocation) } : {}),
    }).then((result) => {
      if (!cancelled) setItems(result.adjustments ?? result.inventory_adjustments ?? []);
    }).catch((requestError) => {
      if (!cancelled) {
        setItems([]);
        setError(requestError instanceof Error ? requestError.message : "Không tải được lịch sử tồn kho.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, page, selectedLocation]);

  async function showDetail(id: number) {
    if (!token) return;
    try {
      const result = await getInventoryAdjustment(token, currentShop.orgId, id);
      setDetail(result.adjustment ?? result.inventory_adjustment ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết điều chỉnh.");
    }
  }

  return <HaravanShell title={title}>
    <div className="mx-auto w-full max-w-[1450px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">Lịch sử điều chỉnh tồn theo kho.</p><label className="w-full max-w-xs"><span className="mb-1.5 block text-xs font-semibold text-[#66705f]">Lọc kho</span><select className="h-10 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 text-sm dark:border-[#40453b] dark:bg-[#191c18]" value={selectedLocation} onChange={(event) => { setSelectedLocation(event.target.value); setPage(1); }}><option value="">Tất cả kho</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name || `Kho #${location.id}`}</option>)}</select></label></div>
      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">{loading ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Đang tải lịch sử...</p> : error ? <p className="px-5 py-8 text-center text-sm text-[#aa382f]">{error}</p> : items.length === 0 ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Chưa có biến động tồn kho.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Mã điều chỉnh</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Kho</th><th className="px-4 py-3">Lý do</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3 text-right">Tổng giá trị</th><th className="px-4 py-3">Ghi chú</th><th /></tr></thead><tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.adjust_number || `#${item.id}`}</td><td className="px-4 py-3">{item.tran_date ? new Date(item.tran_date).toLocaleDateString("vi-VN") : "—"}</td><td className="px-4 py-3">{locations.find((location) => location.id === item.location_id)?.name || `Kho #${item.location_id ?? "—"}`}</td><td className="px-4 py-3">{item.reason || "—"}</td><td className="px-4 py-3 text-right tabular-nums">{item.total_quantity ?? 0}</td><td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.total_cost)}</td><td className="max-w-[230px] truncate px-4 py-3">{item.note || "—"}</td><td className="px-4 py-3"><button type="button" onClick={() => void showDetail(item.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#527b49] hover:bg-[#f3f5ef]">Chi tiết</button></td></tr>)}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-[#eef0ea] px-5 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={items.length < PAGE_SIZE || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
      </section>
    </div>
    {detail && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#71836a]">Chi tiết tồn kho</p><h2 className="mt-1 text-xl font-extrabold">{detail.adjust_number || `#${detail.id}`}</h2></div><button type="button" aria-label="Đóng" onClick={() => setDetail(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f1f3ee]"><i className="pi pi-times" /></button></header><div className="mt-5 grid gap-3 sm:grid-cols-2"><Detail label="Kho" value={locations.find((item) => item.id === detail.location_id)?.name || `Kho #${detail.location_id ?? "—"}`} /><Detail label="Loại" value={detail.type || "—"} /><Detail label="Lý do" value={detail.reason || "—"} /><Detail label="Ngày" value={detail.tran_date ? new Date(detail.tran_date).toLocaleString("vi-VN") : "—"} /><Detail label="Tổng số lượng" value={String(detail.total_quantity ?? 0)} /><Detail label="Tổng giá trị" value={formatMoney(detail.total_cost)} /></div>{detail.note && <p className="mt-4 rounded-xl bg-[#f8f9f6] p-3 text-sm dark:bg-[#191c18]">{detail.note}</p>}<div className="mt-5 space-y-2">{(detail.line_items ?? []).map((line, index) => <div key={line.id ?? index} className="flex items-center justify-between rounded-xl border border-[#e6e9df] px-4 py-3 text-sm dark:border-[#363b31]"><span>Sản phẩm #{line.product_id ?? "—"} · SKU {line.sku || "—"}</span><strong>{line.quantity ?? 0}</strong></div>)}</div></section></div>}
  </HaravanShell>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f8f9f6] px-3 py-2 dark:bg-[#191c18]"><span className="block text-[11px] font-semibold uppercase tracking-wide text-[#858a80]">{label}</span><span className="mt-1 block text-sm font-semibold">{value}</span></div>;
}

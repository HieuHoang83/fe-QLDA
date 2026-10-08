"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { listHaravanStockTakes, type HaravanStockTake } from "@/services/api/haravan-stock-takes";
import { getInventoryAdjustment } from "@/services/api/inventory-adjustments";
import { isVirtualLocation, listLocations, type HaravanLocation } from "@/services/api/locations";
import { formatMoney } from "@/lib/haravan-format";

const PAGE_SIZE = 20;

export default function StockTakesPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const locale = useLocale();
  const [items, setItems] = useState<HaravanStockTake[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<HaravanStockTake | null>(null);
  const [locations, setLocations] = useState<HaravanLocation[]>([]);

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    let cancelled = false;
    listLocations(token, currentShop.orgId)
      .then((result) => {
        if (!cancelled) setLocations((result.locations ?? []).filter((item) => !isVirtualLocation(item)));
      })
      .catch(() => { if (!cancelled) setLocations([]); });
    return () => { cancelled = true; };
  }, [session?.access_token, currentShop.orgId]);

  function locationName(locationId?: number | null) {
    if (locationId == null) return "—";
    return locations.find((item) => item.id === locationId)?.name || `Kho #${locationId}`;
  }

  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listHaravanStockTakes(token, currentShop.orgId, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setItems(result.stock_takes ?? []);
        setHasMore(result.hasMore);
      })
      .catch((requestError) => {
        if (cancelled) return;
        setItems([]);
        setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách phiếu kiểm kho.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [session?.access_token, currentShop.orgId, page]);

  async function openDetail(adjustmentId: number) {
    const token = session?.access_token;
    if (!token) return;
    try {
      const result = await getInventoryAdjustment(token, currentShop.orgId, adjustmentId);
      const adjustment = result.adjustment ?? result.inventory_adjustment;
      if (!adjustment) return;
      const lines = adjustment.line_items ?? [];
      setDetail({
        ...adjustment,
        _id: String(adjustment.id),
        count_number: adjustment.adjust_number || `IA${adjustment.id}`,
        createdAt: adjustment.created_at ?? undefined,
        balancedAt: adjustment.updated_at ?? undefined,
        status: "completed",
        count_status: "counted",
        balance_status: adjustment.updated_at === adjustment.created_at ? "unbalanced" : "balanced",
        mode: adjustment.tags?.includes("kiem-kho-all") ? "all" : "selected",
        location_name: locationName(adjustment.location_id),
        increased_quantity: lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity ?? 0)), 0),
        decreased_quantity: lines.reduce((sum, line) => sum + Math.min(0, Number(line.quantity ?? 0)), 0),
        difference_quantity: lines.reduce((sum, line) => sum + Math.abs(Number(line.quantity ?? 0)), 0),
        difference_value: Number(adjustment.total_cost ?? 0),
        line_items: lines.map((line, index) => ({
          ...line,
          variant_id: Number(line.product_variant_id ?? line.id ?? index),
          product_name: `Sản phẩm #${line.product_id ?? "—"}`,
          variant_title: "",
          difference: Number(line.quantity ?? 0),
        })),
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết điều chỉnh từ Haravan.");
    }
  }

  return <HaravanShell title="Kiểm kho">
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">Danh sách các phiếu kiểm kho của {currentShop.name}.</p></div><Link href={`/${locale}/inventory/stock-takes/new`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"><i className="pi pi-plus" /> Tạo phiếu kiểm kho</Link></header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="overflow-hidden rounded-2xl border border-[#e0e2e5] bg-white shadow-sm dark:border-[#363b31] dark:bg-[#20231f]">
        {loading ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Đang tải phiếu kiểm kho...</p> : items.length === 0 ? <div className="px-5 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#f0f2f5] text-xl text-[#7d8795]"><i className="pi pi-clipboard" /></span><h2 className="mt-4 font-semibold">Chưa có phiếu kiểm kho</h2><p className="mt-1 text-sm text-[#858a80]">Tạo phiếu mới, chọn kiểm tất cả sản phẩm hoặc thêm từng sản phẩm cần đếm.</p><Link href={`/${locale}/inventory/stock-takes/new`} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"><i className="pi pi-plus" /> Tạo phiếu kiểm kho</Link></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b border-[#e5e7eb] bg-[#f8f9fb] text-left text-xs text-[#596579] dark:border-[#363b31] dark:bg-[#191c18]"><tr><th className="px-4 py-4 font-medium">Mã phiếu</th><th className="px-4 py-4 font-medium">Kho kiểm</th><th className="px-4 py-4 font-medium">Trạng thái</th><th className="px-4 py-4 font-medium">Ngày kiểm</th><th className="px-4 py-4 font-medium">Ngày cân bằng</th><th className="px-4 py-4 text-right font-medium">Số lượng lệch</th><th className="px-4 py-4 text-right font-medium">Tổng giá trị hàng lệch</th></tr></thead><tbody className="divide-y divide-[#eef0f3] dark:divide-[#363b31]">{items.map((item) => <tr key={item._id} onClick={() => void openDetail(item.id)} className="cursor-pointer hover:bg-[#fafbfc] dark:hover:bg-[#252923]"><td className="whitespace-nowrap px-4 py-4 font-semibold text-blue-600">{item.count_number}</td><td className="px-4 py-4">{locationName(item.location_id)}</td><td className="px-4 py-4"><StocktakeStatus counted={item.count_status === "counted"} balanced={item.balance_status === "balanced"} /></td><td className="whitespace-nowrap px-4 py-4">{item.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : "—"}</td><td className="whitespace-nowrap px-4 py-4">{item.balancedAt ? new Date(item.balancedAt).toLocaleString("vi-VN") : "—"}</td><td className="px-4 py-4 text-right tabular-nums font-semibold">{(item.difference_quantity ?? 0).toLocaleString("vi-VN")}</td><td className="px-4 py-4 text-right tabular-nums">{formatMoney(item.difference_value ?? 0)}</td></tr>)}</tbody></table></div>}
        {!loading && items.length > 0 && <footer className="flex items-center justify-between border-t border-[#eef0f3] px-4 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">{items.length.toLocaleString("vi-VN")} phiếu trên trang · Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-[#dfe4d9] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={!hasMore} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-[#dfe4d9] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></footer>}
      </section>
      <p className="rounded-xl bg-[#f4f6f0] px-4 py-3 text-xs leading-5 text-[#66705f] dark:bg-[#20271d] dark:text-[#bdc7b5]">Danh sách lấy trực tiếp từ lịch sử điều chỉnh tồn Haravan, lọc theo nhãn kiểm kho. Haravan không có API phiếu kiểm kho riêng nên chỉ các phiếu có chênh lệch mới xuất hiện.</p>
    </div>
    {detail && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" aria-labelledby="stocktake-detail-title" className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#20231f]"><header className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[#8a94a3]">Điều chỉnh tồn từ kiểm kho</p><h2 id="stocktake-detail-title" className="mt-1 text-xl font-bold">{detail.count_number}</h2><p className="mt-1 text-sm text-[#73796f]">{locationName(detail.location_id)} · {detail.created_at ? new Date(detail.created_at).toLocaleString("vi-VN") : "—"}</p><p className="mt-1 text-xs text-[#8791a0]">{detail.note}</p></div><button type="button" aria-label="Đóng" onClick={() => setDetail(null)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f0f2f5]"><i className="pi pi-times" /></button></header><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-[#f8f9fb] text-left text-xs text-[#596579]"><tr><th className="px-3 py-3">Sản phẩm / SKU</th><th className="px-3 py-3 text-right">Số lượng điều chỉnh</th></tr></thead><tbody className="divide-y divide-[#eef0f3]">{detail.line_items?.map((line) => <tr key={line.variant_id}><td className="px-3 py-3"><strong className="block">{line.product_name}</strong><span className="text-xs text-[#8791a0]">SKU: {line.sku || "—"}</span></td><td className={`px-3 py-3 text-right font-medium tabular-nums ${line.quantity && line.quantity > 0 ? "text-emerald-700" : "text-red-600"}`}>{line.quantity && line.quantity > 0 ? `+${line.quantity}` : line.quantity ?? 0}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end"><button type="button" onClick={() => setDetail(null)} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">Đóng</button></div></section></div>}
  </HaravanShell>;
}

function StocktakeStatus({ counted, balanced }: { counted: boolean; balanced: boolean }) {
  const label = balanced ? "Đã cân bằng" : counted ? "Đã kiểm kho" : "Chưa kiểm kho";
  const styles = balanced
    ? "bg-blue-50 text-blue-700"
    : counted
      ? "bg-emerald-50 text-emerald-700"
      : "bg-[#f0f2f5] text-[#6b7280] dark:bg-[#2a2e27] dark:text-[#a9b0a2]";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{label}</span>;
}


"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatMoney } from "@/lib/haravan-format";
import {
  getPurchaseOrder,
  getPurchaseReturn,
  listPurchaseOrders,
  listPurchaseReturns,
  purchaseOrderNumber,
  purchaseOrderStatus,
  purchaseOrderStatusLabel,
  purchaseOrderSupplierName,
  purchaseOrderTotals,
  type PurchaseOrderDocument,
  type PurchaseOrderLineGroup,
  type PurchaseOrderStatus,
  type PurchaseReturnDocument,
} from "@/services/api/inventory-documents";

type DocumentKind = "purchase-orders" | "purchase-returns";
type InventoryDoc = PurchaseOrderDocument | PurchaseReturnDocument;

const PAGE_SIZE = 20;

export default function InventoryDocumentsPage({ kind }: { kind: DocumentKind }) {
  const locale = useLocale();
  const title = kind === "purchase-orders" ? "Đặt hàng nhập" : "Trả hàng nhập";
  const description = kind === "purchase-orders"
    ? "Danh sách đơn đặt hàng nhập từ Haravan. API tài liệu hiện chỉ hỗ trợ xem."
    : "Danh sách phiếu trả hàng cho nhà cung cấp. API tài liệu hiện chỉ hỗ trợ xem.";
  const router = useRouter();
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<InventoryDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<InventoryDoc | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    const request = kind === "purchase-orders"
      ? listPurchaseOrders(token, currentShop.orgId, page, PAGE_SIZE).then((result) => result.purchase_orders ?? [])
      : listPurchaseReturns(token, currentShop.orgId, page, PAGE_SIZE).then((result) => result.purchase_returns ?? []);
    request.then((rows) => {
      if (!cancelled) setItems(rows);
    }).catch((requestError) => {
      if (!cancelled) {
        setItems([]);
        setError(requestError instanceof Error ? requestError.message : "Không tải được dữ liệu tồn kho.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, kind, page]);

  async function openDetail(item: InventoryDoc) {
    if (!token) return;
    setDetailLoading(true);
    try {
      if (kind === "purchase-orders") {
        const result = await getPurchaseOrder(token, currentShop.orgId, item.id);
        setDetail(result.purchase_order);
      } else {
        const result = await getPurchaseReturn(token, currentShop.orgId, item.id);
        setDetail(result.purchase_return);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  }

  return <HaravanShell title={title}>
    <div className="mx-auto w-full max-w-[1450px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">{description}</p><span className="rounded-full bg-[#f3f5ef] px-3 py-1.5 text-xs font-semibold text-[#64705d] dark:bg-[#30392c] dark:text-[#c4dfa9]">Shop: {currentShop.name}</span></div>
      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        {loading ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Đang tải...</p> : error ? <p className="px-5 py-8 text-center text-sm text-[#aa382f]">{error}</p> : items.length === 0 ? <div className="px-5 py-16 text-center"><i className="pi pi-inbox text-3xl text-[#a1a89a]" /><p className="mt-3 font-semibold">Chưa có dữ liệu</p><p className="mt-1 text-sm text-[#858a80]">Haravan chưa trả về phiếu nào ở trang này.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase tracking-wide text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Mã phiếu</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Kho</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3 text-right">Tổng tiền</th><th /></tr></thead><tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{items.map((item) => <tr key={item.id} onClick={() => kind === "purchase-orders" && router.push(`/${locale}/inventory/purchasing-orders/${item.id}`)} className={kind === "purchase-orders" ? "cursor-pointer hover:bg-[#fafbfc] dark:hover:bg-[#252923]" : ""}><td className="px-4 py-3 font-bold">{documentNumber(item, kind)}</td><td className="px-4 py-3">{dateLabel(item, kind)}</td><td className="px-4 py-3">{kind === "purchase-orders" ? purchaseOrderSupplierName(item) || "—" : partyName(item.supplier) || "—"}</td><td className="px-4 py-3">{item.location?.name || "—"}</td><td className="px-4 py-3">{kind === "purchase-orders" ? <StatusBadge status={purchaseOrderStatus(item)} /> : item.status || "—"}</td><td className="px-4 py-3 text-right tabular-nums">{kind === "purchase-orders" ? orderTotals(item).totalQuantity.toLocaleString("vi-VN") : item.total ?? 0}</td><td className="px-4 py-3 text-right tabular-nums">{kind === "purchase-orders" ? formatMoney(orderTotals(item).totalCost) : "total_cost" in item ? formatMoney(item.total_cost) : "—"}</td><td className="px-4 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); if (kind === "purchase-orders") router.push(`/${locale}/inventory/purchasing-orders/${item.id}`); else void openDetail(item); }} className="rounded-lg px-3 py-2 text-xs font-bold text-[#527b49] hover:bg-[#f3f5ef]">Chi tiết</button></td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between border-t border-[#eef0ea] px-5 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={items.length < PAGE_SIZE || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
      </section>
    </div>
    {detail && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#71836a]">Chi tiết {kind === "purchase-orders" ? "đơn đặt hàng" : "trả hàng nhập"}</p><h2 className="mt-1 text-xl font-extrabold">{documentNumber(detail, kind)}</h2></div><button type="button" onClick={() => setDetail(null)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f1f3ee]"><i className="pi pi-times" /></button></header>{detailLoading ? <p className="py-10 text-center text-sm text-[#858a80]">Đang tải...</p> : <><div className="mt-5 grid gap-3 sm:grid-cols-2"><DetailValue label="Trạng thái" value={detail.status || "—"} /><DetailValue label="Nhà cung cấp" value={partyName(detail.supplier) || "—"} /><DetailValue label="Kho" value={detail.location?.name || "—"} /><DetailValue label="Ngày" value={dateLabel(detail, kind)} /><DetailValue label="Tham chiếu" value={detail.ref_number || "—"} /><DetailValue label="Tổng số lượng" value={String(detail.total ?? 0)} /></div>{detail.notes && <p className="mt-4 rounded-xl bg-[#f8f9f6] p-3 text-sm dark:bg-[#191c18]">{detail.notes}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-[#858a80]"><th className="py-2">Sản phẩm</th><th className="py-2">SKU</th><th className="py-2 text-right">Số lượng</th><th className="py-2 text-right">Giá vốn</th></tr></thead><tbody>{documentLines(detail).map((line, index) => <tr key={line.id ?? index} className="border-b border-[#eef0ea] dark:border-[#363b31]"><td className="py-3">{line.product_id ? `Sản phẩm #${line.product_id}` : "Sản phẩm"}</td><td className="py-3">{line.sku || "—"}</td><td className="py-3 text-right">{line.quantity}</td><td className="py-3 text-right">{"cost_amount" in line ? formatMoney(line.cost_amount) : "—"}</td></tr>)}</tbody></table></div></>}</section></div>}
  </HaravanShell>;
}

function partyName(value: PurchaseOrderDocument["supplier"] | PurchaseReturnDocument["supplier"]): string | undefined {
  return typeof value === "string" ? value : value?.name ?? undefined;
}

function orderTotals(item: PurchaseOrderDocument) {
  return purchaseOrderTotals(item);
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const styles: Record<PurchaseOrderStatus, string> = {
    received: "bg-emerald-50 text-emerald-700",
    partial: "bg-amber-50 text-amber-700",
    pending: "bg-blue-50 text-blue-700",
    closed: "bg-[#f0f2f5] text-[#6b7280] dark:bg-[#2a2e27] dark:text-[#a9b0a2]",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{purchaseOrderStatusLabel[status]}</span>;
}

function documentNumber(item: InventoryDoc, kind: DocumentKind): string {
  if (kind === "purchase-returns" && "return_number" in item) return item.return_number || `#${item.id}`;
  return purchaseOrderNumber(item);
}

function dateLabel(item: InventoryDoc, kind: DocumentKind): string {
  const date = kind === "purchase-returns" && "returned_at" in item
    ? item.returned_at
    : "tran_date" in item ? item.tran_date : item.created_at;
  return date ? new Date(date).toLocaleDateString("vi-VN") : "—";
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#f8f9f6] px-3 py-2 dark:bg-[#191c18]"><span className="block text-[11px] font-semibold uppercase tracking-wide text-[#858a80]">{label}</span><span className="mt-1 block text-sm font-semibold">{value}</span></div>;
}

function documentLines(item: InventoryDoc) {
  const lines = item.line_items ?? ("line_item" in item ? item.line_item : undefined);
  if (!lines) return [];
  const all = Array.isArray(lines) ? lines : [lines];
  return all.filter((line): line is Exclude<typeof line, PurchaseOrderLineGroup> => !("received_items" in line) && !("not_received_items" in line));
}

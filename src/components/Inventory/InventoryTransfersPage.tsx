"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import { variantLabel } from "@/lib/haravan-format";
import {
  isVirtualLocation,
  isUnavailableLocation,
  listLocations,
  type HaravanLocation,
} from "@/services/api/locations";
import {
  createInventoryTransfer,
  getInventoryTransfer,
  listInventoryTransfers,
  receiveInventoryTransfer,
  type InventoryTransferDocument,
} from "@/services/api/inventory-documents";
import { listProducts, type HaravanProduct } from "@/services/api/products";

interface TransferLine {
  key: string;
  product: HaravanProduct;
  variantId: number;
  variantLabel: string;
  sku?: string | null;
  quantity: number;
}

const PAGE_SIZE = 20;
const INPUT = "h-10 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

export default function InventoryTransfersPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<HaravanProduct | null>(null);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<TransferLine[]>([]);
  const [note, setNote] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [transfers, setTransfers] = useState<InventoryTransferDocument[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [detail, setDetail] = useState<InventoryTransferDocument | null>(null);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [receivedIds, setReceivedIds] = useState<Set<number>>(() => new Set());

  const source = locations.find((location) => String(location.id) === fromLocation);
  const destination = locations.find((location) => String(location.id) === toLocation);
  const selectedVariant = selectedProduct?.variants?.find((variant) => String(variant.id) === variantId);
  const canCreate = Boolean(token && source && destination && source.id !== destination.id && lines.length > 0 && !saving);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listLocations(token, currentShop.orgId).then((result) => {
      if (cancelled) return;
      const list = (result.locations ?? []).filter((location) => !isVirtualLocation(location) && !isUnavailableLocation(location));
      setLocations(list);
      const primary = list.find((location) => location.is_primary);
      if (primary) setFromLocation(String(primary.id));
    }).catch(() => {
      if (!cancelled) setLocations([]);
    });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  useEffect(() => {
    const query = productSearch.trim();
    if (!token || !query) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      listProducts(token, currentShop.orgId, { sku: query, limit: 20 }).then((result) => {
        if (!cancelled) setProducts(result.products ?? []);
      }).catch(() => {
        if (!cancelled) setProducts([]);
      }).finally(() => {
        if (!cancelled) setSearching(false);
      });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [productSearch, token, currentShop.orgId]);

  const loadTransfers = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    setListError("");
    try {
      const result = await listInventoryTransfers(token, currentShop.orgId, { page, limit: PAGE_SIZE });
      setTransfers(result.transfers ?? []);
    } catch (requestError) {
      setTransfers([]);
      setListError(requestError instanceof Error ? requestError.message : "Không tải được điều chuyển.");
    } finally {
      setListLoading(false);
    }
  }, [token, currentShop.orgId, page]);

  useEffect(() => { void loadTransfers(); }, [loadTransfers, refreshVersion]);

  function addLine() {
    if (!selectedProduct?.id || !selectedVariant?.id) return;
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error("Số lượng điều chuyển phải là số nguyên lớn hơn 0.");
      return;
    }
    const key = `${selectedProduct.id}-${selectedVariant.id}`;
    setLines((current) => {
      const found = current.find((line) => line.key === key);
      if (found) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + quantity } : line);
      return [...current, {
        key,
        product: selectedProduct,
        variantId: selectedVariant.id!,
        variantLabel: variantLabel(selectedVariant),
        sku: selectedVariant.sku,
        quantity,
      }];
    });
    setSelectedProduct(null);
    setVariantId("");
    setProductSearch("");
    setQuantity(1);
  }

  async function createTransfer() {
    if (!token || !source || !destination) return;
    if (source.id === destination.id) {
      toast.error("Kho đi và kho nhận phải khác nhau.");
      return;
    }
    if (lines.length === 0 || lines.length > 100) {
      toast.error("Phiếu cần có từ 1 đến 100 dòng sản phẩm.");
      return;
    }
    setSaving(true);
    try {
      await createInventoryTransfer(token, currentShop.orgId, {
        from_loc_id: source.id,
        to_loc_id: destination.id,
        reason: "newproduct",
        note: note.trim() || undefined,
        line_items: lines.map((line) => ({
          product_id: line.product.id!,
          product_variant_id: line.variantId,
          quantity: line.quantity,
          sku: line.sku || undefined,
        })),
      });
      toast.success("Đã tạo phiếu điều chuyển.");
      setLines([]);
      setNote("");
      setRefreshVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Không tạo được phiếu điều chuyển.");
    } finally {
      setSaving(false);
    }
  }

  async function receiveTransfer(item: InventoryTransferDocument) {
    if (!token) return;
    setReceivingId(item.id);
    try {
      await receiveInventoryTransfer(token, currentShop.orgId, item.id);
      toast.success(`Đã xác nhận nhận hàng ${item.transfer_number || `#${item.id}`}.`);
      setReceivedIds((current) => new Set(current).add(item.id));
      setRefreshVersion((value) => value + 1);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Không xác nhận được nhận hàng.");
    } finally {
      setReceivingId(null);
    }
  }

  async function showDetail(id: number) {
    if (!token) return;
    try {
      const result = await getInventoryTransfer(token, currentShop.orgId, id);
      setDetail(result.transfer);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Không tải được chi tiết điều chuyển.");
    }
  }

  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines]);

  return <HaravanShell title="Điều chuyển">
    <div className="mx-auto w-full max-w-[1450px] space-y-5">
      <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="mb-4"><h2 className="font-bold">Tạo phiếu điều chuyển</h2><p className="mt-1 text-sm text-[#858a80]">Chuyển số lượng hàng từ kho đi sang kho nhận.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label><span className="mb-1.5 block text-xs font-semibold">Kho đi</span><select className={INPUT} value={fromLocation} onChange={(event) => setFromLocation(event.target.value)}><option value="">Chọn kho đi</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name || `Kho #${location.id}`}</option>)}</select></label>
          <label><span className="mb-1.5 block text-xs font-semibold">Kho nhận</span><select className={INPUT} value={toLocation} onChange={(event) => setToLocation(event.target.value)}><option value="">Chọn kho nhận</option>{locations.map((location) => <option key={location.id} value={location.id} disabled={String(location.id) === fromLocation}>{location.name || `Kho #${location.id}`}</option>)}</select></label>
        </div>
        {source && destination && <p className="mt-3 rounded-xl bg-[#f8f9f6] px-4 py-3 text-sm dark:bg-[#191c18]">{source.name} <i className="pi pi-arrow-right mx-2 text-xs text-[#71836a]" /> {destination.name}</p>}

        <div className="mt-5 rounded-xl border border-[#eef0ea] p-4 dark:border-[#363b31]">
          <label className="block"><span className="mb-1.5 block text-xs font-semibold">Quét SKU để thêm hàng</span><input className={INPUT} value={productSearch} onChange={(event) => { setProductSearch(event.target.value); setSelectedProduct(null); }} placeholder="Nhập hoặc quét SKU..." /></label>
          {productSearch && (searching || products.length > 0) && <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-[#e1e5dc] p-2 dark:border-[#40453b]">{searching && <p className="px-3 py-2 text-sm text-[#858a80]">Đang tìm...</p>}{products.map((product) => <button type="button" key={product.id} onClick={() => { setSelectedProduct(product); setVariantId(String(product.variants?.[0]?.id ?? "")); setProductSearch(product.title ?? "Sản phẩm"); }} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[#f3f5ef] dark:hover:bg-[#30342e]"><span className="block font-semibold">{product.title}</span><span className="text-xs text-[#858a80]">{product.variants?.length ?? 0} biến thể</span></button>)}</div>}
          {selectedProduct && <div className="mt-3 flex flex-wrap gap-2"><select className={`${INPUT} min-w-[220px] flex-1`} value={variantId} onChange={(event) => setVariantId(event.target.value)}>{(selectedProduct.variants ?? []).map((variant) => <option key={variant.id} value={variant.id}>{variantLabel(variant)} · {variant.sku || "Không SKU"}</option>)}</select><input className={`${INPUT} w-28`} type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 0)} /><button type="button" disabled={!selectedVariant} onClick={addLine} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white disabled:opacity-50"><i className="pi pi-plus" /> Thêm</button></div>}
        </div>

        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-[#858a80]"><th className="py-2">Sản phẩm</th><th className="py-2">SKU</th><th className="py-2 text-right">Số lượng</th><th /></tr></thead><tbody>{lines.map((line) => <tr key={line.key} className="border-b border-[#eef0ea] dark:border-[#363b31]"><td className="py-3">{line.product.title} · {line.variantLabel}</td><td className="py-3">{line.sku || "—"}</td><td className="py-3 text-right"><input className="h-9 w-24 rounded-lg border border-[#e1e5dc] bg-white px-2 text-right dark:border-[#40453b] dark:bg-[#191c18]" type="number" min="1" step="1" value={line.quantity} onChange={(event) => setLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Number(event.target.value) || 0 } : item))} /></td><td className="py-3 text-right"><button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} aria-label="Xóa dòng" className="grid h-9 w-9 place-items-center rounded-lg text-[#aa382f] hover:bg-[#fff0ee]"><i className="pi pi-trash" /></button></td></tr>)}</tbody></table>{lines.length === 0 && <p className="py-8 text-center text-sm text-[#858a80]">Chưa có sản phẩm trong phiếu.</p>}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><label><span className="mb-1.5 block text-xs font-semibold">Ghi chú</span><input className={INPUT} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú điều chuyển" /></label><div className="flex items-center gap-4"><span className="text-sm text-[#66705f]">Tổng SL: <strong>{totalQuantity}</strong></span><button type="button" disabled={!canCreate} onClick={() => void createTransfer()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? <i className="pi pi-spin pi-spinner" /> : <i className="pi pi-check" />} Tạo phiếu</button></div></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="border-b border-[#eef0ea] px-5 py-4 dark:border-[#363b31]"><h2 className="font-bold">Lịch sử điều chuyển</h2><p className="mt-1 text-xs text-[#858a80]">Xem phiếu và xác nhận hàng đã đến kho nhận.</p></div>
        {listLoading ? <p className="px-5 py-12 text-center text-sm text-[#858a80]">Đang tải...</p> : listError ? <p className="px-5 py-8 text-center text-sm text-[#aa382f]">{listError}</p> : transfers.length === 0 ? <p className="px-5 py-12 text-center text-sm text-[#858a80]">Chưa có phiếu điều chuyển.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Mã phiếu</th><th className="px-4 py-3">Ngày</th><th className="px-4 py-3">Kho đi</th><th className="px-4 py-3">Kho nhận</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3">Trạng thái</th><th /></tr></thead><tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{transfers.map((item) => { const received = receivedIds.has(item.id) || isReceived(item); return <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.transfer_number || `#${item.id}`}</td><td className="px-4 py-3">{item.tran_date ? new Date(item.tran_date).toLocaleDateString("vi-VN") : "—"}</td><td className="px-4 py-3">{locations.find((location) => location.id === item.from_loc_id)?.name || `Kho #${item.from_loc_id ?? "—"}`}</td><td className="px-4 py-3">{locations.find((location) => location.id === item.to_loc_id)?.name || `Kho #${item.to_loc_id ?? "—"}`}</td><td className="px-4 py-3 text-right tabular-nums">{item.total ?? transferLineQuantity(item)}</td><td className="px-4 py-3">{item.status || (received ? "Đã nhận" : "Đang vận chuyển")}</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => void showDetail(item.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#527b49] hover:bg-[#f3f5ef]">Chi tiết</button>{!received && <button type="button" disabled={receivingId === item.id} onClick={() => void receiveTransfer(item)} className="rounded-lg bg-[#527b49] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{receivingId === item.id ? "Đang nhận..." : "Xác nhận nhận"}</button>}</div></td></tr>; })}</tbody></table></div>}
        <div className="flex items-center justify-between border-t border-[#eef0ea] px-5 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || listLoading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={transfers.length < PAGE_SIZE || listLoading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
      </section>
    </div>
    {detail && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#71836a]">Chi tiết điều chuyển</p><h2 className="mt-1 text-xl font-extrabold">{detail.transfer_number || `#${detail.id}`}</h2></div><button type="button" aria-label="Đóng" onClick={() => setDetail(null)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-[#f1f3ee]"><i className="pi pi-times" /></button></header><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#f8f9f6] p-3 dark:bg-[#191c18]"><span className="text-xs text-[#858a80]">Kho đi</span><p className="mt-1 font-semibold">{locations.find((item) => item.id === detail.from_loc_id)?.name || `Kho #${detail.from_loc_id}`}</p></div><div className="rounded-xl bg-[#f8f9f6] p-3 dark:bg-[#191c18]"><span className="text-xs text-[#858a80]">Kho nhận</span><p className="mt-1 font-semibold">{locations.find((item) => item.id === detail.to_loc_id)?.name || `Kho #${detail.to_loc_id}`}</p></div></div>{detail.note && <p className="mt-4 rounded-xl bg-[#f8f9f6] p-3 text-sm dark:bg-[#191c18]">{detail.note}</p>}<div className="mt-4 space-y-2">{transferLines(detail).map((line, index) => <div key={line.id ?? index} className="flex items-center justify-between rounded-xl border border-[#e6e9df] px-4 py-3 text-sm dark:border-[#363b31]"><span>Sản phẩm #{line.product_id} · SKU {line.sku || "—"}</span><strong>{line.quantity}</strong></div>)}</div></section></div>}
  </HaravanShell>;
}

function isReceived(item: InventoryTransferDocument): boolean {
  const status = item.status?.toLowerCase() ?? "";
  return Boolean(item.received_at) || status.includes("receive") || status.includes("nhận") || status.includes("nhập hàng") || status.includes("complete") || status.includes("hoàn thành");
}

function transferLines(item: InventoryTransferDocument) {
  const lines = item.line_items;
  if (!lines) return [];
  return Array.isArray(lines) ? lines : [lines];
}

function transferLineQuantity(item: InventoryTransferDocument) {
  return transferLines(item).reduce((sum, line) => sum + (line.quantity || 0), 0);
}

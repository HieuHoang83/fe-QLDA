"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import {
  adjustInventory,
  isVirtualLocation,
  listInventoryLocations,
  listLocations,
  type HaravanInventoryLocation,
  type HaravanLocation,
} from "@/services/api/locations";
import { listProducts, type HaravanProduct, type HaravanProductVariant } from "@/services/api/products";
import { listInventoryAdjustments } from "@/services/api/inventory-adjustments";

type CountedVariant = HaravanProductVariant & { id: number };
type CountRow = { product: HaravanProduct; variant: CountedVariant; onHand: number };
type StockFilter = "all" | "matched" | "different" | "uncounted";
const PAGE_SIZE = 250;
const VARIANT_BATCH_SIZE = 50;
const inputClass = "h-10 w-32 rounded-lg border border-[#d1d7e0] bg-white px-3 text-sm tabular-nums outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 dark:border-[#40453b] dark:bg-[#191c18]";

export default function StockTakesPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const router = useRouter();
  const locale = useLocale();
  const token = session?.access_token;
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [inventory, setInventory] = useState<HaravanInventoryLocation[]>([]);
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [selectedVariantIds, setSelectedVariantIds] = useState<number[]>([]);
  const [mode, setMode] = useState<"all" | "selected">("selected");
  const [addOneOpen, setAddOneOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [scanMode, setScanMode] = useState(true);
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadingBase(true);
    setError("");
    Promise.all([
      listLocations(token, currentShop.orgId),
      (async () => {
        const all: HaravanProduct[] = [];
        for (let page = 1; ; page += 1) {
          const result = await listProducts(token, currentShop.orgId, { limit: PAGE_SIZE, page });
          const batch = result.products ?? [];
          all.push(...batch);
          if (batch.length < PAGE_SIZE) break;
        }
        return { products: all };
      })(),
    ]).then(([locationResult, productResult]) => {
      if (cancelled) return;
      const physical = (locationResult.locations ?? []).filter((location) => !isVirtualLocation(location));
      setLocations(physical);
      setProducts(productResult.products ?? []);
      setSelectedLocation((current) => current && physical.some((item) => String(item.id) === current)
        ? current
        : String(physical.find((item) => item.is_primary)?.id ?? physical[0]?.id ?? ""));
    }).catch((requestError) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Không tải được kho và sản phẩm.");
    }).finally(() => { if (!cancelled) setLoadingBase(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  const productVariants = useMemo(() => products.flatMap((product) => (product.variants ?? [])
    .filter((variant): variant is HaravanProductVariant & { id: number } => typeof variant.id === "number")
    .map((variant) => ({ product, variant }))), [products]);

  const loadInventory = useCallback(async () => {
    if (!token || !selectedLocation) return;
    setLoadingInventory(true);
    setError("");
    try {
      const levels: HaravanInventoryLocation[] = [];
      for (let offset = 0; offset < productVariants.length; offset += VARIANT_BATCH_SIZE) {
        const ids = productVariants.slice(offset, offset + VARIANT_BATCH_SIZE)
          .map(({ variant }) => variant.id).join(",");
        if (!ids) continue;
        const result = await listInventoryLocations(token, currentShop.orgId, {
          location_ids: selectedLocation,
          variant_ids: ids,
        });
        levels.push(...(result.inventory_locations ?? []));
      }
      setInventory(levels);
      // Blank values mean not counted yet. Preserve edits when refreshing the baseline.
    } catch (requestError) {
      setInventory([]);
      setError(requestError instanceof Error ? requestError.message : "Không tải được số tồn theo kho.");
    } finally {
      setLoadingInventory(false);
    }
  }, [token, currentShop.orgId, selectedLocation, productVariants]);

  useEffect(() => { void loadInventory(); }, [loadInventory]);

  const rows = useMemo<CountRow[]>(() => productVariants.filter((item): item is { product: HaravanProduct; variant: CountedVariant } => typeof item.variant.id === "number" && selectedVariantIds.includes(item.variant.id)).map(({ product, variant }) => {
    const level = inventory.find((item) => Number(item.variant_id) === variant.id && Number(item.loc_id) === Number(selectedLocation));
    return {
      product,
      variant,
      onHand: Number(level?.qty_onhand ?? 0) || 0,
    };
  }), [productVariants, inventory, selectedLocation, selectedVariantIds]);

  const countedRows = useMemo(() => rows.filter(({ variant }) => {
    const value = counts[variant.id] ?? "";
    if (!/^-?\d+$/.test(value)) return false;
    return Number.isSafeInteger(Number(value));
  }), [rows, counts]);

  const changedRows = useMemo(() => countedRows.filter(({ variant, onHand }) => {
    const value = counts[variant.id] ?? "";
    const actual = Number(value);
    return actual !== onHand;
  }), [countedRows, counts]);

  const rowStatus = ({ variant, onHand }: CountRow): StockFilter => {
    const value = counts[variant.id] ?? "";
    if (!/^-?\d+$/.test(value)) return "uncounted";
    return Number(value) === onHand ? "matched" : "different";
  };

  const countsByStatus = useMemo(() => rows.reduce((total, row) => {
    const status = rowStatus(row);
    total[status] += 1;
    return total;
  }, { all: rows.length, matched: 0, different: 0, uncounted: 0 }), [rows, counts]);

  const visibleRows = useMemo(() => rows.filter((row) => {
    const { product, variant } = row;
    const needle = query.trim().toLocaleLowerCase("vi");
    const matches = !needle || [product.title, variant.title, variant.sku, variant.barcode]
      .some((value) => value?.toLocaleLowerCase("vi").includes(needle));
    return matches && (filter === "all" || rowStatus(row) === filter);
  }), [rows, query, filter, counts]);

  const summaries = useMemo(() => changedRows.reduce((total, row) => {
    const delta = Number(counts[row.variant.id]) - row.onHand;
    const cost = Number((row.variant as HaravanProductVariant & { cost?: number; cost_amount?: number }).cost_amount
      ?? (row.variant as HaravanProductVariant & { cost?: number }).cost ?? 0);
    return {
      lines: total.lines + 1,
      increases: total.increases + Math.max(delta, 0),
      decreases: total.decreases + Math.min(delta, 0),
      increaseValue: total.increaseValue + Math.max(delta, 0) * cost,
      decreaseValue: total.decreaseValue + Math.abs(Math.min(delta, 0)) * cost,
    };
  }, { lines: 0, increases: 0, decreases: 0, increaseValue: 0, decreaseValue: 0 }), [changedRows, counts]);

  async function submitCount() {
    if (!token || !selectedLocation || !countedRows.length) return;
    if (!changedRows.length) {
      toast.info("Không có chênh lệch để ghi. Haravan chỉ tạo lịch sử khi có điều chỉnh tồn.");
      setConfirmOpen(false);
      return;
    }
    if (countedRows.some(({ variant }) => !/^-?\d+$/.test(counts[variant.id] ?? ""))) {
      toast.error("Số đếm thực tế phải là số nguyên.");
      return;
    }
    setSaving(true);
    try {
      const currentLevels: HaravanInventoryLocation[] = [];
      for (let offset = 0; offset < changedRows.length; offset += VARIANT_BATCH_SIZE) {
        const ids = changedRows.slice(offset, offset + VARIANT_BATCH_SIZE).map(({ variant }) => variant.id).join(",");
        const result = await listInventoryLocations(token, currentShop.orgId, { location_ids: selectedLocation, variant_ids: ids });
        currentLevels.push(...(result.inventory_locations ?? []));
      }
      const stale = changedRows.filter(({ variant, onHand }) => {
        const current = currentLevels.find((item) => Number(item.variant_id) === variant.id && Number(item.loc_id) === Number(selectedLocation));
        return Number(current?.qty_onhand ?? 0) !== onHand;
      });
      if (stale.length) {
        toast.error(`Tồn kho đã thay đổi ở ${stale.length} biến thể. Tải lại số tồn rồi kiểm lại trước khi xác nhận.`);
        await loadInventory();
        setConfirmOpen(false);
        return;
      }

      setConfirmOpen(false);
      const increases = changedRows.filter(({ variant, onHand }) => Number(counts[variant.id]) > onHand);
      const decreases = changedRows.filter(({ variant, onHand }) => Number(counts[variant.id]) < onHand);
      const noteBase = `Kiểm kho ${new Date().toLocaleDateString("vi-VN")}`;
      for (const [group, reason, direction] of [
        [decreases, "shrinkage", "giảm tồn"],
        [increases, "newproduct", "tăng tồn"],
      ] as const) {
        for (let offset = 0; offset < group.length; offset += 100) {
          const batch = group.slice(offset, offset + 100);
          await adjustInventory(token, currentShop.orgId, {
            location_id: Number(selectedLocation),
            type: "adjust",
            reason,
            note: `${noteBase} — ${direction}`,
            tags: mode === "all" ? "kiem-kho,kiem-kho-all" : "kiem-kho,kiem-kho-selected",
            tran_date: new Date().toISOString(),
            line_items: batch.map(({ product, variant, onHand }) => ({
              product_id: Number(product.id),
              product_variant_id: Number(variant.id),
              quantity: Number(counts[variant.id]) - onHand,
              sku: variant.sku || undefined,
              barcode: variant.barcode || undefined,
            })),
          });
        }
      }
      setConfirmOpen(false);
      toast.success(`Đã ghi nhận chênh lệch của ${changedRows.length} biến thể lên Haravan.`);
      router.push(`/${locale}/inventory/stock-takes`);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Không lưu được phiếu kiểm kho.");
    } finally { setSaving(false); }
  }

  function addEveryVariant() {
    setMode("all");
    setSelectedVariantIds(productVariants.map(({ variant }) => variant.id));
    setFilter("all");
  }

  function addVariant(variantId: number) {
    setSelectedVariantIds((current) => current.includes(variantId) ? current : [...current, variantId]);
    setMode((current) => current === "all" ? "all" : "selected");
    setFilter("all");
    setAddOneOpen(false);
    setVariantSearch("");
  }

  function removeVariant(variantId: number) {
    setSelectedVariantIds((current) => current.filter((id) => id !== variantId));
    setCounts((current) => {
      const next = { ...current };
      delete next[variantId];
      return next;
    });
  }

  function applyScanOrSearch() {
    if (scanMode && query.trim()) {
      const value = query.trim().toLocaleLowerCase("vi");
      const match = productVariants.find(({ variant }) =>
        variant.sku?.trim().toLocaleLowerCase("vi") === value || variant.barcode?.trim().toLocaleLowerCase("vi") === value,
      );
      if (match) {
        addVariant(match.variant.id!);
        setQuery("");
        return;
      }
    }
    setFilter("all");
  }

  const matchingVariants = productVariants.filter(({ product, variant }) => {
    const needle = variantSearch.trim().toLocaleLowerCase("vi");
    return !needle || [product.title, variant.title, variant.sku, variant.barcode]
      .some((value) => value?.toLocaleLowerCase("vi").includes(needle));
  }).slice(0, 30);

  const selectedWarehouse = locations.find((location) => String(location.id) === selectedLocation);
  const busy = loadingBase || loadingInventory;

  return <HaravanShell title="Tạo phiếu kiểm kho">
    <div className="mx-auto w-full max-w-[1700px] space-y-4">
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {selectedWarehouse?.is_unavailable_quantity && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Kho này được Haravan đánh dấu là không khả dụng để bán. Bạn vẫn có thể kiểm đếm tồn thực tế tại kho.</p>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_372px]">
        <section className="overflow-hidden rounded-2xl border border-[#e0e2e5] bg-white shadow-sm dark:border-[#363b31] dark:bg-[#20231f]">
          <div className="px-4 pt-5 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Sản phẩm</h2><div className="flex gap-2"><button type="button" disabled={busy || !productVariants.length} onClick={addEveryVariant} className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-600 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"><i className="pi pi-list-check" /> Kiểm tất cả</button><button type="button" disabled={busy || !productVariants.length} onClick={() => setAddOneOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><i className="pi pi-plus" /> Thêm đơn lẻ</button></div></div>
            <div className="mt-3 flex gap-7 overflow-x-auto border-b border-[#e9ebef] dark:border-[#363b31]">{([
              ["all", "Tất cả"], ["matched", "Khớp"], ["different", "Lệch"], ["uncounted", "Chưa kiểm"],
            ] as [StockFilter, string][]).map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`relative shrink-0 py-2.5 text-sm ${filter === key ? "font-semibold text-blue-600" : "text-[#536071] hover:text-blue-600"}`}>{label}<span className="ml-1 text-xs text-[#8b95a3]">{countsByStatus[key]}</span>{filter === key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-600" />}</button>)}</div>
          </div>
          <div className="flex items-center gap-0 px-4 py-4 sm:px-5">
            <button type="button" onClick={() => setScanMode((value) => !value)} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-l-lg border border-r-0 border-[#d1d7e0] px-3 text-sm hover:bg-[#f7f8fa] dark:border-[#40453b]"><i className={`pi ${scanMode ? "pi-barcode" : "pi-search"}`} />{scanMode ? "Quét Barcode" : "Tìm sản phẩm"}<i className="pi pi-chevron-down text-xs" /></button>
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder={scanMode ? "Quét barcode hoặc nhập SKU" : "Tìm sản phẩm"} className="h-10 min-w-0 flex-1 border border-[#d1d7e0] px-3 text-sm outline-none focus:border-blue-500 dark:border-[#40453b] dark:bg-[#191c18]" />
            <button type="button" onClick={applyScanOrSearch} className="h-10 rounded-r-lg border border-[#d1d7e0] px-3 text-sm font-medium hover:bg-[#f7f8fa] dark:border-[#40453b]">Tìm kiếm</button>
            <button type="button" disabled={busy || saving || !selectedLocation} onClick={() => void loadInventory()} title="Tải lại tồn kho" className="ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f0f2f5] text-[#586476] hover:bg-[#e5e8ed] disabled:opacity-50"><i className="pi pi-sync" /></button>
          </div>
          {busy ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">{loadingBase ? "Đang tải sản phẩm và kho..." : "Đang tải tồn kho theo kho..."}</p> : !selectedLocation ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">Chọn kho để bắt đầu kiểm kê.</p> : visibleRows.length === 0 ? <p className="px-5 py-16 text-center text-sm text-[#858a80]">{rows.length ? "Không có sản phẩm khớp bộ lọc." : "Chưa có sản phẩm trong phiếu. Chọn “Kiểm tất cả” hoặc “Thêm đơn lẻ”."}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-sm"><thead className="border-y border-[#e5e7eb] bg-[#f8f9fb] text-left text-xs text-[#596579] dark:border-[#363b31] dark:bg-[#191c18]"><tr><th className="px-4 py-4 font-medium">Tên sản phẩm</th><th className="min-w-[110px] whitespace-nowrap px-4 py-4 text-right font-medium">Tồn kho</th><th className="min-w-[150px] whitespace-nowrap px-4 py-4 text-center font-medium">Tồn thực tế</th><th className="px-4 py-4 text-right font-medium">Lệch</th><th className="min-w-[135px] whitespace-nowrap px-4 py-4 text-right font-medium">Giá trị lệch</th><th className="w-12 px-2" /></tr></thead><tbody className="divide-y divide-[#eef0f3] dark:divide-[#363b31]">{visibleRows.map(({ product, variant, onHand }) => {
            const actual = counts[variant.id] ?? "";
            const delta = /^-?\d+$/.test(actual) ? Number(actual) - onHand : null;
            const image = product.images?.find((item) => item.variant_ids?.includes(variant.id))?.src ?? product.images?.[0]?.src;
            const cost = Number((variant as HaravanProductVariant & { cost?: number; cost_amount?: number }).cost_amount ?? (variant as HaravanProductVariant & { cost?: number }).cost ?? 0);
            return <tr key={variant.id} className="hover:bg-[#fafbfc] dark:hover:bg-[#252923]"><td className="px-4 py-3"><div className="flex min-w-0 items-center gap-3">{image ? <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg border border-[#eceef1] object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#f0f2f5] text-[#9aa3af]"><i className="pi pi-image text-xl" /></div>}<div className="min-w-0"><p className="truncate font-medium text-blue-600">{product.title || "Sản phẩm"}</p><p className="mt-0.5 truncate text-[#6d7888]">{variant.title && variant.title !== "Default Title" ? variant.title : "Mặc định"}</p><p className="truncate text-[#8791a0]">SKU: {variant.sku || "—"}</p></div></div></td><td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{onHand.toLocaleString("vi-VN")}</td><td className="px-4 py-3 text-center"><input aria-label={`Số lượng thực tế ${variant.sku || variant.id}`} type="number" step="1" value={actual} placeholder="—" onChange={(event) => setCounts((current) => ({ ...current, [variant.id]: event.target.value }))} className={inputClass} /></td><td className={`px-4 py-3 text-right font-medium tabular-nums ${delta === null || delta === 0 ? "text-[#687386]" : delta > 0 ? "text-emerald-700" : "text-red-600"}`}>{delta === null ? "—" : delta.toLocaleString("vi-VN")}</td><td className="px-4 py-3 text-right tabular-nums">{formatVnd(Math.abs(delta ?? 0) * cost)}</td><td className="px-2 py-3 text-center"><button type="button" aria-label="Xóa sản phẩm khỏi phiếu" title="Xóa sản phẩm khỏi phiếu" onClick={() => removeVariant(variant.id!)} className="grid h-8 w-8 place-items-center rounded-md text-[#8a9099] hover:bg-[#f0f2f5] hover:text-red-600"><i className="pi pi-times" /></button></td></tr>;
          })}</tbody></table></div>}
          <div className="border-t border-[#eef0f3] px-4 py-3 text-xs text-[#8a94a3] dark:border-[#363b31]">{visibleRows.length.toLocaleString("vi-VN")} / {rows.length.toLocaleString("vi-VN")} biến thể</div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-4">
          <section className="rounded-2xl border border-[#e0e2e5] bg-white p-5 shadow-sm dark:border-[#363b31] dark:bg-[#20231f]"><h2 className="text-lg font-semibold">Kho kiểm</h2><select disabled={busy || saving} value={selectedLocation} onChange={(event) => { setCounts({}); setSelectedLocation(event.target.value); }} className="mt-4 h-10 w-full rounded-lg border border-[#d1d7e0] bg-white px-3 text-sm dark:border-[#40453b] dark:bg-[#191c18]"><option value="">Chọn kho</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name || `Kho #${location.id}`}{location.is_unavailable_quantity ? " · Không khả dụng" : ""}</option>)}</select><p className="mt-2 text-xs text-[#8a94a3]">Kho trung gian ảo không hiển thị tại đây.</p></section>
          <section className="rounded-2xl border border-[#e0e2e5] bg-white p-5 shadow-sm dark:border-[#363b31] dark:bg-[#20231f]"><div className="space-y-4 text-sm"><SummaryLine label="Số lượng lệch tăng" value={`+${summaries.increases.toLocaleString("vi-VN")}`} tone="green" /><SummaryLine label="Số lượng lệch giảm" value={summaries.decreases.toLocaleString("vi-VN")} tone="red" /><SummaryLine label="Giá trị tăng" value={formatVnd(summaries.increaseValue)} /><SummaryLine label="Giá trị giảm" value={formatVnd(summaries.decreaseValue)} /><div className="flex items-center justify-between border-t border-[#edf0f3] pt-4 text-base font-bold dark:border-[#363b31]"><span>Tổng giá trị</span><span>{formatVnd(summaries.increaseValue - summaries.decreaseValue)}</span></div></div><button type="button" disabled={busy || saving || !changedRows.length} onClick={() => setConfirmOpen(true)} className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><i className="pi pi-check" /> Hoàn tất kiểm kho</button><p className="mt-3 text-center text-xs text-[#8a94a3]">{countsByStatus.matched + countsByStatus.different} đã kiểm · {countsByStatus.uncounted} chưa kiểm</p>{countedRows.length > 0 && changedRows.length === 0 && <p className="mt-2 text-center text-xs text-[#8a94a3]">Không có chênh lệch để ghi lên Haravan.</p>}</section>
        </aside>
      </div>
      <p className="rounded-xl bg-[#f4f6f0] px-4 py-3 text-xs leading-5 text-[#66705f] dark:bg-[#20271d] dark:text-[#bdc7b5]">Haravan chưa cung cấp API phiếu kiểm kho riêng. Khi hoàn tất, hệ thống ghi phần tăng/giảm qua API điều chỉnh tồn và lưu vào lịch sử Chi tiết tồn kho; đây không phải phiếu nhập hàng.</p>
    </div>

    {addOneOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setAddOneOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="add-stocktake-item-title" className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between border-b border-[#edf0f3] p-5 dark:border-[#363b31]"><div><h2 id="add-stocktake-item-title" className="text-lg font-bold">Thêm sản phẩm kiểm kho</h2><p className="mt-1 text-sm text-[#7b8491]">Tìm theo tên, SKU hoặc barcode rồi chọn biến thể.</p></div><button type="button" onClick={() => setAddOneOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f0f2f5]"><i className="pi pi-times" /></button></header><div className="border-b border-[#edf0f3] p-4 dark:border-[#363b31]"><div className="relative"><i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]" /><input autoFocus value={variantSearch} onChange={(event) => setVariantSearch(event.target.value)} placeholder="Tìm sản phẩm, SKU, barcode..." className="h-11 w-full rounded-lg border border-[#d1d7e0] pl-9 pr-3 text-sm outline-none focus:border-blue-500 dark:border-[#40453b] dark:bg-[#191c18]" /></div></div><div className="max-h-[55vh] overflow-y-auto">{matchingVariants.map(({ product, variant }) => { const level = inventory.find((item) => Number(item.variant_id) === variant.id && Number(item.loc_id) === Number(selectedLocation)); const alreadyAdded = selectedVariantIds.includes(variant.id!); return <button key={variant.id} type="button" disabled={alreadyAdded} onClick={() => addVariant(variant.id!)} className="flex w-full items-center justify-between gap-3 border-b border-[#f0f1f3] px-5 py-3 text-left hover:bg-[#f8f9fb] disabled:cursor-default disabled:opacity-50 dark:border-[#363b31]"><span className="min-w-0"><span className="block truncate font-medium">{product.title || "Sản phẩm"} · {variant.title || "Mặc định"}</span><span className="mt-1 block text-xs text-[#8791a0]">SKU: {variant.sku || "—"}</span></span><span className="shrink-0 text-right text-sm">Tồn kho <strong className="ml-1">{Number(level?.qty_onhand ?? 0).toLocaleString("vi-VN")}</strong>{alreadyAdded && <span className="ml-3 text-xs text-emerald-700">Đã thêm</span>}</span></button>; })}{matchingVariants.length === 0 && <p className="px-5 py-12 text-center text-sm text-[#8791a0]">Không tìm thấy sản phẩm phù hợp.</p>}</div></section></div>}
    {confirmOpen && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setConfirmOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="stocktake-confirm-title" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><h2 id="stocktake-confirm-title" className="text-xl font-extrabold">Xác nhận phiếu kiểm kho</h2><p className="mt-2 text-sm leading-6 text-[#73796f] dark:text-[#b3b9ad]">Kho <strong>{selectedWarehouse?.name}</strong>: lưu {countedRows.length} biến thể đã đếm, trong đó có {changedRows.length} biến thể chênh lệch. Số tồn thực tế âm vẫn được ghi nhận theo số bạn nhập.</p><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={saving} onClick={() => setConfirmOpen(false)} className="h-10 rounded-lg border border-[#dfe4d9] px-4 text-sm font-semibold dark:border-[#40453b]">Hủy</button><button type="button" disabled={saving} onClick={() => void submitCount()} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? "Đang lưu phiếu..." : "Xác nhận"}</button></div></section></div>}
  </HaravanShell>;
}

function SummaryLine({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "red" }) {
  const color = tone === "green" ? "text-emerald-700" : tone === "red" ? "text-red-600" : "text-[#20231f] dark:text-[#f4f5ef]";
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span className={`font-medium tabular-nums ${color}`}>{value}</span></div>;
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("vi-VN")} ₫`;
}

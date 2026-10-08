"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import {
  isVirtualLocation,
  listInventoryLocations,
  listLocations,
  type HaravanInventoryLocation,
  type HaravanLocation,
} from "@/services/api/locations";
import { listProducts, type HaravanProduct } from "@/services/api/products";

const PAGE_SIZE = 20;
const VARIANT_BATCH_SIZE = 50;

interface VariantRow {
  key: string;
  variantId: number;
  productKey: string;
  productTitle: string;
  variantTitle: string;
  sku: string;
  barcode: string;
  level?: HaravanInventoryLocation;
}

interface WarehouseGroup {
  locId: number;
  name: string;
  rows: VariantRow[];
  totals: { onhand: number; incoming: number; commited: number };
}

function onhandOf(level?: HaravanInventoryLocation) {
  return Number(level?.qty_onhand ?? 0);
}

function availableOf(level?: HaravanInventoryLocation) {
  if (level?.qty_available == null) return onhandOf(level) - Number(level?.qty_commited ?? 0);
  return Number(level.qty_available);
}

export default function InventoryStockPage() {
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [products, setProducts] = useState<HaravanProduct[]>([]);
  const [levels, setLevels] = useState<HaravanInventoryLocation[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listLocations(token, currentShop.orgId)
      .then((result) => { if (!cancelled) setLocations((result.locations ?? []).filter((item) => !isVirtualLocation(item))); })
      .catch(() => { if (!cancelled) setLocations([]); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listProducts(token, currentShop.orgId, { page, limit: PAGE_SIZE })
      .then((result) => { if (!cancelled) setProducts(result.products ?? []); })
      .catch((requestError) => { if (!cancelled) { setProducts([]); setError(requestError instanceof Error ? requestError.message : "Không tải được danh sách sản phẩm."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, page]);

  const variantIds = useMemo(() => products.flatMap((product) => (product.variants ?? []).map((variant) => Number(variant.id ?? 0))).filter(Boolean), [products]);

  useEffect(() => {
    if (!token || variantIds.length === 0) { setLevels([]); return; }
    let cancelled = false;
    setLoadingStock(true);
    const scope = selectedLocation || locations.map((item) => String(item.id)).join(",");
    const batches = [];
    for (let offset = 0; offset < variantIds.length; offset += VARIANT_BATCH_SIZE) {
      const ids = variantIds.slice(offset, offset + VARIANT_BATCH_SIZE).join(",");
      batches.push(listInventoryLocations(token, currentShop.orgId, { location_ids: scope, variant_ids: ids }).then((result) => result.inventory_locations ?? []));
    }
    Promise.all(batches)
      .then((chunks) => { if (!cancelled) setLevels(chunks.flat()); })
      .catch(() => { if (!cancelled) setLevels([]); })
      .finally(() => { if (!cancelled) setLoadingStock(false); });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId, selectedLocation, locations, variantIds, refreshKey]);

  const levelMap = useMemo(() => {
    const map = new Map<string, HaravanInventoryLocation>();
    for (const level of levels) map.set(`${Number(level.loc_id ?? 0)}:${Number(level.variant_id ?? 0)}`, level);
    return map;
  }, [levels]);

  const rows = useMemo<VariantRow[]>(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");
    const result: VariantRow[] = [];
    for (const product of products) {
      for (const variant of product.variants ?? []) {
        const sku = variant.sku || "";
        const barcode = variant.barcode || "";
        const matches = !keyword
          || (product.title ?? "").toLocaleLowerCase("vi").includes(keyword)
          || sku.toLocaleLowerCase("vi").includes(keyword)
          || barcode.toLocaleLowerCase("vi").includes(keyword);
        if (!matches) continue;
        result.push({
          key: `${product.id ?? 0}-${variant.id ?? 0}`,
          variantId: Number(variant.id ?? 0),
          productKey: String(product.id ?? product.title ?? ""),
          productTitle: product.title || "Sản phẩm",
          variantTitle: variant.title || "Mặc định",
          sku,
          barcode,
        });
      }
    }
    return result;
  }, [products, search]);

  const locationName = useMemo(() => {
    const map = new Map<number, string>();
    for (const item of locations) map.set(Number(item.id), item.name || `Kho #${item.id}`);
    return map;
  }, [locations]);

  const groups = useMemo<WarehouseGroup[]>(() => {
    const targetLocations = selectedLocation ? [Number(selectedLocation)] : locations.map((item) => Number(item.id));
    return targetLocations.map((locId) => {
      const warehouseRows = rows.map((row) => ({ ...row, level: levelMap.get(`${locId}:${row.variantId}`) }));
      const totals = warehouseRows.reduce((sum, row) => ({
        onhand: sum.onhand + onhandOf(row.level),
        incoming: sum.incoming + Number(row.level?.qty_incoming ?? 0),
        commited: sum.commited + Number(row.level?.qty_commited ?? 0),
      }), { onhand: 0, incoming: 0, commited: 0 });
      return { locId, name: locationName.get(locId) || `Kho #${locId}`, rows: warehouseRows, totals };
    }).filter((group) => group.rows.some((row) => onhandOf(row.level) !== 0 || Number(row.level?.qty_incoming ?? 0) !== 0 || Number(row.level?.qty_commited ?? 0) !== 0))
      .sort((a, b) => b.totals.onhand - a.totals.onhand);
  }, [rows, levelMap, selectedLocation, locations, locationName]);

  function toggleGroup(locId: number) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(locId)) next.delete(locId); else next.add(locId);
      return next;
    });
  }

  function toggleAllGroups() {
    setCollapsed((current) => (current.size > 0 ? new Set() : new Set(groups.map((group) => group.locId))));
  }

  function toggleProduct(key: string) {
    setCollapsedProducts((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return <HaravanShell fill>
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <section className="shrink-0 rounded-2xl border border-[#e6e9df] bg-white p-4 dark:border-[#363b31] dark:bg-[#20231f]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-[#858a80]">Kho</span><select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)} className="h-10 min-w-[220px] rounded-lg border border-[#dfe4d9] bg-white px-3 text-sm outline-none focus:border-[#527b49] dark:border-[#40453b] dark:bg-[#191c18]"><option value="">Tất cả kho</option>{locations.map((item) => <option key={item.id} value={String(item.id)}>{item.name || `Kho #${item.id}`}</option>)}</select></label>
          <label className="block min-w-[240px] flex-1"><span className="mb-1 block text-xs font-semibold text-[#858a80]">Tìm sản phẩm</span><span className="relative block"><i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-[#8a94a3]" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tên sản phẩm, SKU hoặc barcode..." className="h-10 w-full rounded-lg border border-[#dfe4d9] pl-9 pr-3 text-sm outline-none focus:border-[#527b49] dark:border-[#40453b] dark:bg-[#191c18]" /></span></label>
          <button type="button" disabled={loadingStock} onClick={() => setRefreshKey((value) => value + 1)} className="h-10 rounded-lg border border-[#dfe4d9] px-4 text-sm font-semibold disabled:opacity-40 dark:border-[#40453b]">{loadingStock ? "Đang tải tồn..." : "Làm mới"}</button>
          <button type="button" disabled={groups.length === 0} onClick={toggleAllGroups} className="h-10 rounded-lg border border-[#dfe4d9] px-4 text-sm font-semibold disabled:opacity-40 dark:border-[#40453b]">{collapsed.size > 0 ? "Mở tất cả" : "Thu gọn tất cả"}</button>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-auto pb-1">
        {loading ? <p className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-16 text-center text-sm text-[#858a80] dark:border-[#363b31] dark:bg-[#20231f]">Đang tải sản phẩm...</p> : error ? <p role="alert" className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-8 text-center text-sm text-[#aa382f] dark:border-[#363b31] dark:bg-[#20231f]">{error}</p> : groups.length === 0 ? <div className="rounded-2xl border border-[#e6e9df] bg-white px-5 py-16 text-center dark:border-[#363b31] dark:bg-[#20231f]"><p className="font-semibold">Kho này chưa có tồn</p><p className="mt-1 text-sm text-[#858a80]">Thử chọn kho khác hoặc tìm kiếm tên sản phẩm khác.</p></div> : <div className="space-y-3">{groups.map((group) => <WarehouseGroupCard key={group.locId} group={group} collapsed={collapsed.has(group.locId)} onToggle={() => toggleGroup(group.locId)} collapsedProducts={collapsedProducts} onToggleProduct={toggleProduct} />)}</div>}
      </section>

      <div className="flex shrink-0 items-center justify-between rounded-2xl border border-[#e6e9df] bg-white px-5 py-2 text-xs dark:border-[#363b31] dark:bg-[#20231f]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
    </div>
  </HaravanShell>;
}

function WarehouseGroupCard({ group, collapsed, onToggle, collapsedProducts, onToggleProduct }: { group: WarehouseGroup; collapsed: boolean; onToggle: () => void; collapsedProducts: Set<string>; onToggleProduct: (key: string) => void }) {
  /** Variants of the same product stay together under one parent row. */
  const productBlocks = group.rows.reduce<Array<{ key: string; title: string; variants: VariantRow[] }>>((blocks, row) => {
    const last = blocks[blocks.length - 1];
    if (last && last.key === row.productKey) last.variants.push(row);
    else blocks.push({ key: row.productKey, title: row.productTitle, variants: [row] });
    return blocks;
  }, []);

  return <section className="rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
    <button type="button" onClick={onToggle} aria-expanded={!collapsed} className={`flex w-full flex-wrap items-center justify-between gap-3 bg-[#f8f9f6] px-5 py-3 text-left dark:bg-[#191c18] ${collapsed ? "rounded-2xl" : "rounded-t-2xl"}`}>
      <span className="flex items-center gap-2"><i className={collapsed ? "pi pi-chevron-right text-[#527b49]" : "pi pi-chevron-down text-[#527b49]"} /><i className="pi pi-box text-[#527b49]" /><strong className="font-bold">{group.name}</strong><span className="rounded-full bg-[#eaf0e4] px-2 py-0.5 text-xs font-semibold text-[#527b49] dark:bg-[#30392c] dark:text-[#c4dfa9]">{productBlocks.length} sản phẩm</span></span>
      <span className="flex flex-wrap gap-4 text-xs text-[#66705f] dark:text-[#c5cbbd]"><span>Tồn thực tế <strong className="text-[#20231f] dark:text-white">{group.totals.onhand.toLocaleString("vi-VN")}</strong></span><span>Đang nhập <strong className="text-blue-700">{group.totals.incoming.toLocaleString("vi-VN")}</strong></span><span>Đang chờ <strong className="text-amber-700">{group.totals.commited.toLocaleString("vi-VN")}</strong></span></span>
    </button>
    {!collapsed && <div className="rounded-b-2xl">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 z-10 text-left text-xs font-bold uppercase tracking-wide">
          <tr>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3">Sản phẩm / Biến thể</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3">SKU / Barcode</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3 text-right">Tồn thực tế</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3 text-right">Đang nhập</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3 text-right">Đang chờ</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3 text-right">Khả dụng</th>
            <th className="border-b-2 border-[#527b49] bg-[#dde5d7] text-[#3d4a36] dark:border-[#527b49] dark:bg-[#2b3227] dark:text-[#c9dcc0] px-4 py-3">Cập nhật</th>
          </tr>
        </thead>
        <tbody>
          {productBlocks.map((block) => {
            const totals = block.variants.reduce((sum, row) => ({
              onhand: sum.onhand + onhandOf(row.level),
              incoming: sum.incoming + Number(row.level?.qty_incoming ?? 0),
              commited: sum.commited + Number(row.level?.qty_commited ?? 0),
              available: sum.available + availableOf(row.level),
            }), { onhand: 0, incoming: 0, commited: 0, available: 0 });
            const productKey = `${group.locId}:${block.key}`;
            return <ProductBlock key={block.key} block={block} totals={totals} collapsed={collapsedProducts.has(productKey)} onToggle={() => onToggleProduct(productKey)} />;
          })}
        </tbody>
      </table>
    </div>}
  </section>;
}

function ProductBlock({ block, totals, collapsed, onToggle }: { block: { key: string; title: string; variants: VariantRow[] }; totals: { onhand: number; incoming: number; commited: number; available: number }; collapsed: boolean; onToggle: () => void }) {
  return <>
    <tr className="bg-[#f4f6f2] dark:bg-[#252923]">
      <td className="px-4 py-3"><button type="button" onClick={onToggle} aria-expanded={!collapsed} className="inline-flex items-center gap-2 text-left"><i className={collapsed ? "pi pi-chevron-right text-xs text-[#527b49]" : "pi pi-chevron-down text-xs text-[#527b49]"} /><span className="font-extrabold">{block.title}</span><span className="text-xs font-semibold text-[#66705f] dark:text-[#b3b9ad]">{block.variants.length} biến thể</span></button></td>
      <td className="px-4 py-3 text-xs text-[#858a80]">—</td>
      <td className="px-4 py-3 text-right tabular-nums font-extrabold">{totals.onhand.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-3 text-right tabular-nums text-blue-700">{totals.incoming.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-3 text-right tabular-nums text-amber-700">{totals.commited.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-3 text-right tabular-nums font-extrabold text-emerald-700">{totals.available.toLocaleString("vi-VN")}</td>
      <td className="px-4 py-3 text-xs text-[#858a80]">—</td>
    </tr>
    {!collapsed && block.variants.map((row) => <tr key={row.key} className="border-b border-[#eef0ea] hover:bg-[#fafbfc] dark:border-[#363b31] dark:hover:bg-[#252923]">
      <td className="px-4 py-2 pl-9"><span className="text-[#73796f] dark:text-[#b3b9ad]">{row.variantTitle}</span></td>
      <td className="px-4 py-2"><p>{row.sku || "—"}</p><p className="mt-1 text-xs text-[#858a80]">{row.barcode || "—"}</p></td>
      <td className="px-4 py-2 text-right tabular-nums">{onhandOf(row.level).toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-right tabular-nums text-blue-700">{Number(row.level?.qty_incoming ?? 0).toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-right tabular-nums text-amber-700">{Number(row.level?.qty_commited ?? 0).toLocaleString("vi-VN")}</td>
      <td className={`px-4 py-2 text-right tabular-nums ${availableOf(row.level) > 0 ? "text-emerald-700" : "text-[#858a80]"}`}>{availableOf(row.level).toLocaleString("vi-VN")}</td>
      <td className="px-4 py-2 text-xs text-[#858a80]">{row.level?.updated_at ? new Date(row.level.updated_at).toLocaleString("vi-VN") : "—"}</td>
    </tr>)}
  </>;
}

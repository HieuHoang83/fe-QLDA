"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import HaravanShell from "@/components/haravan/HaravanShell";
import { useShop } from "@/context/ShopContext";
import {
  isVirtualLocation,
  isUnavailableLocation,
  listInventoryLocations,
  listLocations,
  type HaravanLocation,
} from "@/services/api/locations";
import {
  getProduct,
  listProducts,
  type HaravanProduct,
  type HaravanProductVariant,
} from "@/services/api/products";
import { formatMoney, variantImage, variantLabel } from "@/lib/haravan-format";
import {
  getPurchaseReceive,
  listPurchaseReceives,
  type HaravanPurchaseReceive,
} from "@/services/api/purchase-receives";
import {
  getPurchaseOrder,
  purchaseOrderFlatLines,
  type PurchaseOrderDocument,
  type PurchaseOrderLine,
} from "@/services/api/inventory-documents";

interface ReceiveLine {
  key: string;
  product: HaravanProduct;
  variant: HaravanProductVariant;
  quantity: number;
  cost: number;
  discount: number;
}

function orderLines(order: PurchaseOrderDocument): PurchaseOrderLine[] {
  return purchaseOrderFlatLines(order);
}

function isPurchaseOrderClosed(order: PurchaseOrderDocument) {
  return !!order.closed_at || /hoàn thành|đã hủy|cancel|closed|đóng/i.test(order.status ?? "");
}

function variantIdOf(line: { product_variant_id?: number; variant_id?: number }) {
  return line.product_variant_id ?? line.variant_id;
}

function asArray<T>(value: T[] | T | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function addReceivedQuantity(
  totals: Record<string, number>,
  lines: Array<{ product_variant_id?: number; variant_id?: number; quantity?: number }>
) {
  for (const line of lines) {
    const variantId = variantIdOf(line);
    if (variantId) totals[String(variantId)] = (totals[String(variantId)] ?? 0) + Math.max(0, Number(line.quantity) || 0);
  }
}

async function getPreviouslyReceivedQuantities(token: string, orgId: string, purchaseOrderId: number) {
  const totals: Record<string, number> = {};
  const pageSize = 100;
  const maxPages = 100;

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await listPurchaseReceives(token, orgId, { page, limit: pageSize });
    const rows = result.purchase_receives ?? [];
    for (const receive of rows) {
      if (Number(receive.ref_purchase_order_id) !== purchaseOrderId || /nháp|draft|hủy|cancel/i.test(receive.status ?? "")) continue;
      addReceivedQuantity(totals, asArray(receive.line_items));
    }
    if (rows.length < pageSize) break;
    if (page === maxPages) throw new Error("Danh sách phiếu nhập quá lớn để xác minh số lượng còn lại.");
  }

  return totals;
}

const INPUT =
  "h-10 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-[#66705f] dark:text-[#c5cbbd]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function InventoryReceivePage() {
  const locale = useLocale();
  const { data: session } = useSession();
  const { currentShop } = useShop();
  const token = session?.access_token;
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<HaravanProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<number>>(() => new Set());
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [pendingLines, setPendingLines] = useState<ReceiveLine[]>([]);
  const [locationStock, setLocationStock] = useState<Record<string, number>>({});
  const [pickerLocationStock, setPickerLocationStock] = useState<Record<string, number>>({});
  const [pickerStockLoading, setPickerStockLoading] = useState(false);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [supplierOtherCost, setSupplierOtherCost] = useState(0);
  const [otherImportCost, setOtherImportCost] = useState(0);
  const [supplierPaid, setSupplierPaid] = useState(0);
  const [otherCostPaid, setOtherCostPaid] = useState(0);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDocument | null>(null);
  const [purchaseOrderRemaining, setPurchaseOrderRemaining] = useState<Record<string, number>>({});
  const [purchaseOrderLoading, setPurchaseOrderLoading] = useState(false);
  const [purchaseOrderError, setPurchaseOrderError] = useState("");
  const [receiveDate, setReceiveDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });

  useEffect(() => {
    if (!token || typeof window === "undefined") return;
    const rawId = new URLSearchParams(window.location.search).get("purchase_order_id");
    const purchaseOrderId = Number(rawId);
    if (!rawId || !Number.isSafeInteger(purchaseOrderId) || purchaseOrderId <= 0) return;

    let cancelled = false;
    setPurchaseOrderLoading(true);
    setPurchaseOrderError("");
    (async () => {
      const [orderResult, productsResult, received] = await Promise.all([
        getPurchaseOrder(token, currentShop.orgId, purchaseOrderId),
        listProducts(token, currentShop.orgId, { limit: 250 }),
        getPreviouslyReceivedQuantities(token, currentShop.orgId, purchaseOrderId),
      ]);
      const order = orderResult.purchase_order;
      if (!order) throw new Error("Không tìm thấy đơn đặt hàng.");
      if (isPurchaseOrderClosed(order)) {
        throw new Error(`Đơn đặt hàng đang ở trạng thái “${order.status}”, không thể nhập thêm.`);
      }

      const catalog = productsResult.products ?? [];
      const remaining: Record<string, number> = {};
      const lines: ReceiveLine[] = [];
      const combinedOrderLines = new Map<string, PurchaseOrderLine>();
      for (const line of orderLines(order)) {
        const variantId = variantIdOf(line);
        if (!variantId) continue;
        const current = combinedOrderLines.get(String(variantId));
        if (current) current.quantity = (current.quantity ?? 0) + (line.quantity ?? 0);
        else combinedOrderLines.set(String(variantId), { ...line });
      }
      for (const orderLine of Array.from(combinedOrderLines.values())) {
        const variantId = variantIdOf(orderLine);
        const orderedQuantity = Math.max(0, Math.floor(Number(orderLine.quantity) || 0));
        if (!variantId || !orderedQuantity) continue;
        remaining[String(variantId)] = Math.max(0, orderedQuantity - (received[String(variantId)] ?? 0));

        let product = catalog.find((item) =>
          (orderLine.product_id == null || item.id === orderLine.product_id) &&
          (item.variants ?? []).some((variant) => variant.id === variantId)
        ) ?? catalog.find((item) => (item.variants ?? []).some((variant) =>
          variant.id === variantId || (!!orderLine.sku && variant.sku === orderLine.sku)
        ));
        if (!product && orderLine.product_id) {
          const productResult = await getProduct(token, currentShop.orgId, orderLine.product_id);
          product = productResult.product;
          if (product) catalog.push(product);
        }
        const variant = product?.variants?.find((item) => item.id === variantId) ??
          product?.variants?.find((item) => !!orderLine.sku && item.sku === orderLine.sku);
        if (!product || !variant) continue;
        if (orderLine.product_id && product.id !== orderLine.product_id) continue;
        const key = `${product.id}-${variant.id}`;
        const maxQuantity = remaining[String(variantId)] ?? 0;
        if (maxQuantity <= 0) continue;
        lines.push({
          key,
          product,
          variant,
          quantity: Math.min(maxQuantity, orderedQuantity),
          cost: Number(orderLine.cost_amount ?? orderLine.cost ?? orderLine.price ?? variant.price) || 0,
          discount: 0,
        });
      }
      if (!lines.length) throw new Error("Đơn này không còn số lượng có thể nhập hoặc không tìm thấy biến thể sản phẩm trong danh mục.");
      if (!cancelled) {
        setPurchaseOrder(order);
        setPurchaseOrderRemaining(remaining);
        setLines(lines);
        setReference(order.ref_number || `#${order.id}`);
        setNote("");
      }
    })().catch((error) => {
      if (!cancelled) {
        setPurchaseOrder(null);
        setPurchaseOrderRemaining({});
        setPurchaseOrderError(error instanceof Error ? error.message : "Không tải được đơn đặt hàng.");
        toast.error(error instanceof Error ? error.message : "Không tải được đơn đặt hàng.");
      }
    }).finally(() => {
      if (!cancelled) setPurchaseOrderLoading(false);
    });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  const physicalLocations = useMemo(
    () => locations.filter((location) => !isVirtualLocation(location)),
    [locations]
  );
  const receivableLocations = useMemo(
    () => physicalLocations.filter((location) => !isUnavailableLocation(location)),
    [physicalLocations]
  );
  const stockLookup = JSON.stringify(
    lines.map((line) => ({ key: line.key, productId: line.product.id, variantId: line.variant.id }))
  );
  const pickerVariantLookup = JSON.stringify(
    searchResults.flatMap((product) => (product.variants ?? [])
      .filter((variant) => product.id && variant.id)
      .map((variant) => ({ productId: product.id!, variantId: variant.id! })))
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    listLocations(token, currentShop.orgId)
      .then((result) => {
        if (cancelled) return;
        const available = (result.locations ?? []).filter(
          (location) => !isVirtualLocation(location)
        );
        setLocations(available);
        const primary = available.find(
          (location) => location.is_primary && !isUnavailableLocation(location)
        );
        if (primary) setSelectedLocationId(String(primary.id));
      })
      .catch(() => {
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, [token, currentShop.orgId]);

  useEffect(() => {
    const orderLocationId = purchaseOrder?.location?.id;
    if (!orderLocationId || !receivableLocations.some((location) => location.id === orderLocationId)) return;
    setSelectedLocationId(String(orderLocationId));
  }, [purchaseOrder, receivableLocations]);

  useEffect(() => {
    if (!token || !selectedLocationId || !stockLookup || stockLookup === "[]") {
      setLocationStock({});
      return;
    }
    let cancelled = false;
    const lookup = JSON.parse(stockLookup) as Array<{
      key: string;
      productId?: number;
      variantId?: number;
    }>;
    const queryable = lookup.filter((item) => item.productId && item.variantId);
    setLocationStock({});
    (async () => {
      const resultMap: Record<string, number> = {};
      for (let index = 0; index < queryable.length; index += 50) {
        const batch = queryable.slice(index, index + 50);
        try {
          const result = await listInventoryLocations(token, currentShop.orgId, {
            location_ids: selectedLocationId,
            variant_ids: batch.map((item) => item.variantId).join(","),
          });
          for (const item of result.inventory_locations ?? []) {
            const matched = batch.find(
              (line) =>
                item.loc_id === Number(selectedLocationId) &&
                line.variantId === item.variant_id &&
                (item.product_id == null || line.productId === item.product_id)
            );
            if (matched) resultMap[matched.key] = item.qty_onhand ?? 0;
          }
          for (const line of batch) resultMap[line.key] ??= 0;
        } catch {
          for (const line of batch) resultMap[line.key] = 0;
        }
      }
      if (!cancelled) setLocationStock(resultMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, currentShop.orgId, selectedLocationId, stockLookup]);

  useEffect(() => {
    if (!token || !selectedLocationId || !pickerVariantLookup || pickerVariantLookup === "[]") {
      setPickerLocationStock({});
      setPickerStockLoading(false);
      return;
    }

    let cancelled = false;
    const variants = JSON.parse(pickerVariantLookup) as Array<{ productId: number; variantId: number }>;
    setPickerLocationStock({});
    setPickerStockLoading(true);

    (async () => {
      const stock: Record<string, number> = {};
      for (let index = 0; index < variants.length; index += 50) {
        const batch = variants.slice(index, index + 50);
        try {
          const result = await listInventoryLocations(token, currentShop.orgId, {
            location_ids: selectedLocationId,
            variant_ids: batch.map((item) => item.variantId).join(","),
          });
          for (const item of result.inventory_locations ?? []) {
            if (item.loc_id !== Number(selectedLocationId) || !item.variant_id) continue;
            const matched = batch.find((variant) =>
              variant.variantId === item.variant_id &&
              (item.product_id == null || variant.productId === item.product_id)
            );
            if (matched) stock[`${matched.productId}-${matched.variantId}`] = item.qty_onhand ?? 0;
          }
          for (const variant of batch) stock[`${variant.productId}-${variant.variantId}`] ??= 0;
        } catch {
          for (const variant of batch) stock[`${variant.productId}-${variant.variantId}`] = -1;
        }
      }
      if (!cancelled) setPickerLocationStock(stock);
    })().finally(() => {
      if (!cancelled) setPickerStockLoading(false);
    });

    return () => { cancelled = true; };
  }, [token, currentShop.orgId, selectedLocationId, pickerVariantLookup]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setSearching(true);
    listProducts(token, currentShop.orgId, { limit: 250 })
      .then((result) => {
        if (!cancelled) {
          const products = result.products ?? [];
          setSearchResults(products);
          setExpandedProducts(new Set(products.flatMap((product) => product.id ? [product.id] : [])));
          setSearchCompleted(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : "Không tải được sản phẩm.");
          setSearchCompleted(true);
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => { cancelled = true; };
  }, [token, currentShop.orgId]);

  useEffect(() => {
    const query = productSearch.trim();
    if (!token || !query) return;
    let cancelled = false;
    setSearchError("");
    setSearchCompleted(false);
    setSearchResults([]);
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const result = await listProducts(token, currentShop.orgId, {
          sku: query,
          limit: 20,
        });
        if (!cancelled) {
          const products = result.products ?? [];
          setSearchResults(products);
          setExpandedProducts(new Set(products.flatMap((product) => product.id ? [product.id] : [])));
          setSearchCompleted(true);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : "Không tìm được sản phẩm. Vui lòng thử lại.");
          setSearchCompleted(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [productSearch, token, currentShop.orgId]);

  function togglePendingVariant(product: HaravanProduct, variant: HaravanProductVariant, checked: boolean) {
    if (!product.id || !variant.id) return;
    const remaining = purchaseOrder ? purchaseOrderRemaining[String(variant.id)] ?? 0 : Number.POSITIVE_INFINITY;
    if (purchaseOrder && remaining <= 0) return;
    const key = `${product.id}-${variant.id}`;
    setPendingLines((current) => {
      if (!checked) return current.filter((line) => line.key !== key);
      if (current.some((line) => line.key === key)) return current;
      return [...current, {
        key,
        product,
        variant,
        quantity: Math.min(1, remaining),
        cost: Number(variant.price) || 0,
        discount: 0,
      }];
    });
  }

  function toggleProduct(productId: number) {
    setExpandedProducts((current) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function updateLine(key: string, field: "quantity" | "cost" | "discount", value: number) {
    const variantKey = key.slice(key.lastIndexOf("-") + 1);
    const maxQuantity = purchaseOrder
      ? purchaseOrderRemaining[variantKey] ?? 0
      : Number.POSITIVE_INFINITY;
    const safeValue = Math.max(0, Number.isFinite(value) ? value : 0);
    setLines((current) => current.map((line) => {
      if (line.key !== key) return line;
      if (field === "discount" && safeValue > line.cost) {
        return { ...line, cost: safeValue, discount: 0 };
      }
      if (field === "cost") {
        return { ...line, cost: safeValue, discount: Math.min(line.discount, safeValue) };
      }
      return { ...line, [field]: field === "quantity" ? Math.min(safeValue, maxQuantity) : safeValue };
    }));
  }

  async function openProductPicker() {
    setProductPickerOpen(true);
    setPendingLines(lines);
    setProductSearch("");
    setSearchError("");
    if (!token || searchResults.length > 0 || searching) return;

    setSearching(true);
    try {
      const result = await listProducts(token, currentShop.orgId, { limit: 250 });
      const products = result.products ?? [];
      setSearchResults(products);
      setExpandedProducts(new Set(products.flatMap((product) => product.id ? [product.id] : [])));
      setSearchCompleted(true);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Không tải được sản phẩm.");
      setSearchCompleted(true);
    } finally {
      setSearching(false);
    }
  }

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const grossGoodsTotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.cost,
    0
  );
  const lineDiscount = lines.reduce((sum, line) => sum + line.quantity * line.discount, 0);
  const goodsTotal = Math.max(0, grossGoodsTotal - lineDiscount);
  const supplierPayable = goodsTotal + supplierOtherCost;
  const totalReceiveValue = supplierPayable + otherImportCost;
  const outstanding = totalReceiveValue - supplierPaid - otherCostPaid;

  return (
    <HaravanShell title="Nhập hàng">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-8">
        {purchaseOrder && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8d6] bg-[#f5f8f2] px-4 py-3 dark:border-[#3d4b36] dark:bg-[#252d21]"><div><p className="text-sm font-bold">Nhập theo đơn {purchaseOrder.ref_number || `#${purchaseOrder.id}`}</p><p className="mt-1 text-xs text-[#66705f] dark:text-[#c5cbbd]">Số lượng nhận được giới hạn theo số còn lại của từng biến thể trong đơn.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold dark:bg-[#191c18]">Còn nhận {Object.values(purchaseOrderRemaining).reduce((sum, quantity) => sum + quantity, 0)}</span></div>}
        {purchaseOrderLoading && <p className="rounded-xl bg-[#f8f9f6] px-4 py-3 text-sm text-[#66705f]">Đang tải đơn đặt hàng và kiểm tra số lượng đã nhập…</p>}
        {purchaseOrderError && <p role="alert" className="rounded-xl bg-[#fff0ee] px-4 py-3 text-sm text-[#aa382f]">{purchaseOrderError}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={`/${locale}/inventory/receives`} className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-[#527b49] hover:text-[#41643a]">
              <i className="pi pi-arrow-left" aria-hidden="true" /> Danh sách phiếu nhập
            </Link>
            <p className="text-sm text-[#73796f] dark:text-[#b3b9ad]">
              Tạo phiếu nhập hàng vào kho của {currentShop.name || "cửa hàng"}.
            </p>
          </div>
            <Field label="Ngày nhập">
            <input className={INPUT} type="date" required value={receiveDate} onChange={(event) => setReceiveDate(event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3f5ef] text-[#71836a] dark:bg-[#30392c]"><i className="pi pi-box" /></span>
              <div><h2 className="font-bold">Kho nhập</h2><p className="text-xs text-[#858a80]">Ẩn kho trung gian và kho không khả dụng</p></div>
            </div>
            <Field label="Chọn kho">
              <select className={INPUT} disabled={!!purchaseOrder?.location?.id} value={selectedLocationId} onChange={(event) => setSelectedLocationId(event.target.value)}>
                <option value="">Chọn kho nhận hàng</option>
                {receivableLocations.map((location) => <option key={location.id} value={location.id}>{location.name || `Kho #${location.id}`}</option>)}
              </select>
            </Field>
            {purchaseOrder?.location?.id && !receivableLocations.some((location) => location.id === purchaseOrder.location?.id) && <p role="alert" className="mt-3 text-xs text-[#aa382f]">Kho gắn với đơn đặt hàng không khả dụng để nhập. Hãy cập nhật kho của đơn trên Haravan.</p>}
            {receivableLocations.find((location) => String(location.id) === selectedLocationId) && (() => {
              const location = receivableLocations.find((item) => String(item.id) === selectedLocationId)!;
              const address = [location.address1, location.address2, location.district, location.city, location.province, location.zip, location.country].filter(Boolean).join(", ");
              return <div className="mt-3 rounded-xl bg-[#f8f9f6] px-4 py-3 text-sm dark:bg-[#191c18]"><p className="font-semibold">{location.name || `Kho #${location.id}`}</p><p className="mt-1 text-xs text-[#858a80]">{address || "Chưa có địa chỉ"}</p>{location.phone && <p className="mt-1 text-xs text-[#858a80]">{location.phone}</p>}</div>;
            })()}
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0ea] px-5 py-4 dark:border-[#363b31]">
            <div><h2 className="font-bold">Sản phẩm nhập</h2><p className="text-xs text-[#858a80]">Thêm sản phẩm và biến thể vào phiếu</p></div>
            <button type="button" onClick={() => void openProductPicker()} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a]"><i className="pi pi-plus" /> Thêm</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase tracking-wide text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3 text-right">Tồn kho</th><th className="px-4 py-3">Số lượng nhập</th><th className="px-4 py-3">Đơn giá</th><th className="px-4 py-3">Giảm giá</th><th className="px-4 py-3 text-right">Thành tiền</th><th className="px-4 py-3" /></tr></thead>
              <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">
                {lines.map((line) => {
                  const total = Math.max(0, line.quantity * (line.cost - line.discount));
                  const image = variantImage(line.product, line.variant);
                  return <tr key={line.key}>
                    <td className="px-4 py-4"><div className="flex min-w-[260px] items-center gap-3">{image ? <img src={image} alt="" className="h-12 w-12 rounded-lg border border-[#e6e9df] object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#f3f5ef]"><i className="pi pi-image text-[#a1a89a]" /></span>}<div className="min-w-0"><p className="truncate font-semibold">{line.product.title}</p><p className="truncate text-xs text-[#66705f]">{variantLabel(line.variant)}</p><p className="truncate text-xs text-[#858a80]">SKU: {line.variant.sku || "—"}</p></div></div></td>
                    <td className="px-4 py-4 text-right tabular-nums">{locationStock[line.key] ?? "—"}</td>
                    <td className="px-4 py-4"><div className="flex items-center gap-1 whitespace-nowrap"><FormattedNumberInput ariaLabel={`Số lượng nhập ${line.product.title}`} className={`${INPUT} w-24`} min={1} step={1} value={line.quantity} onChange={(value) => updateLine(line.key, "quantity", value)} />{purchaseOrder && <span title="Còn được nhận" className="text-xs tabular-nums text-[#858a80]">/ {purchaseOrderRemaining[String(line.variant.id)] ?? 0}</span>}</div></td>
                    <td className="px-4 py-4"><FormattedNumberInput className={`${INPUT} w-36`} min={0} value={line.cost} onChange={(value) => updateLine(line.key, "cost", value)} /></td>
                    <td className="px-4 py-4"><FormattedNumberInput ariaLabel={`Giảm giá mỗi sản phẩm ${line.product.title}`} className={`${INPUT} w-32`} min={0} value={line.discount} onChange={(value) => updateLine(line.key, "discount", value)} /></td>
                    <td className="px-4 py-4 text-right font-bold tabular-nums">{formatMoney(total)}</td>
                    <td className="px-4 py-4"><button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="grid h-9 w-9 place-items-center rounded-lg text-[#a4443c] hover:bg-[#fff0ee]" aria-label="Xóa sản phẩm"><i className="pi pi-trash" /></button></td>
                  </tr>;
                })}
                {lines.length === 0 && <tr><td colSpan={7} className="px-4 py-14 text-center"><i className="pi pi-inbox text-2xl text-[#a1a89a]" /><p className="mt-2 text-sm font-semibold">Chưa có sản phẩm</p><p className="mt-1 text-xs text-[#858a80]">Nhấn “Thêm” để tìm SKU và chọn biến thể.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
            <h2 className="mb-4 font-bold">Thông tin thêm</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nhân viên xử lý"><input className={`${INPUT} bg-[#f8f9f6] dark:bg-[#242820]`} readOnly value={session?.user?.name || ""} /></Field>
              <Field label="Mã tham chiếu"><input className={INPUT} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Mã đơn / chứng từ NCC" /></Field>
              <div className="sm:col-span-2"><Field label="Ghi chú"><textarea className="min-h-24 w-full rounded-lg border border-[#e1e5dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi chú cho phiếu nhập" /></Field></div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#e6e9df] bg-white p-5 dark:border-[#363b31] dark:bg-[#20231f]">
            <h2 className="mb-4 font-bold">Giá trị nhập</h2>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Tổng số lượng nhập" value={`${totalQuantity}`} />
              <SummaryRow label="Tổng tiền hàng" value={formatMoney(grossGoodsTotal)} />
              <SummaryRow label="Tổng giảm giá sản phẩm" value={formatMoney(lineDiscount)} />
              <NumberRow label="Chi phí khác (trả NCC)" value={supplierOtherCost} onChange={setSupplierOtherCost} />
              <SummaryRow label="Cần trả nhà cung cấp" value={formatMoney(supplierPayable)} strong />
              <NumberRow label="Chi phí nhập khác" value={otherImportCost} onChange={setOtherImportCost} />
              <SummaryRow label="Tổng giá trị nhập hàng" value={formatMoney(totalReceiveValue)} strong />
              <NumberRow label="Tiền trả NCC" value={supplierPaid} onChange={setSupplierPaid} />
              <NumberRow label="Tiền trả chi phí nhập khác" value={otherCostPaid} onChange={setOtherCostPaid} />
              <div className="border-t border-[#e6e9df] pt-3 dark:border-[#363b31]"><SummaryRow label="Còn nợ" value={formatMoney(outstanding)} strong /></div>
            </div>
            <p className="mt-4 rounded-xl bg-[#fff8e8] px-3 py-2 text-xs leading-5 text-[#826624]">Haravan Purchase Receive hiện chỉ công bố API GET để xem danh sách và chi tiết. Không gửi dữ liệu phiếu này qua Inventory Adjustment vì đó là API điều chỉnh tồn riêng.</p>
            <button type="button" disabled className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white opacity-50"><i className="pi pi-lock" /> Chưa hỗ trợ lưu phiếu nhập</button>
          </section>
        </div>

        {token && <PurchaseReceiveHistory token={token} orgId={currentShop.orgId} />}
      </div>
      {productPickerOpen && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setProductPickerOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="receive-product-picker-title" className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]">
          <header className="flex items-center justify-between border-b border-[#e6e9df] px-5 py-4 dark:border-[#363b31]"><div><h2 id="receive-product-picker-title" className="text-xl font-extrabold">Tất cả sản phẩm</h2><p className="mt-1 text-xs text-[#858a80]">Tồn theo {receivableLocations.find((location) => String(location.id) === selectedLocationId)?.name || "kho đang chọn"} · Đã chọn {pendingLines.length} biến thể</p></div><button type="button" aria-label="Đóng" onClick={() => setProductPickerOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-[#8d97a7] hover:bg-[#f3f5f8]"><i className="pi pi-times text-lg" /></button></header>
          <label className="relative m-4 mb-3 block"><i className="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-[#647084]" /><input autoFocus className="h-11 w-full rounded-xl border border-[#c8d8fa] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#5687e8] focus:ring-2 focus:ring-[#5687e8]/15 dark:border-[#40453b] dark:bg-[#191c18]" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Tìm theo tên sản phẩm, biến thể, SKU, Barcode" /></label>
          <div className="grid grid-cols-[36px_minmax(0,1fr)_minmax(100px,0.7fr)_90px_120px] gap-3 bg-[#f1f3f6] px-5 py-3 text-xs font-bold uppercase tracking-wide text-[#687386] dark:bg-[#191c18]"><span /><span>Sản phẩm / biến thể</span><span>SKU / số biến thể</span><span className="text-right">Tồn kho</span><span className="text-right">Đơn giá</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[#e8ebf0] dark:divide-[#363b31]">
            {searching && <p className="px-5 py-4 text-sm text-[#858a80]">Đang tải sản phẩm...</p>}
            {!searching && !searchError && searchResults.map((product) => {
              const productId = Number(product.id);
              const expanded = expandedProducts.has(productId);
              const variants = product.variants ?? [];
              const image = variants[0] ? variantImage(product, variants[0]) : undefined;
              const variantStocks = variants.map((variant) => pickerLocationStock[`${product.id}-${variant.id}`]);
              const productStock = !selectedLocationId
                ? "Chọn kho"
                : pickerStockLoading
                  ? "…"
                  : variantStocks.some((quantity) => quantity === -1)
                    ? "Lỗi"
                    : variantStocks.reduce((sum, quantity) => sum + (quantity ?? 0), 0);
              return <div key={product.id}>
                <button type="button" aria-expanded={expanded} onClick={() => toggleProduct(productId)} className="grid w-full grid-cols-[36px_minmax(0,1fr)_minmax(100px,0.7fr)_90px_120px] items-center gap-3 px-5 py-3 text-left transition hover:bg-[#f8f9fb] dark:hover:bg-[#30342e]"><span className="grid place-items-center"><i className={`pi ${expanded ? "pi-chevron-down" : "pi-chevron-right"} text-xs text-[#8a94a4]`} /></span><span className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#e4e8ee] bg-[#f7f8fa] dark:border-[#40453b]">{image ? <img src={image} alt="" className="h-full w-full object-cover" /> : <i className="pi pi-image text-[#9aa3b2]" />}</span><span className="truncate font-semibold">{product.title || `Sản phẩm ${productId}`}</span></span><span className="text-xs text-[#8993a3]">{variants.length} biến thể</span><span className="text-right text-sm tabular-nums">{productStock}</span><span className="text-right text-sm">{formatMoney(variants[0]?.price)}</span></button>
                {expanded && variants.map((variant) => {
                  const alreadySelected = pendingLines.some((line) => line.key === `${product.id}-${variant.id}`);
                  const orderRemaining = purchaseOrder ? purchaseOrderRemaining[String(variant.id)] ?? 0 : null;
                  const unavailableForOrder = orderRemaining !== null && orderRemaining <= 0;
                  const stock = pickerLocationStock[`${product.id}-${variant.id}`];
                  const stockLabel = !selectedLocationId ? "—" : pickerStockLoading ? "…" : stock === -1 ? "Lỗi" : stock ?? 0;
                  return <label key={variant.id} className={`grid grid-cols-[36px_minmax(0,1fr)_minmax(100px,0.7fr)_90px_120px] items-center gap-3 border-t border-[#edf0f4] bg-[#fbfcfd] px-5 py-2.5 text-sm transition dark:border-[#363b31] dark:bg-[#191c18] ${unavailableForOrder ? "cursor-not-allowed opacity-45" : "cursor-pointer hover:bg-[#f4f7fc] dark:hover:bg-[#252a22]"}`}><span className="grid place-items-center"><input type="checkbox" disabled={unavailableForOrder} checked={alreadySelected} aria-label={`${alreadySelected ? "Bỏ chọn" : "Chọn"} ${variantLabel(variant)}`} onChange={(event) => togglePendingVariant(product, variant, event.target.checked)} className="h-4 w-4 cursor-pointer accent-[#527b49]" /></span><span className="truncate">{variantLabel(variant)}{orderRemaining !== null && <small className="ml-2 text-[#858a80]">Còn {orderRemaining}</small>}</span><span className="truncate text-xs text-[#687386]">{variant.sku || "—"}</span><span className="text-right tabular-nums">{stockLabel}</span><span className="text-right">{formatMoney(variant.price)}</span></label>;
                })}
              </div>;
            })}
            {!searching && searchError && <p className="px-5 py-8 text-center text-sm text-[#aa382f]">{searchError}</p>}
            {!searching && !searchError && searchCompleted && searchResults.length === 0 && <p className="px-5 py-8 text-center text-sm text-[#858a80]">{productSearch.trim() ? "Không tìm thấy sản phẩm theo SKU/barcode này." : "Shop chưa có sản phẩm."}</p>}
          </div>
          <footer className="flex items-center justify-between border-t border-[#e6e9df] px-5 py-4 dark:border-[#363b31]"><span className="text-sm text-[#66705f]">{pendingLines.length} biến thể đã chọn</span><div className="flex gap-2"><button type="button" onClick={() => setProductPickerOpen(false)} className="h-10 rounded-lg border border-[#e1e5dc] px-4 text-sm font-semibold dark:border-[#40453b]">Hủy</button><button type="button" onClick={() => { setLines(pendingLines); setProductPickerOpen(false); }} className="h-10 rounded-lg bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a]">Hoàn tất</button></div></footer>
        </section>
      </div>}
    </HaravanShell>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 ${strong ? "font-bold" : "text-[#66705f] dark:text-[#c5cbbd]"}`}><span>{label}</span><span className="shrink-0 tabular-nums">{value}</span></div>;
}

function NumberRow({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="flex items-center justify-between gap-4 text-[#66705f] dark:text-[#c5cbbd]"><span>{label}</span><FormattedNumberInput className="h-8 w-32 rounded-lg border border-[#e1e5dc] bg-white px-2 text-right text-sm tabular-nums text-[#20231f] outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18] dark:text-[#f4f5ef]" min={0} value={value} onChange={onChange} /></label>;
}

function FormattedNumberInput({
  value,
  onChange,
  className,
  min = 0,
  step,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  className: string;
  min?: number;
  step?: number;
  ariaLabel?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(formatNumericValue(value));

  useEffect(() => {
    if (!editing) setDraft(formatNumericValue(value));
  }, [editing, value]);

  return <input
    aria-label={ariaLabel}
    className={className}
    type="text"
    inputMode={step === 1 ? "numeric" : "decimal"}
    min={min}
    value={draft}
    onFocus={() => { setEditing(true); setDraft(String(value)); }}
    onChange={(event) => {
      const raw = event.target.value;
      setDraft(raw);
      const normalized = raw.trim().replace(/\./g, "").replace(",", ".");
      if (!normalized) return;
      const parsed = Number(normalized);
      if (Number.isFinite(parsed) && parsed >= min) onChange(step === 1 ? Math.trunc(parsed) : parsed);
    }}
    onBlur={() => { setEditing(false); setDraft(formatNumericValue(value)); }}
  />;
}

function formatNumericValue(value: number): string {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value || 0);
}

function PurchaseReceiveHistory({ token, orgId }: { token: string; orgId: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HaravanPurchaseReceive[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<HaravanPurchaseReceive | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    listPurchaseReceives(token, orgId, { page, limit: pageSize })
      .then((result) => {
        if (!cancelled) setItems(result.purchase_receives ?? []);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setItems([]);
          setError(requestError instanceof Error ? requestError.message : "Không tải được lịch sử nhập hàng.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, page, token, orgId]);

  async function showDetail(id: number) {
    setDetailLoading(true);
    try {
      const result = await getPurchaseReceive(token, orgId, id);
      setDetail(result.purchase_receive);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được chi tiết phiếu nhập.");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e6e9df] bg-white dark:border-[#363b31] dark:bg-[#20231f]">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span><span className="block font-bold">Lịch sử nhập hàng</span><span className="mt-1 block text-xs text-[#858a80]">Phiếu nhập đã tạo trên Haravan</span></span>
        <i className={`pi ${open ? "pi-chevron-up" : "pi-chevron-down"}`} aria-hidden="true" />
      </button>
      {open && <div className="border-t border-[#eef0ea] dark:border-[#363b31]">
        {loading ? <p className="px-5 py-8 text-center text-sm text-[#858a80]">Đang tải lịch sử...</p> : error ? <p className="px-5 py-5 text-sm text-[#aa382f]">{error}</p> : items.length === 0 ? <p className="px-5 py-8 text-center text-sm text-[#858a80]">Chưa có phiếu nhập nào.</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-[#f8f9f6] text-left text-xs font-bold uppercase text-[#66705f] dark:bg-[#191c18] dark:text-[#c5cbbd]"><tr><th className="px-4 py-3">Mã phiếu</th><th className="px-4 py-3">Ngày nhập</th><th className="px-4 py-3">Nhà cung cấp</th><th className="px-4 py-3">Kho</th><th className="px-4 py-3 text-right">Số lượng</th><th className="px-4 py-3 text-right">Tổng tiền</th><th className="px-4 py-3">Trạng thái</th><th /></tr></thead>
            <tbody className="divide-y divide-[#eef0ea] dark:divide-[#363b31]">{items.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.receive_number || `#${item.id}`}</td><td className="px-4 py-3">{item.received_at ? new Date(item.received_at).toLocaleDateString("vi-VN") : "—"}</td><td className="px-4 py-3">{item.supplier?.name || "—"}</td><td className="px-4 py-3">{item.location?.name || "—"}</td><td className="px-4 py-3 text-right tabular-nums">{item.total ?? 0}</td><td className="px-4 py-3 text-right tabular-nums">{formatMoney(item.total_cost)}</td><td className="px-4 py-3">{item.status || "—"}</td><td className="px-4 py-3"><button type="button" onClick={() => void showDetail(item.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-[#527b49] hover:bg-[#f3f5ef]">Chi tiết</button></td></tr>)}</tbody>
          </table>
        </div>}
        <div className="flex items-center justify-between border-t border-[#eef0ea] px-5 py-3 text-xs dark:border-[#363b31]"><span className="text-[#858a80]">Trang {page}</span><div className="flex gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Trước</button><button type="button" disabled={items.length < pageSize || loading} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#e1e5dc] px-3 py-2 disabled:opacity-40 dark:border-[#40453b]">Sau</button></div></div>
      </div>}
      {detail && <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}><section role="dialog" aria-modal="true" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#20231f]"><header className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-[#71836a]">Chi tiết phiếu nhập</p><h2 className="mt-1 text-xl font-extrabold">{detail.receive_number || `#${detail.id}`}</h2></div><button type="button" onClick={() => setDetail(null)} aria-label="Đóng" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-[#f1f3ee]"><i className="pi pi-times" /></button></header>{detailLoading ? <p className="py-8 text-center text-sm text-[#858a80]">Đang tải...</p> : <><div className="mt-5 grid gap-3 sm:grid-cols-2"><SummaryRow label="Trạng thái" value={detail.status || "—"} /><SummaryRow label="Ngày nhập" value={detail.received_at ? new Date(detail.received_at).toLocaleString("vi-VN") : "—"} /><SummaryRow label="Nhà cung cấp" value={detail.supplier?.name || "—"} /><SummaryRow label="Kho" value={detail.location?.name || "—"} /><SummaryRow label="Mã tham chiếu" value={detail.ref_number || "—"} /><SummaryRow label="Tổng số lượng" value={String(detail.total ?? 0)} /><SummaryRow label="Tổng tiền" value={formatMoney(detail.total_cost)} /></div>{detail.notes && <p className="mt-4 rounded-xl bg-[#f8f9f6] p-3 text-sm dark:bg-[#191c18]">{detail.notes}</p>}<div className="mt-5 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-[#858a80]"><th className="py-2">Sản phẩm</th><th className="py-2">SKU</th><th className="py-2 text-right">SL</th><th className="py-2 text-right">Đơn giá</th></tr></thead><tbody>{asArray(detail.line_items).map((line, index) => <tr key={line.id ?? index} className="border-b border-[#eef0ea] dark:border-[#363b31]"><td className="py-3">{line.name || line.title || `Sản phẩm #${line.product_id ?? "—"}`}</td><td className="py-3">{line.sku || "—"}</td><td className="py-3 text-right">{line.quantity ?? 0}</td><td className="py-3 text-right">{formatMoney(line.cost ?? line.price)}</td></tr>)}</tbody></table></div></>}</section></div>}
    </section>
  );
}



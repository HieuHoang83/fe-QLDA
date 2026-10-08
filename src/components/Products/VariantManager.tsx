"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  createVariant,
  deleteVariant,
  updateVariant,
  type VariantPayload,
} from "@/services/api/variants";
import {
  listInventoryLocations,
  listLocations,
  locationAddress,
  isVirtualLocation,
  type HaravanLocation,
} from "@/services/api/locations";
import {
  updateProduct,
  type HaravanProduct,
  type HaravanProductVariant,
  type HaravanProductOption,
} from "@/services/api/products";
import {
  formatMoney,
  isOutOfStock,
  variantImage,
  variantLabel,
} from "@/lib/haravan-format";

const MAX_VARIANTS = 100;

interface NewOption {
  position: number;
  name: string;
}

interface VariantSavePayload {
  form: VariantFormState;
  newOptions: NewOption[];
}

interface VariantFormState {
  sku: string;
  option1: string;
  option2: string;
  option3: string;
  price: string;
  compare_at_price: string;
  barcode: string;
  grams: string;
  inventory_management: string;
  inventory_policy: string;
  requires_shipping: boolean;
  taxable: boolean;
  image_id: string;
  unit: string;
}

function emptyForm(): VariantFormState {
  return {
    sku: "",
    option1: "",
    option2: "",
    option3: "",
    price: "",
    compare_at_price: "",
    barcode: "",
    grams: "",
    inventory_management: "haravan",
    inventory_policy: "continue",
    requires_shipping: true,
    taxable: true,
    image_id: "",
    unit: "",
  };
}

function baseUnit(variant?: HaravanProductVariant | null): string {
  return variant?.variant_units?.find((item) => item.base)?.unit ?? "";
}

function fromVariant(variant: HaravanProductVariant): VariantFormState {
  return {
    sku: variant.sku ?? "",
    option1: variant.option1 ?? "",
    option2: variant.option2 ?? "",
    option3: variant.option3 ?? "",
    price: String(variant.price ?? ""),
    compare_at_price:
      variant.compare_at_price == null ? "" : String(variant.compare_at_price),
    barcode: variant.barcode ?? "",
    grams: variant.grams == null ? "" : String(variant.grams),
    inventory_management: variant.inventory_management ?? "haravan",
    inventory_policy: variant.inventory_policy ?? "continue",
    requires_shipping: variant.requires_shipping ?? true,
    taxable: variant.taxable ?? true,
    image_id: variant.image_id == null ? "" : String(variant.image_id),
    unit: baseUnit(variant),
  };
}

function optionName(
  product: HaravanProduct,
  position: number
): string {
  return (
    product.options?.find((option) => option.position === position)?.name ??
    (position === 1 ? "Option 1" : position === 2 ? "Option 2" : "Option 3")
  );
}

function toPayload(form: VariantFormState, hadUnits: boolean): VariantPayload {
  const toNumber = (value: string): number | undefined => {
    if (value.trim() === "") return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  };
  const unit = form.unit.trim();
  const variant_units =
    unit !== ""
      ? [
          {
            id: 0,
            unit,
            base: true,
            sellable: true,
            ratio: 1,
            price: toNumber(form.price),
            sku: form.sku.trim() || undefined,
            barcode: form.barcode.trim() || undefined,
          },
        ]
      : hadUnits
        ? []
        : undefined;
  return {
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || undefined,
    option1: form.option1.trim() || undefined,
    option2: form.option2.trim() || undefined,
    option3: form.option3.trim() || undefined,
    price: toNumber(form.price),
    compare_at_price: toNumber(form.compare_at_price),
    grams: toNumber(form.grams),
    inventory_management: form.inventory_management,
    inventory_policy: form.inventory_policy,
    requires_shipping: form.requires_shipping,
    taxable: form.taxable,
    image_id: form.image_id.trim() === "" ? null : Number(form.image_id),
    variant_units,
  };
}

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

function VariantFormDialog({
  product,
  variant,
  token,
  orgId,
  saving,
  onClose,
  onSave,
}: {
  product: HaravanProduct;
  variant: HaravanProductVariant | null;
  token: string | undefined;
  orgId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: VariantSavePayload) => void;
}) {
  const locale = useLocale();
  const [form, setForm] = useState<VariantFormState>(() =>
    variant ? fromVariant(variant) : emptyForm()
  );
  const [locations, setLocations] = useState<HaravanLocation[]>([]);
  const [locationsReady, setLocationsReady] = useState(false);
  const [locationQty, setLocationQty] = useState<Record<number, number>>({});
  const [variantLocationIds, setVariantLocationIds] = useState<number[]>([]);

  const set = (field: keyof VariantFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!token || !orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await listLocations(token, orgId);
        if (!cancelled) setLocations(result.locations ?? []);
      } catch {
        if (!cancelled) setLocations([]);
      } finally {
        if (!cancelled) setLocationsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  useEffect(() => {
    if (!token || !orgId || !locationsReady) return;
    if (!variant?.id) {
      setVariantLocationIds([]);
      return;
    }
    if (locations.length === 0) {
      setVariantLocationIds([]);
      setLocationQty({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await listInventoryLocations(token, orgId, {
          variant_ids: String(variant.id),
          location_ids: locations
            .filter((location) => !isVirtualLocation(location))
            .map((location) => location.id)
            .join(","),
        });
        if (cancelled) return;
        const map: Record<number, number> = {};
        for (const item of result.inventory_locations ?? []) {
          if (
            item.loc_id != null &&
            item.variant_id === variant.id &&
            !isVirtualLocation(
              locations.find((location) => location.id === item.loc_id) ?? {
                id: item.loc_id,
              }
            ) &&
            (item.product_id == null || item.product_id === product.id)
          ) {
            map[item.loc_id] = item.qty_onhand ?? 0;
          }
        }
        setVariantLocationIds(Object.keys(map).map(Number));
        setLocationQty(map);
      } catch {
        if (!cancelled) {
          setVariantLocationIds([]);
          setLocationQty({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, orgId, locations, locationsReady, variant?.id, product.id]);

  // Stock is read-only here; new stock must be received through inventory.
  const variantLocations = variant
    ? locations.filter(
        (location) =>
          !isVirtualLocation(location) &&
          variantLocationIds.includes(location.id)
      )
    : [];
  const hasLocationRows = variantLocations.length > 0;
  const locationTotal = hasLocationRows
    ? variantLocations.reduce(
        (sum, location) => sum + (locationQty[location.id] ?? 0),
        0
      )
    : undefined;

  const takenPositions = new Set(
    (product.options ?? []).map((option) => option.position ?? 0)
  );
  const optionSlots = [
    ...(product.options ?? []).map((option, index) => ({
      position: option.position ?? index + 1,
      name: option.name || `Lựa chọn ${option.position ?? index + 1}`,
      fixed: true,
    })),
  ].sort((a, b) => a.position - b.position);

  const price = Number(form.price);
  const compare = Number(form.compare_at_price);
  const tracking = form.inventory_management !== "";
  const discount =
    Number.isFinite(price) &&
    Number.isFinite(compare) &&
    compare > 0 &&
    compare > price
      ? Math.round(((compare - price) / compare) * 100)
      : 0;
  const previewImage = product.images?.find(
    (image) => String(image.id) === form.image_id
  )?.src;
  const availableStock =
    variant?.inventory_advance?.qty_available ??
    variant?.inventory_quantity ??
    (tracking ? 0 : undefined);
  const titlePreview =
    [form.option1, form.option2, form.option3]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" / ") ||
    (variant?.title && variant.title !== "Default Title"
      ? variant.title
      : "Mặc định");

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-form-title"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">
              {variant ? "Cập nhật biến thể" : "Biến thể mới"}
            </p>
            <h2 id="variant-form-title" className="mt-1 truncate text-xl font-extrabold">
              {variant ? variantLabel(variant) : product.title || `Sản phẩm #${product.id}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#f1f3ee] dark:hover:bg-[#30342e]"
          >
            <i className="pi pi-times" aria-hidden="true" />
          </button>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              form,
              newOptions: [],
            });
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          <fieldset className="rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
            <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              <i className="pi pi-tag" aria-hidden="true" />
              Thuộc tính
            </legend>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_168px]">
              <div className="space-y-4">
                <div className="space-y-4">
                  {optionSlots.map((slot) => (
                    <div key={slot.position}>
                      {slot.fixed ? (
                        <label className="block">
                          <span className="mb-1.5 block text-sm font-semibold">
                            {slot.name}
                          </span>
                          <input
                            type="text"
                            required
                            value={
                              form[`option${slot.position}` as "option1"] ?? ""
                            }
                            onChange={(event) =>
                              set(
                                `option${slot.position}` as "option1",
                                event.target.value
                              )
                            }
                            placeholder={slot.name}
                            className={INPUT_CLASS}
                          />
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-[#858a80]">
                  Thuộc tính biến thể được lấy từ thuộc tính sản phẩm.
                </p>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Tiêu đề</span>
                  <input
                    type="text"
                    readOnly
                    value={titlePreview}
                    className={`${INPUT_CLASS} cursor-not-allowed bg-[#f1f3ee] text-[#596052] dark:bg-[#252923] dark:text-[#d3d8ce]`}
                  />
                  <span className="mt-1 block text-xs text-[#858a80]">
                    Tên hiển thị của biến thể, tự ghép từ các lựa chọn ở trên.
                  </span>
                </label>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-semibold">Ảnh</span>
                <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-[#e5e7df] bg-white dark:border-[#40453b] dark:bg-[#191c18]">
                  {previewImage ? (
                    <img src={previewImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <i className="pi pi-image text-3xl text-[#b6bcb0]" aria-hidden="true" />
                  )}
                </div>
                <select
                  value={form.image_id}
                  onChange={(event) => set("image_id", event.target.value)}
                  aria-label="Chọn ảnh cho biến thể"
                  className={`${INPUT_CLASS} mt-2 h-10`}
                >
                  <option value="">Ảnh mặc định</option>
                  {(product.images ?? []).map((image) => (
                    <option key={image.id} value={String(image.id)}>
                      Ảnh #{image.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
            <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              <i className="pi pi-tags" aria-hidden="true" />
              Chi tiết biến thể
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Giá bán</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.price}
                    onChange={(event) => set("price", event.target.value)}
                    className={`${INPUT_CLASS} pr-9`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                    ₫
                  </span>
                </div>
                <span className="mt-1 block text-xs text-[#858a80]">
                  Số tiền khách cần thanh toán.
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Giá so sánh</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={form.compare_at_price}
                    onChange={(event) => set("compare_at_price", event.target.value)}
                    className={`${INPUT_CLASS} pr-9`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                    ₫
                  </span>
                </div>
                <span className="mt-1 block text-xs text-[#858a80]">
                  Giá trước khi giảm — thể hiện mức giảm giá, ưu đãi cho khách.
                </span>
              </label>
            </div>

            {discount > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#e8f4e9] px-3 py-1 text-xs font-bold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                <i className="pi pi-percentage" aria-hidden="true" />
                Đang giảm {discount}% — khách trả {formatMoney(price)}
              </p>
            )}

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
              <input
                type="checkbox"
                checked={form.taxable}
                onChange={(event) => set("taxable", event.target.checked)}
                className="h-4 w-4 accent-[#527b49]"
              />
              <span className="text-sm font-semibold">Tính thuế cho biến thể này</span>
            </label>
          </fieldset>


          <fieldset className="rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
            <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              <i className="pi pi-box" aria-hidden="true" />
              Quản lý tồn kho
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">SKU</span>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => set("sku", event.target.value)}
                  placeholder="Mã hàng nội bộ"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Barcode</span>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(event) => set("barcode", event.target.value)}
                  placeholder="Mã vạch"
                  className={INPUT_CLASS}
                />
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
              <input
                type="checkbox"
                checked={tracking}
                onChange={(event) =>
                  set("inventory_management", event.target.checked ? "haravan" : "")
                }
                className="mt-0.5 h-4 w-4 accent-[#527b49]"
              />
              <span>
                <span className="block text-sm font-semibold">Có quản lý tồn kho</span>
                <span className="block text-xs text-[#858a80]">
                  Bật để Haravan theo dõi số lượng và kho hàng của biến thể này.
                </span>
              </span>
            </label>

            {tracking ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#858a80]">Tồn kho khả dụng</p>
                    <p className="mt-1 text-lg font-extrabold tabular-nums">{availableStock ?? 0}</p>
                  </div>
                  {hasLocationRows && (
                    <div className="rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#858a80]">Tổng tồn tại các kho</p>
                      <p className="mt-1 text-lg font-extrabold tabular-nums">{locationTotal ?? 0}</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce8d6] bg-[#f5f9f2] px-4 py-3 dark:border-[#394633] dark:bg-[#20291d]">
                  <p className="text-sm text-[#596052] dark:text-[#d3d8ce]">Muốn thay đổi số lượng, hãy tạo phiếu nhập hàng trong quản lý tồn kho.</p>
                  <Link href={`/${locale}/inventory/receives`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#527b49] px-3 text-sm font-bold text-white hover:bg-[#41643a]">
                    <i className="pi pi-plus" aria-hidden="true" /> Nhập hàng
                  </Link>
                </div>

                {hasLocationRows && (
                  <div className="space-y-2">
                    <span className="block text-sm font-semibold">Tồn theo kho</span>
                    {variantLocations.map((location) => (
                      <div key={location.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{location.name || `Kho #${location.id}`}</p>
                          <p className="truncate text-xs text-[#858a80]">{locationAddress(location) || "Chưa có địa chỉ"}</p>
                        </div>
                        <span className="shrink-0 text-sm font-extrabold tabular-nums">{locationQty[location.id] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                  <input type="checkbox" checked={form.inventory_policy === "continue"} onChange={(event) => set("inventory_policy", event.target.checked ? "continue" : "deny")} className="mt-0.5 h-4 w-4 accent-[#527b49]" />
                  <span>
                    <span className="block text-sm font-semibold">Cho phép đặt hàng khi hết hàng</span>
                    <span className="block text-xs text-[#858a80]">Khách vẫn có thể mua khi tồn kho về 0.</span>
                  </span>
                </label>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-[#d8ddd3] px-4 py-3 text-sm text-[#858a80] dark:border-[#40453b]">Không theo dõi tồn kho — biến thể này luôn cho phép đặt hàng.</p>
            )}          </fieldset>


          <fieldset className="rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
            <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              <i className="pi pi-truck" aria-hidden="true" />
              Vận chuyển
            </legend>

            <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
              <input
                type="checkbox"
                checked={form.requires_shipping}
                onChange={(event) => set("requires_shipping", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#527b49]"
              />
              <span>
                <span className="block text-sm font-semibold">Cần giao hàng</span>
                <span className="block text-xs text-[#858a80]">
                  Chọn để cho phép giao hàng với sản phẩm này.
                </span>
              </span>
            </label>

            {form.requires_shipping && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-sm font-semibold">Khối lượng</span>
                <div className="relative sm:w-56">
                  <input
                    type="number"
                    min={0}
                    value={form.grams}
                    onChange={(event) => set("grams", event.target.value)}
                    placeholder="0"
                    className={`${INPUT_CLASS} pr-16`}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                    grams
                  </span>
                </div>
                <span className="mt-1 block text-xs text-[#858a80]">
                  Dùng cho tính phí vận chuyển.
                </span>
              </label>
            )}
          </fieldset>

          <fieldset className="rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
            <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              <i className="pi pi-inbox" aria-hidden="true" />
              Đơn vị tính
            </legend>
            <p className="text-xs text-[#858a80]">
              Biến thể có nhiều đơn vị tính (ví dụ: lon, lốc, thùng...).
            </p>
            <label className="mt-3 block sm:w-72">
              <span className="mb-1.5 block text-sm font-semibold">Đơn vị cơ bản</span>
              <input
                type="text"
                value={form.unit}
                onChange={(event) => set("unit", event.target.value)}
                placeholder="Nhập đơn vị cơ bản"
                className={INPUT_CLASS}
              />
              <span className="mt-1 block text-xs text-[#858a80]">
                Đơn vị nhỏ nhất dùng để tính tồn kho, ví dụ: cái, lon, hộp.
              </span>
            </label>
          </fieldset>
        </form>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <p className="text-sm text-[#858a80]">
            Giá hiện tại:{" "}
            <span className="font-bold text-[#20231f] dark:text-[#f4f5ef]">
              {Number.isFinite(price) && price >= 0 ? formatMoney(price) : "—"}
            </span>
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-[#e1e5dc] px-5 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#527b49] px-5 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-wait disabled:opacity-60"
            >
              {saving && <i className="pi pi-spin pi-spinner" aria-hidden="true" />}
              Lưu biến thể
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function VariantManager({
  product,
  token,
  orgId,
  onReload,
}: {
  product: HaravanProduct;
  token: string | undefined;
  orgId: string;
  onReload: () => Promise<void>;
}) {
  const variants = useMemo(() => product.variants ?? [], [product.variants]);
  const [editing, setEditing] = useState<HaravanProductVariant | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<HaravanProductVariant | null>(null);
  const [saving, setSaving] = useState(false);

  const atLimit = variants.length >= MAX_VARIANTS;

  const usedKeys = useMemo(
    () =>
      new Set(
        variants
          .filter((variant) => variant.id !== editing?.id)
          .map((variant) => variantLabel(variant).toLowerCase())
      ),
    [variants, editing]
  );

  async function handleSave({
    form,
    newOptions,
  }: VariantSavePayload) {
    if (!token || !product.id) return;

    if (!Number.isFinite(Number(form.price)) || Number(form.price) < 0) {
      toast.error("Giá bán phải là số >= 0.");
      return;
    }

    const key = [form.option1, form.option2, form.option3]
      .filter((value) => Boolean(value && value.trim()))
      .join(" / ")
      .toLowerCase();
    if (key && usedKeys.has(key)) {
      toast.error("Đã tồn tại biến thể có cùng tổ hợp lựa chọn.");
      return;
    }

    const payload = toPayload(form, Boolean(editing?.variant_units?.length));
    setSaving(true);
    try {
      if (newOptions.length > 0) {
        const merged: HaravanProductOption[] = [
          ...(product.options ?? []),
          ...newOptions
            .filter((option) => option.name.trim())
            .map((option) => ({
              name: option.name.trim(),
              position: option.position,
              product_id: product.id,
            })),
        ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        await updateProduct(token, orgId, product.id, { options: merged });
      }

      if (editing?.id) {
        await updateVariant(token, orgId, editing.id, payload);
        toast.success("Đã cập nhật biến thể.");
      } else {
        await createVariant(token, orgId, product.id, payload);
        toast.success("Đã tạo biến thể mới.");
      }
      setEditing(null);
      setAdding(false);
      await onReload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không lưu được biến thể."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!token || !product.id || !deleting?.id) return;
    setSaving(true);
    try {
      await deleteVariant(token, orgId, product.id, deleting.id);
      toast.success("Đã xóa biến thể.");
      setDeleting(null);
      await onReload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không xóa được biến thể."
      );
    } finally {
      setSaving(false);
    }
  }

  const openCreate = () => {
    setEditing(null);
    setAdding(true);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-[#e8e9e2] bg-white shadow-[0_4px_24px_rgba(30,40,25,0.045)] dark:border-[#363b31] dark:bg-[#20231f]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeefe9] px-5 py-4 dark:border-[#363b31] sm:px-6">
        <div>
          <h2 className="flex items-center gap-2 font-extrabold">
            <i className="pi pi-th-large text-[#71836a]" aria-hidden="true" />
            Biến thể
          </h2>
          <p className="mt-0.5 text-sm text-[#858a80] dark:text-[#aeb4a8]">
            {variants.length}/{MAX_VARIANTS} biến thể — mỗi biến thể là một phiên
            bản khách có thể mua.
          </p>
        </div>
        <button
          type="button"
          disabled={atLimit || !token}
          onClick={openCreate}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#527b49] px-4 text-sm font-bold text-white hover:bg-[#41643a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <i className="pi pi-plus" aria-hidden="true" />
          Thêm biến thể
        </button>
      </header>

      {variants.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <i className="pi pi-th-large text-3xl text-[#99a28f]" aria-hidden="true" />
          <p className="mt-3 font-semibold">Sản phẩm chưa có biến thể</p>
          <p className="mt-1 text-sm text-[#858a80]">
            Bấm “Thêm biến thể” để tạo phiên bản đầu tiên.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-[#fafbf8] text-[11px] font-bold uppercase tracking-[0.12em] text-[#848a7f] dark:bg-[#252923] dark:text-[#aeb4a8]">
                <th className="px-4 py-3">Biến thể</th>
                <th className="px-4 py-3 text-right">Giá</th>
                <th className="px-4 py-3 text-right">Giá gạch</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3 text-right">Tồn kho</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => {
                const out = isOutOfStock(variant);
                const stock = variant.inventory_management
                  ? variant.inventory_quantity ?? 0
                  : undefined;
                return (
                  <tr
                    key={variant.id ?? variant.sku ?? variant.title}
                    className="border-b border-[#f0f1ec] hover:bg-[#fcfcfa] dark:border-[#363b31] dark:hover:bg-[#252923]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#eef0ea] bg-[#fbfbf9] dark:border-[#363b31] dark:bg-[#191c18]">
                          {variantImage(product, variant) ? (
                            <img
                              src={variantImage(product, variant)}
                              alt={variantLabel(variant)}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <i className="pi pi-image text-[#b6bcb0]" aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <span className="block font-semibold">
                            {variantLabel(variant)}
                          </span>
                          {variant.title && variant.title !== "Default Title" && (
                            <span className="block text-xs text-[#969b91]">
                              {variant.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {formatMoney(variant.price)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#969b91]">
                      {variant.compare_at_price != null &&
                      Number(variant.compare_at_price) > 0
                        ? formatMoney(variant.compare_at_price)
                        : "—"}
                    </td>
                    <td className="px-4 py-3">{variant.sku || "—"}</td>
                    <td className="px-4 py-3">{variant.barcode || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {stock === undefined ? "—" : stock}
                    </td>
                    <td className="px-4 py-3">
                      {out ? (
                        <span className="inline-flex rounded-full bg-[#f0d6d2] px-3 py-1 text-xs font-semibold text-[#aa382f] dark:bg-[#54312d] dark:text-[#ffb7af]">
                          Hết hàng
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-[#e8f4e9] px-3 py-1 text-xs font-semibold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                          Đang bán
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(variant);
                            setAdding(false);
                          }}
                          disabled={!token}
                          aria-label={`Sửa biến thể ${variantLabel(variant)}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#e5e7df] text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-40 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                        >
                          <i className="pi pi-pencil" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(variant)}
                          disabled={!token}
                          aria-label={`Xóa biến thể ${variantLabel(variant)}`}
                          className="grid h-9 w-9 place-items-center rounded-lg border border-[#e9d8d4] text-[#aa382f] hover:bg-[#fff7f5] disabled:opacity-40 dark:border-[#54312d] dark:text-[#ffb7af] dark:hover:bg-[#382321]"
                        >
                          <i className="pi pi-trash" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(adding || editing) && (
        <VariantFormDialog
          product={product}
          variant={editing}
          token={token}
          orgId={orgId}
          saving={saving}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(payload) => void handleSave(payload)}
        />
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDeleting(null);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="variant-delete-title"
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
          >
            <header className="border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
              <h2 id="variant-delete-title" className="text-lg font-extrabold">
                Xóa biến thể
              </h2>
            </header>
            <div className="px-6 py-5 text-sm text-[#596052] dark:text-[#d3d8ce]">
              Bạn chắc chắn muốn xóa biến thể{" "}
              <span className="font-bold text-[#20231f] dark:text-[#f4f5ef]">
                {deleting && variantLabel(deleting)}
              </span>{" "}
              khỏi sản phẩm <span className="font-semibold">{product.title}</span>?
              Hành động này không thể hoàn tác.
            </div>
            <footer className="flex justify-end gap-3 border-t border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="h-11 rounded-xl border border-[#e1e5dc] px-5 text-sm font-semibold text-[#596052] hover:bg-[#f3f5ef] dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#b3423a] px-5 text-sm font-bold text-white hover:bg-[#93362f] disabled:cursor-wait disabled:opacity-60"
              >
                {saving && <i className="pi pi-spin pi-spinner" aria-hidden="true" />}
                Xóa
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}

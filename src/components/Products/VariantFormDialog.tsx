"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  isVirtualLocation,
  listInventoryLocations,
  listLocations,
  locationAddress,
  type HaravanLocation,
} from "@/services/api/locations";
import {
  type HaravanProduct,
  type HaravanProductVariant,
} from "@/services/api/products";
import {
  formatMoney,
  isOutOfStock,
  variantImage,
  variantLabel,
} from "@/lib/haravan-format";
import {
  emptyForm,
  fromVariant,
  optionName,
  toPayload,
  type NewOption,
  type VariantFormState,
  type VariantSavePayload,
} from "./variant.form";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

export function VariantFormDialog({
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



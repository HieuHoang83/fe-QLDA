"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createVariant,
  deleteVariant,
  updateVariant,
  type VariantPayload,
} from "@/services/api/variants";
import type {
  HaravanProduct,
  HaravanProductVariant,
} from "@/services/api/products";
import {
  formatMoney,
  isOutOfStock,
  variantImage,
  variantLabel,
} from "@/lib/haravan-format";

const MAX_VARIANTS = 100;

interface VariantFormState {
  sku: string;
  option1: string;
  option2: string;
  option3: string;
  price: string;
  compare_at_price: string;
  barcode: string;
  grams: string;
  inventory_quantity: string;
  inventory_management: string;
  inventory_policy: string;
  requires_shipping: boolean;
  taxable: boolean;
  image_id: string;
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
    inventory_quantity: "0",
    inventory_management: "haravan",
    inventory_policy: "continue",
    requires_shipping: true,
    taxable: true,
    image_id: "",
  };
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
    inventory_quantity: String(variant.inventory_quantity ?? 0),
    inventory_management: variant.inventory_management ?? "haravan",
    inventory_policy: variant.inventory_policy ?? "continue",
    requires_shipping: variant.requires_shipping ?? true,
    taxable: variant.taxable ?? true,
    image_id: variant.image_id == null ? "" : String(variant.image_id),
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

function toPayload(form: VariantFormState): VariantPayload {
  const toNumber = (value: string): number | undefined => {
    if (value.trim() === "") return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  };
  return {
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || undefined,
    option1: form.option1.trim() || undefined,
    option2: form.option2.trim() || undefined,
    option3: form.option3.trim() || undefined,
    price: toNumber(form.price),
    compare_at_price: toNumber(form.compare_at_price),
    grams: toNumber(form.grams),
    inventory_quantity: toNumber(form.inventory_quantity),
    inventory_management: form.inventory_management,
    inventory_policy: form.inventory_policy,
    requires_shipping: form.requires_shipping,
    taxable: form.taxable,
    image_id: form.image_id.trim() === "" ? null : Number(form.image_id),
  };
}

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

function VariantFormDialog({
  product,
  variant,
  saving,
  onClose,
  onSave,
}: {
  product: HaravanProduct;
  variant: HaravanProductVariant | null;
  saving: boolean;
  onClose: () => void;
  onSave: (form: VariantFormState) => void;
}) {
  const [form, setForm] = useState<VariantFormState>(() =>
    variant ? fromVariant(variant) : emptyForm()
  );
  const set = (field: keyof VariantFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const price = Number(form.price);

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
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
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
            onSave(form);
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          {(product.options?.length ?? 0) > 0 && (
            <fieldset className="rounded-2xl border border-[#e8e9e2] p-4 dark:border-[#363b31]">
              <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
                Lựa chọn (option)
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {(product.options ?? []).slice(0, 3).map((option, index) => (
                  <label key={option.id ?? option.position} className="block">
                    <span className="mb-1.5 block text-sm font-semibold">
                      {option.name || `Lựa chọn ${option.position ?? index + 1}`}
                    </span>
                    <input
                      type="text"
                      required
                      value={form[`option${index + 1}` as "option1"]}
                      onChange={(event) =>
                        set(`option${index + 1}` as "option1", event.target.value)
                      }
                      placeholder={
                        option.name || `option${index + 1}`
                      }
                      className={INPUT_CLASS}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="rounded-2xl border border-[#e8e9e2] p-4 dark:border-[#363b31]">
            <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              Giá & Mã
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Giá bán (₫)</span>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price}
                  onChange={(event) => set("price", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Giá gạch (₫)</span>
                <input
                  type="number"
                  min={0}
                  value={form.compare_at_price}
                  onChange={(event) => set("compare_at_price", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">SKU</span>
                <input
                  type="text"
                  value={form.sku}
                  onChange={(event) => set("sku", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Barcode</span>
                <input
                  type="text"
                  value={form.barcode}
                  onChange={(event) => set("barcode", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-[#e8e9e2] p-4 dark:border-[#363b31]">
            <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
              Tồn kho & Vận chuyển
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Theo dõi tồn kho</span>
                <select
                  value={form.inventory_management}
                  onChange={(event) => set("inventory_management", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="haravan">haravan — Haravan theo dõi</option>
                  <option value="">blank — Không theo dõi</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Số lượng tồn</span>
                <input
                  type="number"
                  min={0}
                  value={form.inventory_quantity}
                  onChange={(event) => set("inventory_quantity", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Chính sách khi hết hàng</span>
                <select
                  value={form.inventory_policy}
                  onChange={(event) => set("inventory_policy", event.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="continue">continue — Cho phép đặt tiếp</option>
                  <option value="deny">deny — Từ chối đặt hàng</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Cân nặng (gram)</span>
                <input
                  type="number"
                  min={0}
                  value={form.grams}
                  onChange={(event) => set("grams", event.target.value)}
                  className={INPUT_CLASS}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[#e8e9e2] px-4 py-3 dark:border-[#363b31]">
                <input
                  type="checkbox"
                  checked={form.requires_shipping}
                  onChange={(event) => set("requires_shipping", event.target.checked)}
                  className="h-4 w-4 accent-[#527b49]"
                />
                <span className="text-sm font-semibold">Cần giao hàng</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-[#e8e9e2] px-4 py-3 dark:border-[#363b31]">
                <input
                  type="checkbox"
                  checked={form.taxable}
                  onChange={(event) => set("taxable", event.target.checked)}
                  className="h-4 w-4 accent-[#527b49]"
                />
                <span className="text-sm font-semibold">Tính thuế</span>
              </label>
            </div>
          </fieldset>

          {(product.images?.length ?? 0) > 0 && (
            <fieldset className="rounded-2xl border border-[#e8e9e2] p-4 dark:border-[#363b31]">
              <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
                Ảnh
              </legend>
              <select
                value={form.image_id}
                onChange={(event) => set("image_id", event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Không gắn ảnh riêng</option>
                {(product.images ?? []).map((image) => (
                  <option key={image.id} value={String(image.id)}>
                    #{image.id} — {image.src ? image.src.split("/").pop() : "Ảnh"}
                  </option>
                ))}
              </select>
            </fieldset>
          )}
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

  async function handleSave(form: VariantFormState) {
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

    const payload = toPayload(form);
    setSaving(true);
    try {
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
          saving={saving}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={(form) => void handleSave(form)}
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
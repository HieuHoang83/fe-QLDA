"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import {
  createVariant,
  deleteVariant,
  updateVariant,
} from "@/services/api/variants";
import {
  updateProduct,
  type HaravanProduct,
  type HaravanProductOption,
  type HaravanProductVariant,
} from "@/services/api/products";
import {
  formatMoney,
  isOutOfStock,
  variantImage,
  variantLabel,
} from "@/lib/haravan-format";
import { VariantFormDialog } from "./VariantFormDialog";
import {
  MAX_VARIANTS,
  toPayload,
  type VariantSavePayload,
} from "./variant.form";

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


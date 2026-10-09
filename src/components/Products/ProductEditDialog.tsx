"use client";

import { useEffect, useState } from "react";
import type { HaravanProduct } from "@/services/api/products";
import { formatMoney, productPrice } from "@/lib/haravan-format";
import { emptyForm, type ProductFormState } from "./product.form";

export function ProductEditDialog({
  product,
  saving,
  onClose,
  onSave,
}: {
  product: HaravanProduct;
  saving: boolean;
  onClose: () => void;
  onSave: (form: ProductFormState) => void;
}) {
  const [form, setForm] = useState<ProductFormState>(() => emptyForm(product));

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
        aria-labelledby="product-edit-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#71836a]">
              {product.id ? "Cập nhật sản phẩm" : "Thêm sản phẩm"}
            </p>
            <h2
              id="product-edit-title"
              className="mt-1 truncate text-xl font-extrabold"
            >
              {product.title ||
                (product.id ? `Sản phẩm #${product.id}` : "Sản phẩm mới")}
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
          className="space-y-4 px-6 py-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">
              Tên sản phẩm
            </span>
            <input
              type="text"
              required
              value={form.title}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, title: event.target.value }))
              }
              className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Nhà cung cấp
              </span>
              <input
                type="text"
                value={form.vendor}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, vendor: event.target.value }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">
                Loại sản phẩm
              </span>
              <input
                type="text"
                value={form.product_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    product_type: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Tags</span>
            <input
              type="text"
              value={form.tags}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tags: event.target.value }))
              }
              placeholder="Cách nhau bởi dấu phẩy"
              className="h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]"
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
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
              {saving && (
                <i className="pi pi-spin pi-spinner" aria-hidden="true" />
              )}
              {product.id ? "Lưu thay đổi" : "Tạo sản phẩm"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}



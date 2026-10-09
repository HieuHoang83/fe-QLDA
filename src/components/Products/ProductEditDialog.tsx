"use client";

import { useState } from "react";
import type { HaravanProduct } from "@/services/api/products";
import { digitsOnly, formatThousands } from "@/lib/haravan-format";
import { FieldLabel, InfoHint } from "@/components/ui/InfoHint";
import {
  emptyForm,
  type FirstVariantFormState,
  type ProductFormState,
} from "./product.form";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-[#e1e5dc] bg-[#fbfcf9] px-4 text-sm outline-none focus:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#191c18]";

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
  const isCreate = !product.id;
  const setMoney = (field: keyof FirstVariantFormState, value: string) =>
    setVariant(field, digitsOnly(value));
  const money = (value: string) => formatThousands(value);
  const setVariant = (
    field: keyof FirstVariantFormState,
    value: string | boolean
  ) =>
    setForm((prev) => ({
      ...prev,
      firstVariant: { ...prev.firstVariant, [field]: value },
    }));

  const price = Number(form.firstVariant.price);
  const compare = Number(form.firstVariant.compare_at_price);
  const discount =
    Number.isFinite(price) &&
    Number.isFinite(compare) &&
    compare > 0 &&
    compare > price
      ? Math.round(((compare - price) / compare) * 100)
      : 0;

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
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#20231f]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#eef0ea] px-6 py-4 dark:border-[#363b31]">
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
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5"
        >
          <label className="block">
            <FieldLabel hint="Tên hiển thị cho khách hàng. Nên có đơn vị và thông tin chính, ví dụ: Nước uống đóng chai ABC 500ml.">
              Tên sản phẩm
            </FieldLabel>
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
              <FieldLabel hint="Nhà sản xuất hoặc nhà phân phối của sản phẩm, dùng để lọc và đối soát.">
                Nhà cung cấp
              </FieldLabel>
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
              <FieldLabel hint="Phân loại nội bộ của sản phẩm, ví dụ: Thực phẩm, Mỹ phẩm, Đồ gia dụng.">
                Loại sản phẩm
              </FieldLabel>
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
            <FieldLabel hint="Nhãn từ khóa giúp tìm kiếm nhanh, nhập nhiều nhãn cách nhau bởi dấu phẩy, ví dụ: nước, giải khát.">
              Tags
            </FieldLabel>
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

          {isCreate && (
            <>
              <fieldset className="space-y-4 rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
                <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
                  <i className="pi pi-tags" aria-hidden="true" />
                  Biến thể đầu tiên
                </legend>
                <p className="text-xs text-[#858a80]">
                  Haravan tự tạo 1 biến thể mặc định khi tạo sản phẩm. Những
                  thông tin dưới đây sẽ được ghi đè lên biến thể đó.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <FieldLabel hint="Tên hiển thị của biến thể này. Nếu sản phẩm chỉ có 1 phiên bản thì để “Mặc định”; khi có nhiều biến thể ghi rõ đặc điểm, ví dụ: Đỏ, 500ml, size M.">
                      Tên biến thể
                    </FieldLabel>
                    <input
                      type="text"
                      value={form.firstVariant.title}
                      onChange={(event) =>
                        setVariant("title", event.target.value)
                      }
                      placeholder="Mặc định"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel hint="Số tiền khách phải trả cho 1 sản phẩm. Được tự động chèn dấu chấm phân tách nghìn, ví dụ 10000 -> 10.000.">
                      Giá bán
                    </FieldLabel>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        required
                        value={money(form.firstVariant.price)}
                        onChange={(event) => setMoney("price", event.target.value)}
                        className={`${INPUT_CLASS} pr-9`}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                        ₫
                      </span>
                    </div>
                  </label>
                  <label className="block">
                    <FieldLabel hint="Giá trước khi giảm. Để trống nếu không có chương trình giảm giá — giá bán và giá so sánh không được bằng nhau.">
                      Giá so sánh
                    </FieldLabel>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={money(form.firstVariant.compare_at_price)}
                        onChange={(event) =>
                          setMoney("compare_at_price", event.target.value)
                        }
                        className={`${INPUT_CLASS} pr-9`}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                        ₫
                      </span>
                    </div>
                  </label>
                </div>

                {discount > 0 && (
                  <p className="inline-flex items-center gap-2 rounded-full bg-[#e8f4e9] px-3 py-1 text-xs font-bold text-[#26733c] dark:bg-[#30392c] dark:text-[#c4dfa9]">
                    <i className="pi pi-percentage" aria-hidden="true" />
                    Đang giảm {discount}%
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <FieldLabel hint="Mã hàng nội bộ do bạn tự đặt, dùng để tra cứu, tồn kho và đơn hàng. Nên để trống nếu chưa cần.">
                      SKU
                    </FieldLabel>
                    <input
                      type="text"
                      value={form.firstVariant.sku}
                      onChange={(event) => setVariant("sku", event.target.value)}
                      placeholder="Mã hàng nội bộ"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel hint="Mã vạch (EAN/UPC) in trên bao bì. Khi có Barcode, hệ thống tìm sản phẩm bằng cách quét mã.">
                      Barcode
                    </FieldLabel>
                    <input
                      type="text"
                      value={form.firstVariant.barcode}
                      onChange={(event) => setVariant("barcode", event.target.value)}
                      placeholder="Mã vạch"
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                  <input
                    type="checkbox"
                    checked={form.firstVariant.taxable}
                    onChange={(event) => setVariant("taxable", event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#527b49]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span>Tính thuế cho biến thể này</span>
                      <InfoHint text="Bật để giá của biến thể này được tính thuế khi khách thanh toán." />
                    </span>
                    <span className="block text-xs text-[#858a80]">
                      Tính thuế khi khách thanh toán.
                    </span>
                  </span>
                </label>
              </fieldset>

              <fieldset className="space-y-4 rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
                <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
                  <i className="pi pi-box" aria-hidden="true" />
                  Quản lý tồn kho
                </legend>

                <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                  <input
                    type="checkbox"
                    checked={form.firstVariant.track_inventory}
                    onChange={(event) =>
                      setVariant("track_inventory", event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 accent-[#527b49]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span>Có quản lý tồn kho</span>
                      <InfoHint text="Bật để Haravan theo dõi số lượng và kho hàng của biến thể này. Tắt nếu sản phẩm không giới hạn số lượng." />
                    </span>
                    <span className="block text-xs text-[#858a80]">
                      Bật để Haravan theo dõi số lượng và kho hàng của biến thể này.
                    </span>
                  </span>
                </label>

                {form.firstVariant.track_inventory && (
                  <>
                    <label className="block sm:w-64">
                      <FieldLabel hint="Số lượng tồn ban đầu của biến thể tại kho mặc định. Sau này muốn cộng/trừ tồn thì tạo phiếu nhập, xuất hoặc điều chỉnh trong Quản lý tồn kho.">
                        Tồn đầu kỳ
                      </FieldLabel>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={money(form.firstVariant.inventory_quantity)}
                        onChange={(event) =>
                          setMoney("inventory_quantity", event.target.value)
                        }
                        className={INPUT_CLASS}
                      />
                      <span className="mt-1 block text-xs text-[#858a80]">
                        Số lượng tồn ban đầu tại kho mặc định.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                      <input
                        type="checkbox"
                        checked={form.firstVariant.allow_oversell}
                        onChange={(event) =>
                          setVariant("allow_oversell", event.target.checked)
                        }
                        className="mt-0.5 h-4 w-4 accent-[#527b49]"
                      />
                      <span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          <span>Cho phép đặt hàng khi hết hàng</span>
                          <InfoHint text="Bật (Continue selling) để khách vẫn đặt được khi tồn kho về 0. Tắt thì hết hàng sẽ báo không đủ hàng." />
                        </span>
                        <span className="block text-xs text-[#858a80]">
                          Khách vẫn có thể mua khi tồn kho về 0.
                        </span>
                      </span>
                    </label>
                  </>
                )}
              </fieldset>

              <fieldset className="space-y-4 rounded-2xl border border-[#e8e9e2] bg-[#fbfcf9] p-4 dark:border-[#363b31] dark:bg-[#1b1e1a]">
                <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[0.12em] text-[#71836a]">
                  <i className="pi pi-truck" aria-hidden="true" />
                  Vận chuyển
                </legend>

                <label className="flex items-start gap-3 rounded-xl border border-[#e5e7df] bg-white px-4 py-3 dark:border-[#40453b] dark:bg-[#191c18]">
                  <input
                    type="checkbox"
                    checked={form.firstVariant.requires_shipping}
                    onChange={(event) =>
                      setVariant("requires_shipping", event.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 accent-[#527b49]"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <span>Cần giao hàng</span>
                      <InfoHint text="Bật để khách có thể chọn giao hàng cho sản phẩm này. Tắt với sản phẩm dịch vụ hoặc sản phẩm chỉ dùng để thu thập." />
                    </span>
                    <span className="block text-xs text-[#858a80]">
                      Chọn để cho phép giao hàng với sản phẩm này.
                    </span>
                  </span>
                </label>

                {form.firstVariant.requires_shipping && (
                  <label className="block sm:w-64">
                    <FieldLabel hint="Trọng lượng của 1 sản phẩm tính bằng gram. Hệ thống dùng số này để tính phí vận chuyển.">
                      Khối lượng
                    </FieldLabel>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={money(form.firstVariant.grams)}
                        onChange={(event) => setMoney("grams", event.target.value)}
                        placeholder="0"
                        className={`${INPUT_CLASS} pr-16`}
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#858a80]">
                        grams
                      </span>
                    </div>
                    <span className="mt-1 block text-xs text-[#858a80]">
                      Dùng để tính phí vận chuyển.
                    </span>
                  </label>
                )}

                <label className="block sm:w-64">
                  <FieldLabel hint="Đơn vị nhỏ nhất của sản phẩm dùng để tính tồn kho, ví dụ: cái, lon, hộp, thùng.">
                    Đơn vị tính
                  </FieldLabel>
                  <input
                    type="text"
                    value={form.firstVariant.unit}
                    onChange={(event) => setVariant("unit", event.target.value)}
                    placeholder="cái, lon, hộp..."
                    className={INPUT_CLASS}
                  />
                  <span className="mt-1 block text-xs text-[#858a80]">
                    Biến thể có nhiều đơn vị tính (ví dụ: lon, lốc, thùng...).
                  </span>
                </label>
              </fieldset>
            </>
          )}

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



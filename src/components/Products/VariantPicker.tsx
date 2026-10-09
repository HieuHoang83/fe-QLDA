"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  HaravanProduct,
  HaravanProductVariant,
} from "@/services/api/products";
import {
  formatMoney,
  isOutOfStock,
  variantImage,
  variantStock,
} from "@/lib/haravan-format";

interface VariantPickerProps {
  product: HaravanProduct;
  onImageChange?: (src: string) => void;
  onVariantChange?: (variant: HaravanProductVariant) => void;
}

/** Option value theo position cua product.options (option1 -> 1, ...). */
function optionValue(
  variant: HaravanProductVariant | undefined,
  position: number
) {
  if (!variant) return "";
  if (position === 1) return variant.option1 ?? "";
  if (position === 2) return variant.option2 ?? "";
  if (position === 3) return variant.option3 ?? "";
  return "";
}

export default function VariantPicker({
  product,
  onImageChange,
  onVariantChange,
}: VariantPickerProps) {
  const options = useMemo(() => product.options ?? [], [product.options]);
  const variants = useMemo(() => product.variants ?? [], [product.variants]);

  const initialSelection = useMemo(() => {
    const first = variants[0];
    const selection: Record<number, string> = {};
    for (const option of options) {
      selection[option.position ?? 0] = optionValue(
        first,
        option.position ?? 0
      );
    }
    return selection;
  }, [options, variants]);

  const [selected, setSelected] =
    useState<Record<number, string>>(initialSelection);
  const [quantity, setQuantity] = useState(1);

  const selectedVariant = useMemo(
    () =>
      variants.find((variant) =>
        options.every(
          (option) =>
            optionValue(variant, option.position ?? 0) ===
            selected[option.position ?? 0]
        )
      ) ?? variants[0],
    [options, variants, selected]
  );

  useEffect(() => {
    onImageChange?.(variantImage(product, selectedVariant) ?? "");
    onVariantChange?.(selectedVariant);
  }, [selectedVariant, product, onImageChange, onVariantChange]);

  const pickOption = (position: number, value: string) => {
    if (value === selected[position]) return;
    const candidate: Record<number, string> = {
      ...selected,
      [position]: value,
    };
    const compatible = variants.filter((variant) =>
      options.every(
        (option) =>
          candidate[option.position ?? 0] === "" ||
          optionValue(variant, option.position ?? 0) ===
            candidate[option.position ?? 0]
      )
    );
    if (compatible.length === 0) {
      toast.warning("Không có biến thể phù hợp với lựa chọn này.");
      return;
    }
    setSelected(candidate);
    setQuantity(1);
  };

  const stock = variantStock(selectedVariant);
  const outOfStock = isOutOfStock(selectedVariant);
  const maxQuantity =
    !outOfStock && stock !== undefined && stock > 0 ? Math.max(1, stock) : 99;

  const visibleOptions = options.filter((option) => {
    const position = option.position ?? 0;
    if (position === 0) return false;
    return variants.some((variant) =>
      Boolean(optionValue(variant, position))
    );
  });

  return (
    <div className="space-y-5">
      {visibleOptions.map((option) => {
        const position = option.position ?? 0;
        const values = Array.from(
          new Set(
            variants
              .map((variant) => optionValue(variant, position))
              .filter((value) => Boolean(value))
          )
        );
        return (
          <div key={option.id ?? position}>
            <p className="mb-2 text-sm font-semibold">
              {option.name || `Lựa chọn ${position}`}
            </p>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const active = selected[position] === value;
                const variantForValue = variants.find(
                  (variant) => optionValue(variant, position) === value
                );
                const disabled = Boolean(
                  variantForValue && isOutOfStock(variantForValue)
                );
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => pickOption(position, value)}
                    className={`h-10 rounded-xl border px-4 text-sm font-semibold transition ${
                      active
                        ? "border-[#527b49] bg-[#527b49] text-white"
                        : "border-[#e1e5dc] bg-white text-[#20231f] hover:border-[#7c9f70] dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#f4f5ef]"
                    } ${
                      disabled
                        ? "cursor-not-allowed opacity-45 line-through"
                        : ""
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {selectedVariant && (
        <div className="rounded-2xl border border-[#e8e9e2] bg-[#fafbf8] p-4 dark:border-[#363b31] dark:bg-[#191c18]">
          {outOfStock && (
            <div className="flex justify-end">
              <span className="rounded-full bg-[#f0d6d2] px-3 py-1 text-xs font-bold text-[#aa382f] dark:bg-[#54312d] dark:text-[#ffb7af]">
                Hết hàng
              </span>
            </div>
          )}

          <div
            className={`flex flex-wrap items-end justify-between gap-4 ${
              outOfStock ? "" : "mt-4"
            }`}
          >
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#858a80]">Số lượng</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Giảm số lượng"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e1e5dc] bg-white text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-40 dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                >
                  <i className="pi pi-minus" aria-hidden="true" />
                </button>
                <span className="w-14 text-center text-lg font-bold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Tăng số lượng"
                  disabled={outOfStock || quantity >= maxQuantity}
                  onClick={() =>
                    setQuantity((value) => Math.min(maxQuantity, value + 1))
                  }
                  className="grid h-11 w-11 place-items-center rounded-xl border border-[#e1e5dc] bg-white text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-40 dark:border-[#40453b] dark:bg-[#20231f] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
                >
                  <i className="pi pi-plus" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#858a80]">
                Giá bán
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tabular-nums">
                {formatMoney(selectedVariant.price)}
              </p>
              {Number(selectedVariant.compare_at_price) > 0 &&
                Number(selectedVariant.compare_at_price) >
                  Number(selectedVariant.price) && (
                  <p className="mt-0.5 text-sm text-[#969b91]">
                    Giá so sánh{" "}
                    <span className="line-through">
                      {formatMoney(selectedVariant.compare_at_price)}
                    </span>
                  </p>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

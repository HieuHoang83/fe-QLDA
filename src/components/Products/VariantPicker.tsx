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
  variantLabel,
  variantStock,
} from "@/lib/haravan-format";

interface VariantPickerProps {
  product: HaravanProduct;
  onImageChange?: (src: string) => void;
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
  }, [selectedVariant, product, onImageChange]);

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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-[#e8e9e2] bg-[#fafbf8] px-4 py-3 dark:border-[#363b31] dark:bg-[#191c18]">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[#858a80]">
              Biến thể đã chọn
            </p>
            <p className="mt-0.5 font-semibold">
              {variantLabel(selectedVariant)}
            </p>
          </div>
          <div className="text-sm text-[#73796f] dark:text-[#b3b9ad]">
            <p>SKU: {selectedVariant.sku || "—"}</p>
            <p>Barcode: {selectedVariant.barcode || "—"}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-[#858a80]">Tồn kho</p>
            <p
              className={`mt-0.5 font-bold tabular-nums ${
                outOfStock
                  ? "text-[#aa382f] dark:text-[#ffb7af]"
                  : "text-[#26733c] dark:text-[#b4cfb3]"
              }`}
            >
              {stock === undefined
                ? "Không theo dõi"
                : outOfStock
                  ? "Hết hàng"
                  : `${stock} sản phẩm`}
            </p>
          </div>
        </div>
      )}

      {selectedVariant && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Giảm số lượng"
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#e1e5dc] text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-40 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
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
              className="grid h-11 w-11 place-items-center rounded-xl border border-[#e1e5dc] text-[#596052] hover:bg-[#f3f5ef] disabled:opacity-40 dark:border-[#40453b] dark:text-[#d3d8ce] dark:hover:bg-[#30342e]"
            >
              <i className="pi pi-plus" aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold tabular-nums">
              {formatMoney(selectedVariant.price)}
            </span>
            {Number(selectedVariant.compare_at_price) > 0 &&
              Number(selectedVariant.compare_at_price) >
                Number(selectedVariant.price) && (
                <span className="text-base text-[#969b91] line-through">
                  {formatMoney(selectedVariant.compare_at_price)}
                </span>
              )}
          </div>
          {outOfStock && (
            <span className="rounded-full bg-[#f0d6d2] px-3 py-1 text-xs font-bold text-[#aa382f] dark:bg-[#54312d] dark:text-[#ffb7af]">
              Hết hàng
            </span>
          )}
        </div>
      )}
    </div>
  );
}
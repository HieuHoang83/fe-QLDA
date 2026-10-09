import type { HaravanProduct } from "@/services/api/products";
import type { VariantPayload } from "@/services/api/variants";

/** Dữ liệu form sản phẩm, dùng chung cho trang danh sách và trang chi tiết. */
export interface ProductFormState {
  title: string;
  vendor: string;
  product_type: string;
  tags: string;
  /** Thông tin biến thể đầu tiên, chỉ dùng khi tạo sản phẩm mới. */
  firstVariant: FirstVariantFormState;
}

/**
 * Thông tin biến thể đầu tiên ngay lúc tạo sản phẩm.
 * Haravan tự sinh 1 biến thể "Default Title" khi tạo sản phẩm,
 * form này cho phép điền thông tin thật và ghi đè lên biến thể đó.
 */
export interface FirstVariantFormState {
  title: string;
  price: string;
  compare_at_price: string;
  sku: string;
  barcode: string;
  inventory_quantity: string;
  grams: string;
  unit: string;
  requires_shipping: boolean;
  taxable: boolean;
  track_inventory: boolean;
  allow_oversell: boolean;
}

export function emptyFirstVariant(): FirstVariantFormState {
  return {
    title: "Mặc định",
    price: "",
    compare_at_price: "",
    sku: "",
    barcode: "",
    inventory_quantity: "0",
    grams: "",
    unit: "",
    requires_shipping: true,
    taxable: true,
    track_inventory: true,
    allow_oversell: true,
  };
}

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** Payload cập nhật biến thể đầu tiên (dùng chung với variant.form). */
export function toFirstVariantPayload(
  form: FirstVariantFormState
): VariantPayload {
  const price = toNumber(form.price);
  const unit = form.unit.trim();
  const inventoryQuantity = toNumber(form.inventory_quantity);
  return {
    title: form.title.trim() || undefined,
    price: price ?? 0,
    compare_at_price: toNumber(form.compare_at_price) ?? null,
    sku: form.sku.trim() || undefined,
    barcode: form.barcode.trim() || undefined,
    grams: toNumber(form.grams),
    inventory_management: form.track_inventory ? "haravan" : "",
    inventory_policy: form.allow_oversell ? "continue" : "deny",
    inventory_quantity:
      form.track_inventory && inventoryQuantity !== undefined
        ? inventoryQuantity
        : undefined,
    requires_shipping: form.requires_shipping,
    taxable: form.taxable,
    variant_units:
      unit !== ""
        ? [
            {
              id: 0,
              unit,
              base: true,
              sellable: true,
              ratio: 1,
              price: price ?? 0,
              sku: form.sku.trim() || undefined,
              barcode: form.barcode.trim() || undefined,
            },
          ]
        : undefined,
  };
}

export function emptyForm(product: HaravanProduct): ProductFormState {
  return {
    title: product.title ?? "",
    vendor: product.vendor ?? "",
    product_type: product.product_type ?? "",
    tags: product.tags ?? "",
    firstVariant: emptyFirstVariant(),
  };
}

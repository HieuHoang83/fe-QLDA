import type {
  HaravanProduct,
  HaravanProductVariant,
} from "@/services/api/products";
import type { VariantPayload } from "@/services/api/variants";
import { isDefaultVariantTitle } from "@/lib/haravan-format";

export const MAX_VARIANTS = 100;

export interface NewOption {
  position: number;
  name: string;
}

export interface VariantSavePayload {
  form: VariantFormState;
  newOptions: NewOption[];
}

export interface VariantFormState {
  title: string;
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

export function emptyForm(): VariantFormState {
  return {
    title: "",
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

export function baseUnit(variant?: HaravanProductVariant | null): string {
  return variant?.variant_units?.find((item) => item.base)?.unit ?? "";
}

export function fromVariant(variant: HaravanProductVariant): VariantFormState {
  return {
    title: variant.title && !isDefaultVariantTitle(variant.title) ? variant.title : "",
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

export function optionName(
  product: HaravanProduct,
  position: number
): string {
  return (
    product.options?.find((option) => option.position === position)?.name ??
    (position === 1 ? "Option 1" : position === 2 ? "Option 2" : "Option 3")
  );
}

export function toPayload(form: VariantFormState, hadUnits: boolean): VariantPayload {
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
    title: form.title.trim() || undefined,
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


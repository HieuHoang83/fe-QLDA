export function formatMoney(value?: number | string | null): string {
  if (value === undefined || value === null || value === "") return "—";
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function firstImage(images?: Array<{ src?: string }>): string | undefined {
  return images?.find((image) => image?.src)?.src;
}

export function productPrice(product: {
  variants?: Array<{ price?: number }>;
}): number | undefined {
  const prices = (product.variants ?? [])
    .map((variant) => variant.price)
    .filter((price): price is number => typeof price === "number");
  if (!prices.length) return undefined;
  return Math.min(...prices);
}

export function productStock(product: {
  variants?: Array<{ inventory_quantity?: number; inventory_management?: string | null }>;
}): number | undefined {
  const variants = product.variants ?? [];
  if (!variants.length) return undefined;
  if (!variants.some((variant) => variant.inventory_management)) return undefined;
  return variants.reduce(
    (sum, variant) => sum + (variant.inventory_quantity ?? 0),
    0
  );
}

export interface VariantLike {
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  title?: string | null;
  price?: number;
  compare_at_price?: number | null;
  inventory_quantity?: number;
  inventory_management?: string | null;
  inventory_policy?: string | null;
}

/** Ghép option1..3 thành nhãn variant, fallback title. */
export function variantLabel(variant: VariantLike): string {
  const label = [variant.option1, variant.option2, variant.option3]
    .filter((value): value is string => Boolean(value && String(value).trim()))
    .join(" / ");
  if (label) return label;
  if (variant.title && variant.title !== "Default Title") return variant.title;
  return "Mặc định";
}

/** Ảnh của variant: map image_id -> src, fallback ảnh đầu tiên. */
export function variantImage(
  product: {
    images?: Array<{ id?: number; src?: string }>;
  },
  variant?: { image_id?: number | null }
): string | undefined {
  if (variant?.image_id != null) {
    const matched = product.images?.find(
      (image) => image.id === variant.image_id
    );
    if (matched?.src) return matched.src;
  }
  return firstImage(product.images);
}

export function isOutOfStock(variant: VariantLike): boolean {
  if (!variant.inventory_management) return false;
  if (variant.inventory_policy === "continue") return false;
  return (variant.inventory_quantity ?? 0) <= 0;
}

/** Số lượng còn bán được; undefined = không theo dõi tồn kho. */
export function variantStock(variant: VariantLike): number | undefined {
  if (!variant.inventory_management) return undefined;
  return variant.inventory_quantity ?? 0;
}

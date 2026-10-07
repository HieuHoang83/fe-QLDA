import { haravanRequest } from "./haravan";

export interface HaravanProductImage {
  id?: number;
  src?: string;
  alt?: string | null;
  position?: number;
  variant_ids?: number[];
}

export interface HaravanInventoryAdvance {
  qty_available?: number;
  qty_onhand?: number;
  qty_commited?: number;
  qty_incoming?: number;
}

export interface HaravanVariantUnit {
  id?: number;
  unit?: string;
  base?: boolean;
  sellable?: boolean;
  ratio?: number;
  barcode?: string;
  sku?: string;
  price?: number;
}

export interface HaravanProductVariant {
  id?: number;
  product_id?: number;
  title?: string;
  price?: number;
  compare_at_price?: number | null;
  sku?: string | null;
  barcode?: string | null;
  grams?: number;
  inventory_quantity?: number;
  inventory_management?: string | null;
  inventory_policy?: string;
  inventory_advance?: HaravanInventoryAdvance;
  fulfillment_service?: string | null;
  requires_shipping?: boolean;
  taxable?: boolean;
  position?: number;
  image_id?: number | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  variant_units?: HaravanVariantUnit[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface HaravanProductOption {
  id?: number;
  name?: string;
  position?: number;
  product_id?: number;
}

export interface HaravanProduct {
  id?: number;
  title?: string;
  body_html?: string | null;
  vendor?: string;
  product_type?: string;
  handle?: string;
  tags?: string;
  published_at?: string | null;
  published_scope?: string;
  template_suffix?: string | null;
  images?: HaravanProductImage[];
  options?: HaravanProductOption[];
  variants?: HaravanProductVariant[];
  created_at?: string;
  updated_at?: string;
}

export interface HaravanProductListResult {
  products: HaravanProduct[];
}

export interface HaravanProductResult {
  product: HaravanProduct;
}

export interface HaravanCountResult {
  count: number;
}

export interface ListProductsParams {
  page?: number;
  limit?: number;
  vendor?: string;
  product_type?: string;
  handle?: string;
  sku?: string;
  barcode?: string;
  since_id?: number;
  [key: string]: string | number | undefined;
}

export function listProducts(
  token: string,
  orgId: string,
  params: ListProductsParams = {}
): Promise<HaravanProductListResult> {
  return haravanRequest<HaravanProductListResult>(
    orgId,
    "/products",
    token,
    { params }
  );
}

export function countProducts(
  token: string,
  orgId: string
): Promise<HaravanCountResult> {
  return haravanRequest<HaravanCountResult>(
    orgId,
    "/products/count",
    token
  );
}

export function getProduct(
  token: string,
  orgId: string,
  productId: number
): Promise<HaravanProductResult> {
  return haravanRequest<HaravanProductResult>(
    orgId,
    `/products/${productId}`,
    token
  );
}

export function createProduct(
  token: string,
  orgId: string,
  product: Partial<HaravanProduct>
): Promise<HaravanProductResult> {
  return haravanRequest<HaravanProductResult>(
    orgId,
    "/products",
    token,
    { method: "POST", body: { product } }
  );
}

export function updateProduct(
  token: string,
  orgId: string,
  productId: number,
  product: Partial<HaravanProduct>
): Promise<HaravanProductResult> {
  return haravanRequest<HaravanProductResult>(
    orgId,
    `/products/${productId}`,
    token,
    { method: "PUT", body: { product: { id: productId, ...product } } }
  );
}

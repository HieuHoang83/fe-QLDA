import { haravanRequest } from "./haravan";
import type { HaravanProductVariant } from "./products";

export interface HaravanVariantListResult {
  variants: HaravanProductVariant[];
}

export interface HaravanVariantResult {
  variant: HaravanProductVariant;
}

export interface HaravanVariantCountResult {
  count: number;
}

export interface ListVariantsParams {
  page?: number;
  limit?: number;
  ids?: string;
  since_id?: number;
  fields?: string;
  [key: string]: string | number | undefined;
}

export type VariantPayload = Partial<
  Pick<
    HaravanProductVariant,
    | "title"
    | "sku"
    | "barcode"
    | "option1"
    | "option2"
    | "option3"
    | "price"
    | "compare_at_price"
    | "grams"
    | "inventory_quantity"
    | "inventory_management"
    | "inventory_policy"
    | "requires_shipping"
    | "taxable"
    | "position"
    | "image_id"
    | "variant_units"
  >
>;

export function listVariants(
  token: string,
  orgId: string,
  productId: number,
  params: ListVariantsParams = {}
): Promise<HaravanVariantListResult> {
  return haravanRequest<HaravanVariantListResult>(
    orgId,
    `/products/${productId}/variants`,
    token,
    { params }
  );
}

export function countVariants(
  token: string,
  orgId: string,
  productId: number
): Promise<HaravanVariantCountResult> {
  return haravanRequest<HaravanVariantCountResult>(
    orgId,
    `/products/${productId}/variants/count`,
    token
  );
}

export function getVariant(
  token: string,
  orgId: string,
  variantId: number
): Promise<HaravanVariantResult> {
  return haravanRequest<HaravanVariantResult>(
    orgId,
    `/variants/${variantId}`,
    token
  );
}

export function createVariant(
  token: string,
  orgId: string,
  productId: number,
  variant: VariantPayload
): Promise<HaravanVariantResult> {
  return haravanRequest<HaravanVariantResult>(
    orgId,
    `/products/${productId}/variants`,
    token,
    { method: "POST", body: { variant } }
  );
}

export function updateVariant(
  token: string,
  orgId: string,
  variantId: number,
  variant: VariantPayload
): Promise<HaravanVariantResult> {
  return haravanRequest<HaravanVariantResult>(
    orgId,
    `/variants/${variantId}`,
    token,
    { method: "PUT", body: { variant: { id: variantId, ...variant } } }
  );
}

export function deleteVariant(
  token: string,
  orgId: string,
  productId: number,
  variantId: number
): Promise<unknown> {
  return haravanRequest(
    orgId,
    `/products/${productId}/variants/${variantId}`,
    token,
    { method: "DELETE", body: {} }
  );
}

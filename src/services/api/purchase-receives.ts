import { haravanRequest } from "./haravan";

export interface PurchaseReceiveParty {
  id?: number;
  name?: string | null;
  supplier_name?: string | null;
  address?: string | null;
  address1?: string | null;
  address2?: string | null;
  phone?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface PurchaseReceiveLineItem {
  id?: number;
  product_id?: number;
  variant_id?: number;
  product_variant_id?: number;
  name?: string | null;
  title?: string | null;
  product_name?: string | null;
  variant_title?: string | null;
  sku?: string | null;
  quantity?: number;
  original_cost?: number;
  discount_amount?: number;
  cost?: number;
  price?: number;
  total_cost?: number;
}

export interface HaravanPurchaseReceive {
  id: number;
  receive_number?: string | null;
  ref_number?: string | null;
  ref_purchase_order_id?: number | null;
  employee?: PurchaseReceiveParty | null;
  tags?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  received_at?: string | null;
  notes?: string | null;
  status?: string | null;
  total?: number;
  total_cost?: number;
  supplier?: PurchaseReceiveParty | null;
  location?: PurchaseReceiveParty | null;
  line_items?: PurchaseReceiveLineItem[] | PurchaseReceiveLineItem;
}

export interface PurchaseReceiveListResult {
  purchase_receives: HaravanPurchaseReceive[];
}

export interface PurchaseReceiveResult {
  purchase_receive: HaravanPurchaseReceive;
}

export function listPurchaseReceives(
  token: string,
  orgId: string,
  params: { limit?: number; page?: number } = {}
): Promise<PurchaseReceiveListResult> {
  return haravanRequest<PurchaseReceiveListResult>(
    orgId,
    "/purchase_receives",
    token,
    { params }
  );
}

export function getPurchaseReceive(
  token: string,
  orgId: string,
  purchaseReceiveId: number
): Promise<PurchaseReceiveResult> {
  return haravanRequest<PurchaseReceiveResult>(
    orgId,
    `/purchase_receives/${purchaseReceiveId}`,
    token
  );
}

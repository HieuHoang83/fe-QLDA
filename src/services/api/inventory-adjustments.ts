import { haravanRequest } from "./haravan";
import type { InventoryAdjustPayload } from "./locations";

export interface HaravanInventoryAdjustment {
  id: number;
  adjust_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  tran_date?: string | null;
  location_id?: number;
  type?: "adjust" | "set" | string;
  reason?: string | null;
  total_quantity?: number;
  total_cost?: number;
  note?: string | null;
  tags?: string | null;
  line_items?: Array<{
    id?: number;
    product_id?: number;
    product_variant_id?: number;
    sku?: string | null;
    barcode?: string | null;
    quantity?: number;
    cost_amount?: number;
  }>;
}

export interface InventoryAdjustmentListResult {
  adjustments?: HaravanInventoryAdjustment[];
  inventory_adjustments?: HaravanInventoryAdjustment[];
}

export interface InventoryAdjustmentResult {
  adjustment?: HaravanInventoryAdjustment;
  inventory_adjustment?: HaravanInventoryAdjustment;
}

export interface InventoryAdjustmentCountResult {
  count: number;
}

export function createInventoryAdjustment(
  token: string,
  orgId: string,
  inventory: InventoryAdjustPayload
): Promise<unknown> {
  return haravanRequest(orgId, "/inventories/adjustorset", token, {
    method: "POST",
    body: { inventory },
  });
}

export function listInventoryAdjustments(
  token: string,
  orgId: string,
  params: { limit?: number; page?: number; location_id?: number } = {}
): Promise<InventoryAdjustmentListResult> {
  return haravanRequest<InventoryAdjustmentListResult>(
    orgId,
    "/inventory_adjustments",
    token,
    { params }
  );
}

export function countInventoryAdjustments(
  token: string,
  orgId: string,
  params: { location_id?: number } = {},
): Promise<InventoryAdjustmentCountResult> {
  return haravanRequest<InventoryAdjustmentCountResult>(
    orgId,
    "/inventory_adjustments/count",
    token,
    { params },
  );
}

export function getInventoryAdjustment(
  token: string,
  orgId: string,
  adjustmentId: number
): Promise<InventoryAdjustmentResult> {
  return haravanRequest<InventoryAdjustmentResult>(
    orgId,
    `/inventory_adjustments/${adjustmentId}`,
    token
  );
}

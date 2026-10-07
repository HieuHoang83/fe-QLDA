import { haravanRequest } from "./haravan";

export interface HaravanLocation {
  id: number;
  name?: string | null;
  location_type?: string | null;
  address1?: string | null;
  address2?: string | null;
  zip?: string | null;
  city?: string | null;
  province?: string | null;
  district?: string | null;
  ward?: string | null;
  country?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  type?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface HaravanLocationListResult {
  locations: HaravanLocation[];
}

export interface HaravanInventoryLocation {
  id?: number;
  loc_id?: number;
  product_id?: number;
  variant_id?: number;
  qty_onhand?: number;
  qty_commited?: number;
  qty_incoming?: number;
  qty_available?: number;
  updated_at?: string;
}

export interface HaravanInventoryLocationListResult {
  inventory_locations: HaravanInventoryLocation[];
}

export interface InventoryLineItem {
  product_id: number;
  product_variant_id: number;
  quantity: number;
}

export interface InventoryAdjustPayload {
  location_id: number;
  type: "adjust" | "set";
  reason?: string;
  note?: string;
  line_items: InventoryLineItem[];
}

export function listLocations(
  token: string,
  orgId: string
): Promise<HaravanLocationListResult> {
  return haravanRequest<HaravanLocationListResult>(orgId, "/locations", token);
}

export function getLocation(
  token: string,
  orgId: string,
  locationId: number
): Promise<{ location: HaravanLocation }> {
  return haravanRequest<{ location: HaravanLocation }>(
    orgId,
    `/locations/${locationId}`,
    token
  );
}

export function listInventoryLocations(
  token: string,
  orgId: string,
  params: { location_ids?: string; variant_ids?: string } = {}
): Promise<HaravanInventoryLocationListResult> {
  return haravanRequest<HaravanInventoryLocationListResult>(
    orgId,
    "/inventory_locations",
    token,
    { params }
  );
}

export function adjustInventory(
  token: string,
  orgId: string,
  inventory: InventoryAdjustPayload
): Promise<unknown> {
  return haravanRequest(orgId, "/inventories/adjustorset", token, {
    method: "POST",
    body: { inventory },
  });
}

export function locationAddress(location: HaravanLocation): string {
  return [
    location.address1,
    location.address2,
    location.district,
    location.city,
    location.province,
  ]
    .filter(Boolean)
    .join(", ");
}

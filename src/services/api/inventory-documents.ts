import { haravanRequest } from "./haravan";
import type { InventoryLineItem } from "./locations";

export interface InventoryDocumentLine extends InventoryLineItem {
  id?: number;
}

export interface PurchaseOrderDocument {
  id: number;
  purchase_number?: string | null;
  ref_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  tran_date?: string | null;
  completed_at?: string | null;
  closed_at?: string | null;
  notes?: string | null;
  status?: string | null;
  supplier?: string | PurchaseOrderSupplier | null;
  location?: { id?: number; name?: string | null } | null;
  total?: number;
  line_items?: PurchaseOrderLine[] | PurchaseOrderLine;
  line_item?: PurchaseOrderLineGroup | PurchaseOrderLineGroup[];
}

export interface PurchaseOrderSupplier {
  id?: number;
  name?: string | null;
  supplier_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  district?: string | null;
  province?: string | null;
  country?: string | null;
}

export interface PurchaseOrderItem {
  id?: number;
  product_id?: number;
  product_variant_id?: number;
  product_name?: string | null;
  variant_title?: string | null;
  sku?: string | null;
  barcode?: string | null;
  quantity?: number;
  cost_amount?: number;
  status?: string | null;
  receive_id?: number | null;
  receive_date?: string | null;
}

export interface PurchaseOrderLineGroup {
  received_items?: PurchaseOrderItem[];
  not_received_items?: PurchaseOrderItem[];
}

export interface PurchaseOrderTotals {
  receivedQuantity: number;
  receivedCost: number;
  pendingQuantity: number;
  pendingCost: number;
  totalQuantity: number;
  totalCost: number;
}

/** Haravan groups purchase order lines into received and still-pending buckets. */
export function purchaseOrderGroups(document: PurchaseOrderDocument): PurchaseOrderLineGroup[] {
  const source = document.line_item ?? document.line_items;
  if (!source) return [];
  const groups = Array.isArray(source) ? source : [source];
  return groups.filter((group): group is PurchaseOrderLineGroup => Boolean(group && typeof group === "object" && !Array.isArray(group)));
}

export function purchaseOrderReceivedItems(document: PurchaseOrderDocument): PurchaseOrderItem[] {
  return purchaseOrderGroups(document).flatMap((group) => group.received_items ?? []);
}

export function purchaseOrderPendingItems(document: PurchaseOrderDocument): PurchaseOrderItem[] {
  return purchaseOrderGroups(document).flatMap((group) => group.not_received_items ?? []);
}

/**
 * Trả về danh sách dòng phẳng của đơn đặt hàng.
 *
 * Haravan trả `line_item` dạng group `{ received_items, not_received_items }`,
 * nhưng một số đơn lại trả dòng phẳng. Hàm này gộp cả hai trường hợp để phần
 * còn lại của ứng dụng chỉ cần làm việc với một mảng dòng.
 */
export function purchaseOrderFlatLines(document: PurchaseOrderDocument): PurchaseOrderLine[] {
  const source = document.line_item ?? document.line_items;
  if (!source) return [];

  const parts = Array.isArray(source) ? source : [source];
  const lines: PurchaseOrderLine[] = [];

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const group = part as PurchaseOrderLineGroup;

    if (group.received_items || group.not_received_items) {
      lines.push(...(group.received_items ?? []), ...(group.not_received_items ?? []));
      continue;
    }

    lines.push(part as PurchaseOrderLine);
  }

  return lines;
}

/**
 * Một dòng sản phẩm đã gộp cả phần đã nhập và phần chờ nhập.
 * Haravan tách hai nhóm riêng, nhưng để thấy "đã nhập / tổng" ta cần gộp lại
 * theo biến thể, vì cùng một sản phẩm có thể nằm ở cả hai nhóm.
 */
export interface PurchaseOrderRow extends PurchaseOrderItem {
  receivedQuantity: number;
  pendingQuantity: number;
  totalQuantity: number;
  receivedCost: number;
  pendingCost: number;
  totalCost: number;
  /** Số lần đã nhập (mỗi lần nhập là 1 dòng trong received_items). */
  receiveCount: number;
  lastReceiveDate?: string | null;
}

function purchaseOrderRowKey(item: PurchaseOrderItem): string {
  if (item.product_variant_id) return `variant-${item.product_variant_id}`;
  if (item.product_id) return `product-${item.product_id}`;
  return `name-${item.product_name ?? ""}|${item.variant_title ?? ""}`;
}

export function purchaseOrderRows(document: PurchaseOrderDocument): PurchaseOrderRow[] {
  const rows = new Map<string, PurchaseOrderRow>();

  const add = (item: PurchaseOrderItem, bucket: "received" | "pending") => {
    const key = purchaseOrderRowKey(item);
    const quantity = Number(item.quantity ?? 0);
    const cost = Number(item.cost_amount ?? 0);
    const existing = rows.get(key);

    if (!existing) {
      rows.set(key, {
        ...item,
        receivedQuantity: bucket === "received" ? quantity : 0,
        pendingQuantity: bucket === "pending" ? quantity : 0,
        totalQuantity: quantity,
        receivedCost: bucket === "received" ? cost : 0,
        pendingCost: bucket === "pending" ? cost : 0,
        totalCost: cost,
        receiveCount: bucket === "received" ? 1 : 0,
        lastReceiveDate: item.receive_date ?? null,
      });
      return;
    }

    if (bucket === "received") {
      existing.receivedQuantity += quantity;
      existing.receivedCost += cost;
      existing.receiveCount += 1;
      if (!existing.lastReceiveDate || (item.receive_date && item.receive_date > existing.lastReceiveDate)) {
        existing.lastReceiveDate = item.receive_date ?? existing.lastReceiveDate;
      }
    } else {
      existing.pendingQuantity += quantity;
      existing.pendingCost += cost;
    }
    existing.totalQuantity += quantity;
    existing.totalCost += cost;
    // Giữ thông tin mô tả từ dòng đầu tiên gặp được.
    existing.product_name = existing.product_name ?? item.product_name;
    existing.variant_title = existing.variant_title ?? item.variant_title;
    existing.sku = existing.sku ?? item.sku;
    existing.barcode = existing.barcode ?? item.barcode;
  };

  for (const item of purchaseOrderReceivedItems(document)) add(item, "received");
  for (const item of purchaseOrderPendingItems(document)) add(item, "pending");

  return Array.from(rows.values());
}

/** Trạng thái nhập hàng của một dòng sản phẩm. */
export function purchaseOrderRowStatus(
  row: PurchaseOrderRow
): "received" | "partial" | "pending" {
  if (row.pendingQuantity <= 0) return "received";
  if (row.receivedQuantity > 0) return "partial";
  return "pending";
}

export function purchaseOrderTotals(document: PurchaseOrderDocument): PurchaseOrderTotals {
  const sum = (items: PurchaseOrderItem[]) => ({
    quantity: items.reduce((total, item) => total + Number(item.quantity ?? 0), 0),
    cost: items.reduce((total, item) => total + Number(item.cost_amount ?? 0), 0),
  });
  const received = sum(purchaseOrderReceivedItems(document));
  const pending = sum(purchaseOrderPendingItems(document));
  return {
    receivedQuantity: received.quantity,
    receivedCost: received.cost,
    pendingQuantity: pending.quantity,
    pendingCost: pending.cost,
    totalQuantity: received.quantity + pending.quantity,
    totalCost: received.cost + pending.cost,
  };
}

export type PurchaseOrderStatus = "received" | "partial" | "pending" | "closed";

export function purchaseOrderStatus(document: PurchaseOrderDocument): PurchaseOrderStatus {
  if (document.closed_at) return "closed";
  const { pendingQuantity, receivedQuantity } = purchaseOrderTotals(document);
  if (pendingQuantity <= 0) return "received";
  if (receivedQuantity > 0) return "partial";
  return "pending";
}

export const purchaseOrderStatusLabel: Record<PurchaseOrderStatus, string> = {
  received: "Đã nhập hết",
  partial: "Nhập một phần",
  pending: "Chờ nhập",
  closed: "Đã đóng",
};

export function purchaseOrderNumber(document: PurchaseOrderDocument): string {
  return document.purchase_number || document.ref_number || `#${document.id}`;
}

/** Supplier contact name and company name are separate fields in Haravan. */
export function purchaseOrderSupplierName(document: PurchaseOrderDocument): string | undefined {
  const supplier = document.supplier;
  if (!supplier) return undefined;
  if (typeof supplier === "string") return supplier;
  return supplier.supplier_name || supplier.name || undefined;
}

export interface PurchaseOrderLine {
  id?: number;
  product_id?: number;
  variant_id?: number;
  product_variant_id?: number;
  sku?: string | null;
  barcode?: string | null;
  quantity?: number;
  cost_amount?: number;
  cost?: number;
  price?: number;
  name?: string | null;
  title?: string | null;
}

export interface PurchaseReturnDocument {
  id: number;
  return_number?: string | null;
  ref_number?: string | null;
  ref_receive_id?: number | null;
  created_at?: string | null;
  returned_at?: string | null;
  notes?: string | null;
  status?: string | null;
  total?: number;
  total_cost?: number;
  supplier?: { id?: number; name?: string | null } | null;
  location?: { id?: number; name?: string | null } | null;
  line_items?: InventoryDocumentLine[] | InventoryDocumentLine;
}

export interface InventoryTransferDocument {
  id: number;
  transfer_number?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  tran_date?: string | null;
  received_at?: string | null;
  from_loc_id?: number;
  to_loc_id?: number;
  total?: number;
  reason?: string | null;
  note?: string | null;
  user_id?: number;
  status?: string | null;
  line_items?: InventoryDocumentLine[] | InventoryDocumentLine;
}

export function listPurchaseOrders(token: string, orgId: string, page = 1, limit = 20) {
  return haravanRequest<{ purchase_orders: PurchaseOrderDocument[] }>(
    orgId,
    "/purchase_orders",
    token,
    { params: { page, limit } }
  );
}

export function getPurchaseOrder(token: string, orgId: string, id: number) {
  return haravanRequest<{ purchase_order: PurchaseOrderDocument }>(
    orgId,
    `/purchase_orders/${id}`,
    token
  );
}

export function listPurchaseReturns(token: string, orgId: string, page = 1, limit = 20) {
  return haravanRequest<{ purchase_returns: PurchaseReturnDocument[] }>(
    orgId,
    "/purchase_returns",
    token,
    { params: { page, limit } }
  );
}

export function getPurchaseReturn(token: string, orgId: string, id: number) {
  return haravanRequest<{ purchase_return: PurchaseReturnDocument }>(
    orgId,
    `/purchase_returns/${id}`,
    token
  );
}

export function listInventoryTransfers(
  token: string,
  orgId: string,
  params: { page?: number; limit?: number; from_location_id?: number; to_location_id?: number } = {}
) {
  return haravanRequest<{ transfers: InventoryTransferDocument[] }>(
    orgId,
    "/inventory_transfers",
    token,
    { params }
  );
}

export function getInventoryTransfer(token: string, orgId: string, id: number) {
  return haravanRequest<{ transfer: InventoryTransferDocument }>(
    orgId,
    `/inventory_transfers/${id}`,
    token
  );
}

export function createInventoryTransfer(
  token: string,
  orgId: string,
  transfer: {
    from_loc_id: number;
    to_loc_id: number;
    note?: string;
    reason?: string;
    received_at?: string;
    line_items: InventoryLineItem[];
  }
) {
  return haravanRequest(orgId, "/inventory_transfers", token, {
    method: "POST",
    body: { transfer },
  });
}

export function receiveInventoryTransfer(token: string, orgId: string, id: number) {
  return haravanRequest(orgId, `/inventory_transfers/${id}/receive`, token, {
    method: "POST",
    body: { transfer: {} },
  });
}

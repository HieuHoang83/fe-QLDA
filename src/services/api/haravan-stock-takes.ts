import { countInventoryAdjustments, listInventoryAdjustments, type HaravanInventoryAdjustment } from "./inventory-adjustments";

const HARAVAN_ADJUSTMENT_PAGE_SIZE = 50;

export interface HaravanStockTake extends HaravanInventoryAdjustment {
  _id: string;
  count_number: string;
  createdAt?: string;
  balancedAt?: string;
  status: "completed";
  count_status: "counted" | "uncounted";
  balance_status: "balanced" | "unbalanced";
  mode: "all" | "selected";
  location_name: string;
  increased_quantity: number;
  decreased_quantity: number;
  difference_quantity: number;
  difference_value: number;
  line_items: Array<NonNullable<HaravanInventoryAdjustment["line_items"]>[number] & {
    variant_id: number;
    product_name: string;
    variant_title: string;
    difference: number;
  }>;
}

export interface HaravanStockTakeList {
  stock_takes: HaravanStockTake[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/** Stock count history is queried from Haravan adjustments tagged by the FE flow. */
export async function listHaravanStockTakes(
  token: string,
  orgId: string,
  page = 1,
  limit = 20,
): Promise<HaravanStockTakeList> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const matching: HaravanStockTake[] = [];
  const target = safePage * safeLimit + 1;
  const countResult = await countInventoryAdjustments(token, orgId);
  const apiPageCount = Math.ceil((countResult.count ?? 0) / HARAVAN_ADJUSTMENT_PAGE_SIZE);
  let hasMoreApiPages = apiPageCount > 0;
  for (let apiPage = 1; apiPage <= apiPageCount && matching.length < target; apiPage += 1) {
    const result = await listInventoryAdjustments(token, orgId, { page: apiPage, limit: HARAVAN_ADJUSTMENT_PAGE_SIZE });
    const batch = result.adjustments ?? result.inventory_adjustments ?? [];
    for (const adjustment of batch) {
      const tags = adjustment.tags?.split(",").map((tag) => tag.trim().toLocaleLowerCase("vi")) ?? [];
      const reason = adjustment.reason?.trim().toLocaleLowerCase("vi") ?? "";
      const isStocktake = reason === "stocktake"
        || reason.startsWith("kiem-kho")
        || tags.some((tag) => tag === "kiem-kho" || tag === "kiem-kho-all" || tag === "kiem-kho-selected");
      const lines = adjustment.line_items ?? [];
      const increased = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity ?? 0)), 0);
      const decreased = lines.reduce((sum, line) => sum + Math.min(0, Number(line.quantity ?? 0)), 0);
      matching.push({
        ...adjustment,
        _id: String(adjustment.id),
        count_number: adjustment.adjust_number || `IA${adjustment.id}`,
        createdAt: adjustment.created_at ?? undefined,
        balancedAt: adjustment.updated_at ?? undefined,
        status: "completed",
        count_status: isStocktake ? "counted" : "uncounted",
        balance_status: isStocktake && adjustment.updated_at === adjustment.created_at ? "unbalanced" : "balanced",
        mode: tags.includes("kiem-kho-all") || reason.endsWith("-all") ? "all" : "selected",
        location_name: `Kho #${adjustment.location_id ?? "—"}`,
        increased_quantity: increased,
        decreased_quantity: decreased,
        difference_quantity: increased + Math.abs(decreased),
        difference_value: Number(adjustment.total_cost ?? 0),
        line_items: lines.map((line, index) => ({
          ...line,
          variant_id: Number(line.product_variant_id ?? line.id ?? index),
          product_name: `Sản phẩm #${line.product_id ?? "—"}`,
          variant_title: "",
          difference: Number(line.quantity ?? 0),
        })),
      });
    }
    hasMoreApiPages = apiPage < apiPageCount;
    if (!hasMoreApiPages) break;
  }
  const offset = (safePage - 1) * safeLimit;
  return {
    stock_takes: matching.slice(offset, offset + safeLimit),
    total: matching.length,
    page: safePage,
    limit: safeLimit,
    hasMore: matching.length > offset + safeLimit || hasMoreApiPages,
  };
}

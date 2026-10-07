export interface Shop {
  orgId: string;
  name: string;
}

const SELECTED_SHOP_KEY = "haravan:selected-shop";
const STORED_SHOPS_KEY = "haravan:shops";

const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_HARAVAN_ORG_ID ?? "200001220496";
const DEFAULT_SHOP_NAME =
  process.env.NEXT_PUBLIC_HARAVAN_SHOP_NAME ?? "Shop Haravan";

function parseConfiguredShopList(raw?: string): Shop[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => {
      const [orgIdPart, ...nameParts] = entry.split(":");
      const orgId = orgIdPart.trim();
      const name = nameParts.join(":").trim();
      return { orgId, name: name || `Shop ${orgId}` };
    })
    .filter((shop) => /^\d+$/.test(shop.orgId));
}

export function dedupeShops(shops: Shop[]): Shop[] {
  const seen = new Set<string>();
  return shops.filter((shop) => {
    if (!shop?.orgId || seen.has(shop.orgId)) return false;
    seen.add(shop.orgId);
    return true;
  });
}

export function getDefaultShop(): Shop {
  return { orgId: DEFAULT_ORG_ID, name: DEFAULT_SHOP_NAME };
}

export function getConfiguredShops(): Shop[] {
  return dedupeShops([
    getDefaultShop(),
    ...parseConfiguredShopList(process.env.NEXT_PUBLIC_HARAVAN_SHOPS),
  ]);
}

export function getStoredShops(): Shop[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORED_SHOPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Shop[];
    if (!Array.isArray(parsed)) return [];
    return dedupeShops(
      parsed.filter(
        (shop): shop is Shop =>
          Boolean(shop) &&
          typeof shop.orgId === "string" &&
          typeof shop.name === "string"
      )
    );
  } catch {
    return [];
  }
}

export function saveStoredShops(shops: Shop[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORED_SHOPS_KEY, JSON.stringify(shops));
}

export function getSelectedShopId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_SHOP_KEY);
}

export function saveSelectedShopId(orgId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_SHOP_KEY, orgId);
}

export function buildShopList(): Shop[] {
  return dedupeShops([...getConfiguredShops(), ...getStoredShops()]);
}

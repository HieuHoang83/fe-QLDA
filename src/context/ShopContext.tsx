"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  buildShopList,
  dedupeShops,
  getConfiguredShops,
  getDefaultShop,
  getSelectedShopId,
  getStoredShops,
  saveSelectedShopId,
  saveStoredShops,
  type Shop,
} from "@/lib/shop";

interface ShopContextValue {
  shops: Shop[];
  currentShop: Shop;
  setCurrentShop: (orgId: string) => void;
  addShop: (shop: Shop) => void;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>(() => getConfiguredShops());
  const [currentOrgId, setCurrentOrgId] = useState<string>(
    () => getDefaultShop().orgId
  );

  useEffect(() => {
    const all = buildShopList();
    setShops(all);
    const saved = getSelectedShopId();
    if (saved && all.some((shop) => shop.orgId === saved)) {
      setCurrentOrgId(saved);
    } else if (all[0]) {
      setCurrentOrgId(all[0].orgId);
    }
  }, []);

  const setCurrentShop = useCallback((orgId: string) => {
    setCurrentOrgId(orgId);
    saveSelectedShopId(orgId);
  }, []);

  const addShop = useCallback((shop: Shop) => {
    if (!shop.orgId) return;
    const configured = getConfiguredShops();
    const custom = dedupeShops([...getStoredShops(), shop]).filter(
      (item) => !configured.some((entry) => entry.orgId === item.orgId)
    );
    saveStoredShops(custom);
    setShops(dedupeShops([...configured, ...custom]));
    setCurrentOrgId(shop.orgId);
    saveSelectedShopId(shop.orgId);
  }, []);

  const currentShop = useMemo(
    () =>
      shops.find((shop) => shop.orgId === currentOrgId) ??
      shops[0] ??
      getDefaultShop(),
    [shops, currentOrgId]
  );

  return (
    <ShopContext.Provider
      value={{ shops, currentShop, setCurrentShop, addShop }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error("useShop must be used within a ShopProvider");
  }
  return context;
}

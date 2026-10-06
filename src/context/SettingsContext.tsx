"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";

interface Settings {
  showCustomerOrderNumber: boolean;
  setShowCustomerOrderNumber: (value: boolean) => void;
}

const SettingsContext = createContext<Settings | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [showCustomerOrderNumber, setShowCustomerOrderNumber] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("showCustomerOrderNumber");
      return stored !== "false";
    }
    return true;
  });

  useEffect(() => {
    localStorage.setItem("showCustomerOrderNumber", String(showCustomerOrderNumber));
  }, [showCustomerOrderNumber]);

  return (
    <SettingsContext.Provider value={{ showCustomerOrderNumber, setShowCustomerOrderNumber }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
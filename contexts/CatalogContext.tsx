// Atelier Noir: fonte única de verdade do catálogo; mantém UI pública e admin alinhados ao documento principal.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { adaptPerfume, type Perfume } from "@/lib/catalog";
import { saveCatalog, subscribeApcStatus, subscribeCatalog, subscribeStockStatus, type ApcStatus, type CatalogDocument, type StockStatus } from "@/lib/firebase";

type CatalogContextValue = {
  perfumes: Perfume[];
  rawPerfumes: Record<string, unknown>[];
  isLoading: boolean;
  isLive: boolean;
  syncError: string | null;
  saveRawPerfumes: (next: Record<string, unknown>[]) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogDocument>({ perfumes: [] });
  const [apcStatus, setApcStatus] = useState<Record<string, ApcStatus>>({});
  const [stockStatus, setStockStatus] = useState<Record<string, StockStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => subscribeCatalog((next, fromServer) => {
    setCatalog(next);
    setIsLive(fromServer);
    setIsLoading(false);
    setSyncError(null);
  }, (error) => {
    setIsLoading(false);
    setIsLive(false);
    setSyncError(error.message || "Não foi possível sincronizar o catálogo.");
  }), []);

  useEffect(() => subscribeApcStatus(setApcStatus, () => setApcStatus({})), []);
  useEffect(() => subscribeStockStatus(setStockStatus, () => setStockStatus({})), []);

  const perfumes = useMemo(() => catalog.perfumes.map((raw, index) => adaptPerfume(raw, index, apcStatus[String(raw.id || "")], stockStatus[String(raw.id || "")])).filter((perfume) => perfume.available !== false), [catalog.perfumes, apcStatus, stockStatus]);
  const saveRawPerfumes = async (next: Record<string, unknown>[]) => {
    await saveCatalog(next);
    setCatalog((current) => ({ ...current, perfumes: next }));
  };

  return <CatalogContext.Provider value={{ perfumes, rawPerfumes: catalog.perfumes, isLoading, isLive, syncError, saveRawPerfumes }}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("useCatalog deve ser usado dentro de CatalogProvider");
  return value;
}

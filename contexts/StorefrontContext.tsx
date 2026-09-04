import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useCatalog } from "./CatalogContext";
import type { Perfume } from "@/lib/catalog";

export type BagItem = {
  slug: string;
  name: string;
  brand: string;
  volumeMl: number;
  unitPrice: number;
  quantity: number;
  isApc?: boolean;
};

type StorefrontContextValue = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  favorites: string[];
  favoritePerfumes: Perfume[];
  toggleFavorite: (slug: string) => void;
  bagItems: BagItem[];
  bagCount: number;
  bagTotal: number;
  addToBag: (item: Omit<BagItem, "quantity"> & { quantity?: number }) => void;
  removeFromBag: (slug: string, volumeMl: number, isApc?: boolean) => void;
  clearBag: () => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);
const FAVORITES_STORAGE_KEY = "siarom-favorites";
const BAG_STORAGE_KEY = "siarom-bag";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const { perfumes } = useCatalog();
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => readStorage(FAVORITES_STORAGE_KEY, []));
  const [bagItems, setBagItems] = useState<BagItem[]>(() => readStorage(BAG_STORAGE_KEY, []));

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    window.localStorage.setItem(BAG_STORAGE_KEY, JSON.stringify(bagItems));
  }, [bagItems]);

  const favoritePerfumes = useMemo(() => perfumes.filter((perfume) => favorites.includes(perfume.slug)), [favorites, perfumes]);
  const bagCount = useMemo(() => bagItems.reduce((total, item) => total + item.quantity, 0), [bagItems]);
  const bagTotal = useMemo(() => bagItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0), [bagItems]);

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  };

  const addToBag = (item: Omit<BagItem, "quantity"> & { quantity?: number }) => {
    setBagItems((current) => {
      const quantity = item.quantity ?? 1;
      const existingIndex = current.findIndex((entry) => entry.slug === item.slug && entry.volumeMl === item.volumeMl && Boolean(entry.isApc) === Boolean(item.isApc));
      if (existingIndex < 0) return [...current, { ...item, quantity }];
      return current.map((entry, index) => index === existingIndex ? { ...entry, quantity: entry.quantity + quantity } : entry);
    });
  };

  const removeFromBag = (slug: string, volumeMl: number, isApc?: boolean) => {
    setBagItems((current) => current.filter((item) => !(item.slug === slug && item.volumeMl === volumeMl && Boolean(item.isApc) === Boolean(isApc))));
  };

  return <StorefrontContext.Provider value={{ searchQuery, setSearchQuery, favorites, favoritePerfumes, toggleFavorite, bagItems, bagCount, bagTotal, addToBag, removeFromBag, clearBag: () => setBagItems([]) }}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const value = useContext(StorefrontContext);
  if (!value) throw new Error("useStorefront deve ser usado dentro de StorefrontProvider");
  return value;
}

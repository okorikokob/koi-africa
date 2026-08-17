"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  cartKey: string;
  productId: string;
  variantId?: string;
  sku?: string;
  gtin?: string;
  selectedOptions?: Array<{ name: string; value: string }>;
  title: string;
  brandName: string;
  image: string;
  priceNaira: number;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  totalNaira: number;
  count: number;
  addItem: (item: Omit<CartItem, "qty" | "cartKey">, qty?: number) => void;
  removeItem: (cartKey: string) => void;
  setQty: (cartKey: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "koi-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Array<CartItem & { id?: string }>;
        // Cart storage exists only in the browser and must hydrate after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setItems(parsed.map((item) => ({
          ...item,
          productId: item.productId ?? item.id ?? "",
          cartKey: item.cartKey ?? item.variantId ?? item.productId ?? item.id ?? "",
        })).filter((item) => item.productId && item.cartKey));
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "qty" | "cartKey">, qty = 1) => {
    const cartKey = item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
    setItems((current) => {
      const existing = current.find((i) => i.cartKey === cartKey);
      if (existing) {
        return current.map((i) => (i.cartKey === cartKey ? { ...i, qty: i.qty + qty } : i));
      }
      return [...current, { ...item, cartKey, qty }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((cartKey: string) => {
    setItems((current) => current.filter((i) => i.cartKey !== cartKey));
  }, []);

  const setQty = useCallback((cartKey: string, qty: number) => {
    setItems((current) =>
      qty <= 0
        ? current.filter((i) => i.cartKey !== cartKey)
        : current.map((i) => (i.cartKey === cartKey ? { ...i, qty } : i)),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const totalNaira = useMemo(
    () => items.reduce((sum, i) => sum + i.priceNaira * i.qty, 0),
    [items],
  );
  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  const value: CartContextValue = {
    items,
    isOpen,
    totalNaira,
    count,
    addItem,
    removeItem,
    setQty,
    clearCart,
    openCart,
    closeCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}

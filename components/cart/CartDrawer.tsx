"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/currency";

export function CartDrawer() {
  const { items, isOpen, totalNaira, removeItem, closeCart } = useCart();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="cart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/55 backdrop-blur-sm"
            onClick={closeCart}
          />
          <motion.div
            key="cart-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-x-0 bottom-0 z-[9999] flex max-h-[82vh] flex-col rounded-t-modal bg-surface p-5 pb-11 md:inset-y-0 md:inset-x-auto md:right-0 md:w-[440px] md:max-h-none md:rounded-none md:p-8"
          >
            <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-border md:hidden" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-black text-text-primary md:text-2xl">
                Your Cart 🛒
              </h2>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-secondary md:flex"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center py-9 text-center text-text-muted">
                  <div className="mb-2.5 text-4xl">🛍️</div>
                  <p className="mb-1 font-sans text-sm font-semibold text-text-secondary">
                    Your cart is empty
                  </p>
                  <p className="font-sans text-xs text-text-muted">
                    Browse brands to find something you love
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b border-border py-3.5"
                  >
                    <div className="relative h-[60px] w-[60px] flex-shrink-0 overflow-hidden rounded-[10px] bg-surface-secondary">
                      {item.image && (
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-[13px] font-bold text-text-primary">
                        {item.title}
                        {item.qty > 1 ? ` × ${item.qty}` : ""}
                      </p>
                      <p className="font-sans text-[11px] font-bold text-primary">
                        {item.brandName}
                      </p>
                    </div>
                    <span className="flex-shrink-0 font-sans text-sm font-black text-text-primary">
                      {formatNaira(item.priceNaira * item.qty)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                      className="flex-shrink-0 p-1 text-xl leading-none text-text-muted transition-colors hover:text-error"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div>
                <div className="flex items-center justify-between py-4 pt-[18px]">
                  <span className="font-sans text-[13px] font-semibold text-text-secondary">
                    Total (incl. delivery est.)
                  </span>
                  <span className="font-display text-[22px] font-black text-text-primary">
                    {formatNaira(totalNaira)}
                  </span>
                </div>
                <button
                  type="button"
                  className="w-full rounded-button bg-primary py-4 font-sans text-base font-extrabold text-primary-foreground transition-all hover:-translate-y-px hover:bg-primary-hover hover:shadow-md"
                >
                  Checkout — Pay in Naira 🇳🇬
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/currency";
import { calculateDeliveryFee } from "@/lib/pricing-config";

export default function CartPage() {
  const { items, totalNaira, removeItem, setQty } = useCart();
  const deliveryFee = calculateDeliveryFee(totalNaira);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1280px] flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <div className="text-5xl">🛍️</div>
        <h1 className="font-display text-2xl font-bold text-text-primary">Your cart is empty</h1>
        <p className="font-sans text-sm text-text-secondary">
          Browse brands to find something you love
        </p>
        <Link
          href="/brands"
          className="mt-3 inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Browse Brands
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 md:px-8 md:py-14">
      <div className="mb-8 flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-text-primary" />
        <h1 className="font-display text-2xl font-bold text-text-primary md:text-3xl">
          Your Cart
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        {/* Items */}
        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border py-5 first:pt-0 sm:flex-nowrap"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-secondary">
                {item.image && (
                  <Image src={item.image} alt={item.title} fill sizes="80px" className="object-cover" />
                )}
              </div>

              <div className="min-w-[140px] flex-1">
                <p className="font-sans text-sm font-bold text-text-primary">{item.title}</p>
                <p className="mt-1 font-sans text-sm font-bold text-text-primary">
                  {formatNaira(item.priceNaira)}
                </p>
              </div>

              <div className="flex shrink-0 items-center overflow-hidden rounded-2xl border-[1.5px] border-border bg-surface">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty(item.id, item.qty - 1)}
                  className="flex h-9 w-9 items-center justify-center text-text-primary transition-colors hover:bg-surface-secondary"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[22px] text-center font-display text-sm font-black text-text-primary">
                  {item.qty}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty(item.id, item.qty + 1)}
                  className="flex h-9 w-9 items-center justify-center text-text-primary transition-colors hover:bg-surface-secondary"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <span className="shrink-0 font-display text-base font-black text-text-primary">
                {formatNaira(item.priceNaira * item.qty)}
              </span>

              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="Remove item"
                className="shrink-0 p-1 text-text-muted transition-colors hover:text-error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="h-fit rounded-card border border-border bg-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Order Summary</h2>
          <div className="flex items-center justify-between py-2 font-sans text-sm text-text-secondary">
            <span>Subtotal</span>
            <span className="font-semibold text-text-primary">{formatNaira(totalNaira)}</span>
          </div>
          <div className="flex items-center justify-between py-2 font-sans text-sm text-text-secondary">
            <span>Delivery fee</span>
            <span className="font-semibold text-text-primary">{formatNaira(deliveryFee)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-border py-4">
            <span className="font-sans text-sm font-semibold text-text-primary">Total</span>
            <span className="font-display text-xl font-black text-text-primary">
              {formatNaira(totalNaira + deliveryFee)}
            </span>
          </div>
          <Link
            href="/checkout"
            className="flex w-full items-center justify-center rounded-button bg-primary py-4 font-sans text-base font-extrabold text-primary-foreground transition-all hover:-translate-y-px hover:bg-primary-hover hover:shadow-md"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}

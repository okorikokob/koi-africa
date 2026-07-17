"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Lock } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/currency";
import { calculateDeliveryFee } from "@/lib/pricing-config";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import type { CheckoutFormInput } from "@/lib/schemas";

export default function CheckoutPage() {
  const { items, totalNaira } = useCart();
  const [isFormValid, setIsFormValid] = useState(false);
  const [formData, setFormData] = useState<CheckoutFormInput | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const deliveryFee = calculateDeliveryFee(totalNaira);
  const total = totalNaira + deliveryFee;

  async function handlePay() {
    if (!formData) return;
    setIsSubmitting(true);
    setPayError(null);
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: items.map((item) => ({ productId: item.id, qty: item.qty })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        window.location.href = json.data.authorizationUrl;
      } else {
        setPayError(json.error ?? "Something went wrong. Please try again.");
        setIsSubmitting(false);
      }
    } catch {
      setPayError("Could not reach the server. Please try again.");
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-[1280px] flex-col items-center justify-center gap-3 px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-text-primary">Your cart is empty</h1>
        <p className="font-sans text-sm text-text-secondary">
          Add something to your cart before checking out.
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
      <h1 className="mb-8 font-display text-2xl font-bold text-text-primary md:text-3xl">
        Checkout
      </h1>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.6fr_1fr]">
        <CheckoutForm
          onValidChange={(valid, data) => {
            setIsFormValid(valid);
            setFormData(data);
          }}
        />

        {/* Order summary */}
        <div className="h-fit rounded-card border border-border bg-surface p-6 lg:sticky lg:top-24">
          <h2 className="mb-4 font-display text-lg font-bold text-text-primary">Order Summary</h2>

          <div className="mb-4 flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                  {item.image && (
                    <Image src={item.image} alt={item.title} fill sizes="48px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-xs font-semibold text-text-primary">
                    {item.title}
                    {item.qty > 1 ? ` × ${item.qty}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-sans text-xs font-bold text-text-primary">
                  {formatNaira(item.priceNaira * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-4">
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
                {formatNaira(total)}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!isFormValid || isSubmitting}
            onClick={handlePay}
            className="flex w-full items-center justify-center gap-2 rounded-button bg-primary py-4 font-sans text-base font-extrabold text-primary-foreground transition-all hover:-translate-y-px hover:bg-primary-hover hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {isSubmitting ? "Redirecting to Paystack…" : `Pay ${formatNaira(total)}`}
          </button>

          <p className="mt-3 text-center font-sans text-xs text-text-muted">
            {payError
              ? payError
              : isFormValid
                ? "You'll be redirected to Paystack to complete payment."
                : "Fill in your delivery details to continue."}
          </p>
        </div>
      </div>
    </div>
  );
}

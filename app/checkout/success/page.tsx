"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Truck } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/currency";

type OrderSummaryItem = { title: string; qty: number; image: string | null };

type VerifyState =
  | { status: "verifying" }
  | { status: "success"; orderReference: string; totalNaira: number; items: OrderSummaryItem[] }
  | { status: "error"; message: string };

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference");
  const { clearCart } = useCart();
  const [state, setState] = useState<VerifyState>({ status: "verifying" });

  useEffect(() => {
    if (!reference) {
      setState({ status: "error", message: "Missing payment reference." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const json = await res.json();
        if (cancelled) return;
        if (json.success) {
          clearCart();
          setState({
            status: "success",
            orderReference: json.data.orderReference,
            totalNaira: json.data.totalNaira ?? 0,
            items: json.data.items ?? [],
          });
        } else {
          setState({ status: "error", message: json.error ?? "Payment verification failed." });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Could not reach the server. Please try again." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      {state.status === "verifying" && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Confirming your payment…
          </h1>
          <p className="font-sans text-sm text-text-secondary">
            Please don&apos;t close this page.
          </p>
        </>
      )}

      {state.status === "success" && (
        <>
          <CheckCircle2 className="h-12 w-12 text-success" />
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Order confirmed!
          </h1>
          <p className="font-sans text-sm text-text-secondary">
            Your order reference is{" "}
            <span className="font-bold text-text-primary">{state.orderReference}</span>. We&apos;ll
            be in touch on WhatsApp with updates.
          </p>

          {state.items.length > 0 && (
            <div className="w-full rounded-card border border-border bg-surface p-5 text-left shadow-sm">
              <div className="flex flex-col gap-3">
                {state.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                      {item.image && (
                        <Image src={item.image} alt={item.title} fill className="object-cover" />
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-text-primary">
                      {item.title}
                      {item.qty > 1 ? ` × ${item.qty}` : ""}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="font-sans text-sm font-semibold text-text-primary">Total paid</span>
                <span className="font-display text-lg font-black text-text-primary">
                  {formatNaira(state.totalNaira)}
                </span>
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 font-sans text-xs text-text-muted">
            <Truck className="h-3.5 w-3.5" strokeWidth={1.75} />
            Estimated delivery: 7–14 business days
          </p>

          <div className="mt-3 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href="/track"
              className="inline-flex flex-1 items-center justify-center rounded-button border border-border bg-surface px-6 py-3 font-sans text-sm font-bold text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Track Your Order
            </Link>
            <Link
              href="/brands"
              className="inline-flex flex-1 items-center justify-center rounded-button bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Continue Shopping
            </Link>
          </div>
        </>
      )}

      {state.status === "error" && (
        <>
          <XCircle className="h-12 w-12 text-error" />
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Something went wrong
          </h1>
          <p className="font-sans text-sm text-text-secondary">{state.message}</p>
          <Link
            href="/checkout"
            className="mt-3 inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Back to Checkout
          </Link>
        </>
      )}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

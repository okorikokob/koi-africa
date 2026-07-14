"use client";

import { Suspense, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Search, Loader2, PackageSearch, MapPin } from "lucide-react";
import { formatNaira } from "@/lib/currency";
import { Reveal } from "@/components/motion/Reveal";

type OrderItem = { title: string; qty: number; image: string | null };

type OrderStatus =
  | "submitted"
  | "awaiting_payment"
  | "paid"
  | "sourcing"
  | "shipped"
  | "delivered"
  | "cancelled";

type OrderResult = {
  reference: string;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryState: string;
  subtotalNaira: number;
  deliveryFeeNaira: number;
  totalNaira: number;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  submitted: "Submitted",
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  sourcing: "Sourcing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_BADGE_CLASS: Record<OrderStatus, string> = {
  submitted: "bg-surface-secondary text-text-secondary",
  awaiting_payment: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  sourcing: "bg-primary-soft text-primary",
  shipped: "bg-primary-soft text-primary",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-error/10 text-error",
};

const TIMELINE_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "paid", label: "Order paid" },
  { key: "sourcing", label: "Sourcing from vendor" },
  { key: "shipped", label: "Shipped to Nigeria" },
  { key: "delivered", label: "Delivered" },
];

function timelineIndex(status: OrderStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; order: OrderResult }
  | { status: "error"; message: string };

function TrackContent() {
  const searchParams = useSearchParams();
  const [reference, setReference] = useState(searchParams.get("reference") ?? "");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<LookupState>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const json = await res.json();
      if (json.success) {
        setState({ status: "success", order: json.data });
      } else {
        setState({ status: "error", message: json.error ?? "Order not found." });
      }
    } catch {
      setState({ status: "error", message: "Could not reach the server. Please try again." });
    }
  }

  const order = state.status === "success" ? state.order : null;

  return (
    <div className="mx-auto min-h-screen max-w-[640px] px-4 py-14 md:px-8 md:py-20">
      <Reveal>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <PackageSearch className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-text-primary md:text-3xl">
            Track your order
          </h1>
          <p className="max-w-[440px] font-sans text-sm text-text-secondary">
            Enter your order reference and the email you checked out with.
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-start"
        >
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Order reference (e.g. KOI-7F3A2B)"
              required
              className="w-full rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email used at checkout"
              required
              className="w-full rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-button bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {state.status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" strokeWidth={2} />
            )}
            Track
          </button>
        </form>
      </Reveal>

      {state.status === "error" && (
        <Reveal delay={0.05}>
          <p className="mt-4 text-center font-sans text-sm text-error">{state.message}</p>
        </Reveal>
      )}

      {order && (
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col gap-6">
            <div className="flex items-center justify-between rounded-card border border-border bg-surface p-5 shadow-sm">
              <div>
                <p className="font-sans text-xs uppercase tracking-[0.08em] text-text-muted">
                  Order reference
                </p>
                <p className="mt-1 font-display text-lg font-bold text-text-primary">
                  {order.reference}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1.5 font-sans text-xs font-semibold ${STATUS_BADGE_CLASS[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>

            {order.status !== "cancelled" && (
              <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
                <h2 className="mb-5 font-display text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                  Order progress
                </h2>
                <ol className="flex flex-col gap-4">
                  {TIMELINE_STEPS.map((step, i) => {
                    const currentIdx = timelineIndex(order.status);
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <li key={step.key} className="flex items-start gap-4">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold ${
                            done
                              ? "bg-primary text-primary-foreground"
                              : active
                                ? "border-2 border-primary bg-primary-soft text-primary"
                                : "border border-border bg-surface-secondary text-text-muted"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <span
                          className={`pt-1.5 font-sans text-sm font-medium ${
                            done || active ? "text-text-primary" : "text-text-muted"
                          }`}
                        >
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                Items
              </h2>
              <div className="flex flex-col gap-3">
                {order.items.map((item, i) => (
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
                  {formatNaira(order.totalNaira)}
                </span>
              </div>
            </div>

            <div className="rounded-card border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-[0.08em] text-text-muted">
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                Delivery address
              </h2>
              <p className="font-sans text-sm text-text-secondary">
                {order.deliveryAddress}, {order.deliveryCity}, {order.deliveryState}
              </p>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  );
}

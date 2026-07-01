"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Loader2, Package, User, MapPin } from "lucide-react";
import { orderInputSchema } from "@/lib/schemas";

const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "NGN"];

type FieldError = Partial<Record<string, string>>;

type Props = {
  prefill?: {
    title?: string;
    vendorName?: string;
    vendorUrl?: string;
  };
};

export function OrderForm({ prefill }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});

  const [form, setForm] = useState({
    itemTitle: prefill?.title ?? "",
    itemVendorName: prefill?.vendorName ?? "",
    itemVendorUrl: prefill?.vendorUrl ?? "",
    itemPricePaid: "",
    itemPriceCurrency: "USD",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    setFieldErrors({});

    const payload = {
      customer_name: form.customerName,
      customer_email: form.customerEmail,
      customer_phone: form.customerPhone,
      delivery_address: form.deliveryAddress,
      delivery_city: form.deliveryCity,
      delivery_state: form.deliveryState,
      items: [
        {
          title: form.itemTitle,
          vendor_name: form.itemVendorName,
          vendor_url: form.itemVendorUrl || undefined,
          price_paid: parseFloat(form.itemPricePaid) || 0,
          price_currency: form.itemPriceCurrency,
          quantity: 1,
        },
      ],
    };

    try {
      orderInputSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: FieldError = {};
        error.issues.forEach((issue) => {
          const field = issue.path.map(String).join(".");
          errors[field] = issue.message;
        });
        setFieldErrors(errors);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push(`/checkout/${json.data.reference}`);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-10">
      {/* Section 1 — What you bought */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <Package className="h-5 w-5 text-primary" strokeWidth={1.75} />
            What did you buy?
          </h2>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Tell us about the item you purchased on the vendor&apos;s site.
          </p>
        </div>

        <Field label="Product name" error={fieldErrors["items.0.title"]}>
          <input
            type="text"
            placeholder="e.g. Air Max Pulse Sneakers"
            value={form.itemTitle}
            onChange={set("itemTitle")}
            className={inputCls(fieldErrors["items.0.title"])}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Store / brand name" error={fieldErrors["items.0.vendor_name"]}>
            <input
              type="text"
              placeholder="e.g. Nike"
              value={form.itemVendorName}
              onChange={set("itemVendorName")}
              className={inputCls(fieldErrors["items.0.vendor_name"])}
            />
          </Field>

          <Field label="Link to the product (optional)" error={fieldErrors["items.0.vendor_url"]}>
            <input
              type="url"
              placeholder="https://www.nike.com/..."
              value={form.itemVendorUrl}
              onChange={set("itemVendorUrl")}
              className={inputCls(fieldErrors["items.0.vendor_url"])}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Price you paid" error={fieldErrors["items.0.price_paid"]}>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.itemPricePaid}
              onChange={set("itemPricePaid")}
              className={inputCls(fieldErrors["items.0.price_paid"])}
            />
          </Field>

          <Field label="Currency" error={fieldErrors["items.0.price_currency"]}>
            <select
              value={form.itemPriceCurrency}
              onChange={set("itemPriceCurrency")}
              className={inputCls(fieldErrors["items.0.price_currency"])}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Section 2 — Your details */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <User className="h-5 w-5 text-primary" strokeWidth={1.75} />
            Your details
          </h2>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            We&apos;ll use these to contact you about your delivery.
          </p>
        </div>

        <Field label="Full name" error={fieldErrors["customer_name"]}>
          <input
            type="text"
            placeholder="Amara Okafor"
            value={form.customerName}
            onChange={set("customerName")}
            className={inputCls(fieldErrors["customer_name"])}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email address" error={fieldErrors["customer_email"]}>
            <input
              type="email"
              placeholder="amara@example.com"
              value={form.customerEmail}
              onChange={set("customerEmail")}
              className={inputCls(fieldErrors["customer_email"])}
            />
          </Field>

          <Field label="WhatsApp number" error={fieldErrors["customer_phone"]}>
            <input
              type="tel"
              placeholder="+234 800 000 0000"
              value={form.customerPhone}
              onChange={set("customerPhone")}
              className={inputCls(fieldErrors["customer_phone"])}
            />
          </Field>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Section 3 — Delivery address */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} />
            Delivery address
          </h2>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Where should KOI deliver your item in Nigeria?
          </p>
        </div>

        <Field label="Street address" error={fieldErrors["delivery_address"]}>
          <textarea
            rows={2}
            placeholder="15 Adeola Odeku Street, Victoria Island"
            value={form.deliveryAddress}
            onChange={set("deliveryAddress")}
            className={`${inputCls(fieldErrors["delivery_address"])} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" error={fieldErrors["delivery_city"]}>
            <input
              type="text"
              placeholder="Lagos"
              value={form.deliveryCity}
              onChange={set("deliveryCity")}
              className={inputCls(fieldErrors["delivery_city"])}
            />
          </Field>

          <Field label="State" error={fieldErrors["delivery_state"]}>
            <input
              type="text"
              placeholder="Lagos State"
              value={form.deliveryState}
              onChange={set("deliveryState")}
              className={inputCls(fieldErrors["delivery_state"])}
            />
          </Field>
        </div>
      </section>

      {/* Server error */}
      {serverError && (
        <p className="rounded-button bg-error/10 px-4 py-3 font-sans text-sm text-error">
          {serverError}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-primary px-6 py-4 font-display text-base font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Submitting order…" : "Submit order"}
      </button>

      <p className="text-center font-sans text-xs text-text-muted">
        By submitting you confirm you have purchased this item on the vendor&apos;s site.
        KOI will review your order and send you a delivery fee quote.
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-sm font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {error && (
        <p className="font-sans text-xs text-error">{error}</p>
      )}
    </div>
  );
}

function inputCls(error?: string) {
  return [
    "w-full rounded-button bg-surface px-4 py-3 font-sans text-base text-text-primary",
    "placeholder:text-text-muted outline-none transition-colors duration-150",
    "border",
    error
      ? "border-error focus:ring-1 focus:ring-error"
      : "border-border focus:border-primary focus:ring-1 focus:ring-primary",
  ].join(" ");
}

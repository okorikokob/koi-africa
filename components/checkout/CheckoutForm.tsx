"use client";

import { useState } from "react";
import { z } from "zod";
import { User, MapPin } from "lucide-react";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/schemas";
import { NIGERIA_STATES } from "@/lib/nigeria-states";

type FieldError = Partial<Record<keyof CheckoutFormInput, string>>;

type Props = {
  onValidChange: (valid: boolean, data: CheckoutFormInput | null) => void;
};

const EMPTY_FORM: CheckoutFormInput = {
  fullName: "",
  email: "",
  whatsapp: "",
  address: "",
  city: "",
  state: "",
  landmark: "",
};

export function CheckoutForm({ onValidChange }: Props) {
  const [form, setForm] = useState<CheckoutFormInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [touched, setTouched] = useState(false);

  const set = (key: keyof CheckoutFormInput) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    validate(next, touched);
  };

  function validate(data: CheckoutFormInput, showErrors: boolean) {
    const result = checkoutFormSchema.safeParse(data);
    if (result.success) {
      setFieldErrors({});
      onValidChange(true, result.data);
      return;
    }
    onValidChange(false, null);
    if (!showErrors) return;
    const errors: FieldError = {};
    (result.error as z.ZodError).issues.forEach((issue) => {
      const field = issue.path[0] as keyof CheckoutFormInput;
      errors[field] = issue.message;
    });
    setFieldErrors(errors);
  }

  function handleBlur() {
    setTouched(true);
    validate(form, true);
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Section 1 — Your details */}
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

        <Field label="Full name" error={fieldErrors.fullName}>
          <input
            type="text"
            placeholder="Amara Okafor"
            value={form.fullName}
            onChange={set("fullName")}
            onBlur={handleBlur}
            className={inputCls(fieldErrors.fullName)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Email address" error={fieldErrors.email}>
            <input
              type="email"
              placeholder="amara@example.com"
              value={form.email}
              onChange={set("email")}
              onBlur={handleBlur}
              className={inputCls(fieldErrors.email)}
            />
          </Field>

          <Field label="WhatsApp number" error={fieldErrors.whatsapp}>
            <input
              type="tel"
              placeholder="+234 800 000 0000"
              value={form.whatsapp}
              onChange={set("whatsapp")}
              onBlur={handleBlur}
              className={inputCls(fieldErrors.whatsapp)}
            />
          </Field>
        </div>
      </section>

      <div className="h-px bg-border" />

      {/* Section 2 — Delivery address */}
      <section className="flex flex-col gap-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text-primary">
            <MapPin className="h-5 w-5 text-primary" strokeWidth={1.75} />
            Delivery address
          </h2>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Where should KOI deliver your order?
          </p>
        </div>

        <Field label="Street address" error={fieldErrors.address}>
          <textarea
            rows={2}
            placeholder="15 Adeola Odeku Street, Victoria Island"
            value={form.address}
            onChange={set("address")}
            onBlur={handleBlur}
            className={`${inputCls(fieldErrors.address)} resize-none`}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" error={fieldErrors.city}>
            <input
              type="text"
              placeholder="Lagos"
              value={form.city}
              onChange={set("city")}
              onBlur={handleBlur}
              className={inputCls(fieldErrors.city)}
            />
          </Field>

          <Field label="State" error={fieldErrors.state}>
            <select
              value={form.state}
              onChange={set("state")}
              onBlur={handleBlur}
              className={inputCls(fieldErrors.state)}
            >
              <option value="">Select a state</option>
              {NIGERIA_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Landmark (optional)">
          <input
            type="text"
            placeholder="Near Silverbird Galleria"
            value={form.landmark}
            onChange={set("landmark")}
            onBlur={handleBlur}
            className={inputCls()}
          />
        </Field>
      </section>
    </div>
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

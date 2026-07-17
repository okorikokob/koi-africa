"use client";

import { useActionState } from "react";
import { Loader2, Send } from "lucide-react";
import { submitContactForm, type ContactActionState } from "@/actions/contact";

const initialState: ContactActionState = { success: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);

  if (state.success) {
    return (
      <div className="rounded-card border border-border bg-surface p-6 text-center shadow-sm">
        <p className="font-sans text-sm font-bold text-success">Message sent.</p>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Thanks for reaching out — we&apos;ll get back to you by email shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[20px] border border-border bg-surface p-6 shadow-sm md:p-7"
    >
      <div>
        <label htmlFor="name" className="mb-1.5 block font-sans text-xs font-bold text-text-primary">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block font-sans text-xs font-bold text-text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label htmlFor="message" className="mb-1.5 block font-sans text-xs font-bold text-text-primary">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="How can we help? Include your order reference if this is about an order."
          className="w-full resize-none rounded-button border border-border bg-surface px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {state.error && <p className="font-sans text-sm text-error">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center justify-center gap-2 rounded-button bg-primary px-6 py-3 font-sans text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" strokeWidth={2} />}
        Send message
      </button>
    </form>
  );
}

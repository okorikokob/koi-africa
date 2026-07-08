// Server-only Paystack helpers for the Chowdeck full-payment checkout flow.
// PAYSTACK_SECRET_KEY must never be exposed to the client.

const PAYSTACK_BASE_URL = "https://api.paystack.co";

export function generatePaymentReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "";
  for (let i = 0; i < 6; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `KOI-${ref}`;
}

export async function initializePayment(params: {
  email: string;
  amountNaira: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountNaira * 100), // kobo
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  if (!res.ok) throw new Error(`Paystack init error: ${res.status}`);
  const json = await res.json();
  return {
    authorizationUrl: json.data.authorization_url as string,
    reference: json.data.reference as string,
  };
}

export type VerifyPaymentResult = {
  success: boolean;
  amountNaira: number;
  channel: string;
  email: string;
  metadata: Record<string, unknown>;
};

// Source of truth for whether a payment actually succeeded — never trust the
// client's redirect alone.
export async function verifyPayment(reference: string): Promise<VerifyPaymentResult> {
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}` },
  });

  if (!res.ok) throw new Error(`Paystack verify error: ${res.status}`);
  const json = await res.json();
  return {
    success: json.data.status === "success",
    amountNaira: json.data.amount / 100,
    channel: json.data.channel as string,
    email: json.data.customer?.email as string,
    metadata: (json.data.metadata as Record<string, unknown>) ?? {},
  };
}

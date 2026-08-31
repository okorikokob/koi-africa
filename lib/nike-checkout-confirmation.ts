import { NikeCheckoutValidationError } from "@/lib/nike-checkout-validation";

export type NikeCheckoutConfirmationInput = {
  productId: string;
  sourceVariantId: string;
};

export type NikeCheckoutConfirmationPrice = {
  productId: string;
  sourceVariantId: string;
  price: number;
  currency: string;
};

export type NikePriorityRefreshState = {
  productId: string;
  status: "starting" | "running" | "succeeded" | "failed";
  errorMessage: string | null;
};

export type NikeCheckoutConfirmationResult = {
  status: "ready" | "pending" | "failed" | "unavailable";
  prices: NikeCheckoutConfirmationPrice[];
  message: string | null;
};

type ConfirmedVariant = {
  variantId: string;
  price: number;
  currency: string;
};

export async function confirmNikeCheckoutItems(
  items: NikeCheckoutConfirmationInput[],
  dependencies: {
    validate: (productId: string, sourceVariantId: string) => Promise<ConfirmedVariant>;
    findRefreshStates: (productIds: string[]) => Promise<NikePriorityRefreshState[]>;
  },
): Promise<NikeCheckoutConfirmationResult> {
  const outcomes = await Promise.all(items.map(async (item) => {
    try {
      const confirmed = await dependencies.validate(item.productId, item.sourceVariantId);
      return {
        kind: "ready" as const,
        price: {
          productId: item.productId,
          sourceVariantId: confirmed.variantId,
          price: confirmed.price,
          currency: confirmed.currency,
        },
      };
    } catch (error) {
      if (error instanceof NikeCheckoutValidationError) {
        if (error.code === "CATALOG_STALE") return { kind: "pending" as const, item };
        return { kind: "unavailable" as const, message: error.message };
      }
      return {
        kind: "failed" as const,
        message: error instanceof Error ? error.message : "Nike availability confirmation failed.",
      };
    }
  }));

  const unavailable = outcomes.find((outcome) => outcome.kind === "unavailable");
  if (unavailable) {
    return { status: "unavailable", prices: [], message: unavailable.message };
  }

  const failed = outcomes.find((outcome) => outcome.kind === "failed");
  if (failed) {
    return {
      status: "failed",
      prices: [],
      message: "We could not confirm this Nike item right now. No payment has been taken.",
    };
  }

  const pending = outcomes.filter((outcome) => outcome.kind === "pending");
  if (pending.length > 0) {
    const states = await dependencies.findRefreshStates(pending.map((outcome) => outcome.item.productId));
    const statesByProduct = new Map(states.map((state) => [state.productId, state]));
    const terminalFailure = pending.some((outcome) => {
      const state = statesByProduct.get(outcome.item.productId);
      return state?.status === "failed" || state?.status === "succeeded";
    });
    if (terminalFailure) {
      return {
        status: "failed",
        prices: [],
        message: "We could not confirm this Nike item right now. No payment has been taken.",
      };
    }
    return { status: "pending", prices: [], message: null };
  }

  return {
    status: "ready",
    prices: outcomes.flatMap((outcome) => outcome.kind === "ready" ? [outcome.price] : []),
    message: null,
  };
}

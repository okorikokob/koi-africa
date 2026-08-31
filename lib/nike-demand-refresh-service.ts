import { db } from "@/database/client";
import { NikeProactiveRefreshRepository } from "@/database/repositories/nikeProactiveRefreshRepository";
import { requestNikePriorityRefresh } from "@/lib/nike-checkout-service";
import { prewarmNikeProduct } from "@/lib/nike-demand-refresh";

const repository = new NikeProactiveRefreshRepository(db);

export async function prewarmConfiguredNikeProduct(productId: string) {
  return prewarmNikeProduct(productId, {
    repository,
    refreshRequester: { request: requestNikePriorityRefresh },
  });
}

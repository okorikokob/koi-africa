import {
  nikeProactiveRefreshSettings,
  type NikeProactiveRefreshCandidate,
  type NikeProactiveRefreshRequester,
} from "@/lib/nike-proactive-refresh";

export interface NikeDemandRefreshRepository {
  findDueProduct(input: {
    productId: string;
    staleBefore: Date;
    now: Date;
  }): Promise<NikeProactiveRefreshCandidate | null>;
}

export type NikeDemandRefreshResult = {
  eligible: boolean;
  triggered: boolean;
};

export async function prewarmNikeProduct(
  productId: string,
  dependencies: {
    repository: NikeDemandRefreshRepository;
    refreshRequester: NikeProactiveRefreshRequester;
    now?: Date;
    ageMinutes?: number;
  },
): Promise<NikeDemandRefreshResult> {
  const now = dependencies.now ?? new Date();
  const ageMinutes = dependencies.ageMinutes ?? nikeProactiveRefreshSettings().ageMinutes;
  const staleBefore = new Date(now.getTime() - ageMinutes * 60_000);
  const candidate = await dependencies.repository.findDueProduct({ productId, staleBefore, now });

  if (!candidate) return { eligible: false, triggered: false };

  const result = await dependencies.refreshRequester.request(candidate);
  return { eligible: true, triggered: result.triggered };
}

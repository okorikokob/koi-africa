import { nikeCheckoutFreshnessMinutes } from "@/lib/nike-checkout-validation";

export const DEFAULT_NIKE_PROACTIVE_REFRESH_AGE_MINUTES = 20;
export const DEFAULT_NIKE_PROACTIVE_REFRESH_BATCH_SIZE = 10;

export type NikeProactiveRefreshCandidate = {
  productId: string;
  sourceProductId: string;
  canonicalUrl: string;
};

export interface NikeProactiveRefreshRepository {
  findDue(input: { staleBefore: Date; now: Date; limit: number }): Promise<NikeProactiveRefreshCandidate[]>;
}

export interface NikeProactiveRefreshRequester {
  request(input: NikeProactiveRefreshCandidate): Promise<{ triggered: boolean }>;
}

export type NikeProactiveRefreshSweepResult = {
  candidates: number;
  triggered: number;
  deduplicated: number;
  failed: number;
  failures: Array<{ productId: string; error: string }>;
};

export function isAuthorizedNikeRefreshSweep(
  authorization: string | null,
  secret: string | undefined = process.env.CRON_SECRET,
): boolean {
  return Boolean(secret) && authorization === `Bearer ${secret}`;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function nikeProactiveRefreshSettings(
  environment: Record<string, string | undefined> = process.env,
): { ageMinutes: number; batchSize: number } {
  const checkoutMinutes = nikeCheckoutFreshnessMinutes(environment);
  const defaultAge = Math.min(
    DEFAULT_NIKE_PROACTIVE_REFRESH_AGE_MINUTES,
    Math.max(1, checkoutMinutes - 10),
  );
  const configuredAge = positiveInteger(environment.KOI_NIKE_PROACTIVE_REFRESH_AGE_MINUTES, defaultAge);
  return {
    ageMinutes: Math.min(configuredAge, Math.max(1, checkoutMinutes - 1)),
    batchSize: Math.min(
      positiveInteger(environment.KOI_NIKE_PROACTIVE_REFRESH_BATCH_SIZE, DEFAULT_NIKE_PROACTIVE_REFRESH_BATCH_SIZE),
      25,
    ),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function runNikeProactiveRefreshSweep(
  dependencies: {
    repository: NikeProactiveRefreshRepository;
    refreshRequester: NikeProactiveRefreshRequester;
    now?: Date;
    ageMinutes?: number;
    batchSize?: number;
  },
): Promise<NikeProactiveRefreshSweepResult> {
  const now = dependencies.now ?? new Date();
  const settings = nikeProactiveRefreshSettings();
  const ageMinutes = dependencies.ageMinutes ?? settings.ageMinutes;
  const batchSize = dependencies.batchSize ?? settings.batchSize;
  const staleBefore = new Date(now.getTime() - ageMinutes * 60_000);
  const candidates = await dependencies.repository.findDue({ staleBefore, now, limit: batchSize });
  const outcomes = await Promise.all(candidates.map(async (candidate) => {
    try {
      return await dependencies.refreshRequester.request(candidate);
    } catch (error) {
      return { triggered: false, error: errorMessage(error) };
    }
  }));
  const failures = outcomes.flatMap((outcome, index) => "error" in outcome
    ? [{ productId: candidates[index]!.productId, error: outcome.error }]
    : []);
  return {
    candidates: candidates.length,
    triggered: outcomes.filter((outcome) => outcome.triggered).length,
    deduplicated: outcomes.filter((outcome) => !("error" in outcome) && !outcome.triggered).length,
    failed: failures.length,
    failures,
  };
}

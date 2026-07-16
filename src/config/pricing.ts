import { supabase } from "../lib/supabase";

export const PURCHASABLE_PLAN_TYPES = ["essential", "custom"] as const;

export type PurchasablePlanType = (typeof PURCHASABLE_PLAN_TYPES)[number];

export type PlanPricing = {
  planType: PurchasablePlanType;
  currentPrice: number;
  regularPrice: number;
  isOnSale: boolean;
  promotionLabel: string | null;
  pricingRuleId: string | null;
  source: "database" | "fallback";
};

export type PricingCatalog = Record<PurchasablePlanType, PlanPricing>;

type PricingRpcRow = {
  plan_type: string;
  unit_price: number | string;
  compare_at_price: number | string | null;
  promotion_label: string | null;
  pricing_rule_id: string;
};

/**
 * Respaldo usado únicamente si Supabase no puede entregar los precios activos.
 * La fuente de verdad para cobrar pedidos es public.plan_prices en la base de datos.
 */
export const FALLBACK_PRICING_CATALOG: PricingCatalog = {
  essential: {
    planType: "essential",
    currentPrice: 39,
    regularPrice: 39,
    isOnSale: false,
    promotionLabel: null,
    pricingRuleId: null,
    source: "fallback",
  },
  custom: {
    planType: "custom",
    currentPrice: 59,
    regularPrice: 59,
    isOnSale: false,
    promotionLabel: null,
    pricingRuleId: null,
    source: "fallback",
  },
};

let cachedCatalog: PricingCatalog | null = null;
let pendingCatalogRequest: Promise<PricingCatalog> | null = null;

export function isPurchasablePlanType(
  value: unknown
): value is PurchasablePlanType {
  return PURCHASABLE_PLAN_TYPES.includes(value as PurchasablePlanType);
}

function parseMoney(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function cloneFallbackCatalog(): PricingCatalog {
  return {
    essential: { ...FALLBACK_PRICING_CATALOG.essential },
    custom: { ...FALLBACK_PRICING_CATALOG.custom },
  };
}

export function getPlanPricing(
  planType: PurchasablePlanType,
  catalog: PricingCatalog = FALLBACK_PRICING_CATALOG
) {
  return catalog[planType];
}

export function getCurrentPlanPrice(
  planType: PurchasablePlanType,
  catalog: PricingCatalog = FALLBACK_PRICING_CATALOG
) {
  return getPlanPricing(planType, catalog).currentPrice;
}

export function formatPrice(
  amount: number,
  options: { alwaysShowDecimals?: boolean } = {}
) {
  const alwaysShowDecimals = options.alwaysShowDecimals ?? false;

  return `S/ ${amount.toLocaleString("es-PE", {
    minimumFractionDigits: alwaysShowDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export async function loadPricingCatalog(options?: {
  forceRefresh?: boolean;
}): Promise<PricingCatalog> {
  if (!options?.forceRefresh && cachedCatalog) {
    return cachedCatalog;
  }

  if (!options?.forceRefresh && pendingCatalogRequest) {
    return pendingCatalogRequest;
  }

  pendingCatalogRequest = (async () => {
    const { data, error } = await supabase.rpc("get_current_plan_prices");

    if (error) {
      throw new Error(error.message || "No se pudieron cargar los precios.");
    }

    const nextCatalog = cloneFallbackCatalog();

    for (const row of (data ?? []) as PricingRpcRow[]) {
      if (!isPurchasablePlanType(row.plan_type)) continue;

      const currentPrice = parseMoney(row.unit_price);
      const compareAtPrice = parseMoney(row.compare_at_price);

      if (currentPrice === null) continue;

      const regularPrice =
        compareAtPrice !== null && compareAtPrice > currentPrice
          ? compareAtPrice
          : currentPrice;

      nextCatalog[row.plan_type] = {
        planType: row.plan_type,
        currentPrice,
        regularPrice,
        isOnSale: regularPrice > currentPrice,
        promotionLabel:
          regularPrice > currentPrice
            ? row.promotion_label?.trim() || "Promoción"
            : null,
        pricingRuleId: row.pricing_rule_id || null,
        source: "database",
      };
    }

    cachedCatalog = nextCatalog;
    return nextCatalog;
  })();

  try {
    return await pendingCatalogRequest;
  } finally {
    pendingCatalogRequest = null;
  }
}

export function clearPricingCache() {
  cachedCatalog = null;
  pendingCatalogRequest = null;
}

import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP_URLS } from "../../config/contact";
import { plans } from "../../data/plans";
import {
  formatPrice,
  isPurchasablePlanType,
  type PricingCatalog,
} from "../../config/pricing";
import { usePricingCatalog } from "../../hooks/usePricing";
import type { Plan } from "../../types";

const ALLY_WHATSAPP_URL = SUPPORT_WHATSAPP_URLS.ally;

const sectionBenefits = [
  { icon: "🔒", text: "Pago único, sin suscripciones" },
  { icon: "📱", text: "Compatible con NFC + QR" },
  { icon: "⚡", text: "Activación simple en minutos" },
];

function normalizeText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function getPlanAction(plan: Plan) {
  const normalizedId = normalizeText(plan.id);
  const normalizedName = normalizeText(plan.name);

  if (
    normalizedId.includes("essential") ||
    normalizedName.includes("essential")
  ) {
    return {
      type: "internal" as const,
      to: "/pedido?add=essential",
    };
  }

  if (normalizedId.includes("custom") || normalizedName.includes("custom")) {
    return {
      type: "internal" as const,
      to: "/pedido?add=custom",
    };
  }

  return {
    type: "external" as const,
    href: ALLY_WHATSAPP_URL,
  };
}

function PriceBlock({
  plan,
  isHighlighted,
  pricingCatalog,
}: {
  plan: Plan;
  isHighlighted: boolean;
  pricingCatalog: PricingCatalog;
}) {
  if (!isPurchasablePlanType(plan.id)) {
    return (
      <div className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        Planes a tu medida
      </div>
    );
  }

  const pricing = pricingCatalog[plan.id];
  const mutedTextClass = isHighlighted ? "text-black/50" : "text-white/45";
  const priceClass = isHighlighted ? "text-[#1A1A14]" : "text-[#F5F0E8]";
  const promotionPillClass = isHighlighted
    ? "border-black/10 bg-black/10 text-[#1A1A14]"
    : "border-[#E8C547]/25 bg-[#E8C547]/10 text-[#E8C547]";

  return (
    <div className="space-y-3">
      {pricing.isOnSale && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-medium sm:text-sm ${mutedTextClass}`}>
            Precio regular
          </span>

          <span
            className={`relative text-xl font-semibold tracking-tight sm:text-2xl ${mutedTextClass}`}
            aria-label={`Precio regular ${formatPrice(pricing.regularPrice)}`}
          >
            <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rotate-[-8deg] rounded-full bg-current" />
            {formatPrice(pricing.regularPrice)}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className={`text-4xl font-semibold tracking-tight sm:text-5xl ${priceClass}`}>
          {formatPrice(pricing.currentPrice)}
        </div>

        {pricing.isOnSale && pricing.promotionLabel && (
          <span
            className={`mb-1 inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-xs sm:tracking-[0.16em] ${promotionPillClass}`}
          >
            {pricing.promotionLabel}
          </span>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  pricingCatalog,
}: {
  plan: Plan;
  pricingCatalog: PricingCatalog;
}) {
  const action = getPlanAction(plan);
  const isHighlighted = !!plan.highlighted;

  const cardClass = isHighlighted
    ? "relative overflow-hidden rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547] p-5 text-[#1A1A14] shadow-[0_20px_70px_rgba(232,197,71,0.18)] transition hover:-translate-y-[2px] sm:rounded-[32px] sm:p-6"
    : "relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-[#F5F0E8] shadow-[0_20px_70px_rgba(0,0,0,0.16)] transition hover:-translate-y-[2px] hover:border-white/15 hover:bg-white/[0.055] sm:rounded-[32px] sm:p-6";

  const planNameClass = isHighlighted
    ? "text-sm font-semibold text-black/65"
    : "text-sm font-semibold text-white/58";

  const priceLabelClass = isHighlighted ? "text-black/60" : "text-white/50";

  const featureClass = isHighlighted ? "text-black/80" : "text-white/74";

  const ctaClass = isHighlighted
    ? "mt-7 inline-flex w-full items-center justify-center rounded-2xl bg-[#15120A] px-5 py-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:bg-black sm:mt-9"
    : "mokko-button-secondary mt-7 inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm sm:mt-9";

  const renderCTA = () => {
    if (action.type === "internal") {
      return (
        <Link to={action.to} className={ctaClass}>
          {plan.cta}
        </Link>
      );
    }

    return (
      <a
        href={action.href}
        target="_blank"
        rel="noreferrer"
        className={ctaClass}
      >
        {plan.cta}
      </a>
    );
  };

  return (
    <article className={cardClass}>
      <div
        className={
          isHighlighted
            ? "absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/15 blur-2xl"
            : "absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#E8C547]/8 blur-2xl"
        }
      />

      <div
        className={
          isHighlighted
            ? "absolute inset-x-0 top-0 h-px bg-white/25"
            : "absolute inset-x-0 top-0 h-px bg-white/10"
        }
      />

      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className={planNameClass}>{plan.name}</div>

          {plan.badge && (
            <span
              className={
                isHighlighted
                  ? "rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-[#1A1A14]"
                  : "rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-xs font-semibold text-[#E8C547]"
              }
            >
              {plan.badge}
            </span>
          )}
        </div>

        <div className="mt-5">
          <PriceBlock
            plan={plan}
            isHighlighted={isHighlighted}
            pricingCatalog={pricingCatalog}
          />
        </div>

        <div className={`mt-3 text-sm ${priceLabelClass}`}>
          {plan.priceLabel}
        </div>

        <ul className={`mt-6 space-y-3 text-sm leading-7 sm:mt-8 sm:text-[15px] ${featureClass}`}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className={isHighlighted ? "text-black/55" : "text-[#E8C547]"}>
                •
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {renderCTA()}
      </div>
    </article>
  );
}

export default function Placas() {
  const { catalog: pricingCatalog } = usePricingCatalog();

  return (
    <section id="planes" className="relative bg-black/20 py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8C547] sm:text-sm sm:tracking-[0.22em]">
            Placas
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Elige la placa ideal para proteger a tu mascota.
          </h2>

          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-white/65 sm:text-lg sm:leading-8">
            Desde una opción esencial hasta una versión personalizada, todas las
            placas Mokko incluyen identificación inteligente, perfil digital y
            activación simple.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:mt-12 lg:grid-cols-3 lg:gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              pricingCatalog={pricingCatalog}
            />
          ))}
        </div>

        <div className="mt-7 grid gap-3 text-sm text-white/62 sm:flex sm:flex-wrap sm:items-center sm:gap-3 md:mt-8">
          {sectionBenefits.map((item) => (
            <div
              key={item.text}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"
            >
              <span className="text-[#E8C547]">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
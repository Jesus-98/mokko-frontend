import { Link } from "react-router-dom";
import { SUPPORT_WHATSAPP_URLS } from "../../config/contact";
import { plans } from "../../data/plans";
import type { Plan } from "../../types";

const ALLY_WHATSAPP_URL = SUPPORT_WHATSAPP_URLS.ally;

const REGULAR_PRICES_BY_PLAN_ID: Record<string, string> = {
  essential: "S/ 39",
  custom: "S/ 59",
};

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

function getRegularPrice(plan: Plan) {
  return REGULAR_PRICES_BY_PLAN_ID[normalizeText(plan.id)] ?? null;
}

function LaunchPriceBlock({
  plan,
  isHighlighted,
}: {
  plan: Plan;
  isHighlighted: boolean;
}) {
  const regularPrice = getRegularPrice(plan);

  if (!plan.price) {
    return (
      <div className="text-3xl font-semibold leading-tight tracking-tight">
        Planes a tu medida
      </div>
    );
  }

  const mutedTextClass = isHighlighted ? "text-black/50" : "text-white/45";
  const priceClass = isHighlighted ? "text-[#1A1A14]" : "text-[#F5F0E8]";
  const launchPillClass = isHighlighted
    ? "border-black/10 bg-black/10 text-[#1A1A14]"
    : "border-[#E8C547]/25 bg-[#E8C547]/10 text-[#E8C547]";

  return (
    <div className="space-y-3">
      {regularPrice && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-medium ${mutedTextClass}`}>
            Precio regular
          </span>

          <span
            className={`relative text-2xl font-semibold tracking-tight ${mutedTextClass}`}
            aria-label={`Precio regular ${regularPrice}`}
          >
            <span className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rotate-[-8deg] rounded-full bg-current" />
            {regularPrice}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className={`text-5xl font-semibold tracking-tight ${priceClass}`}>
          {plan.price}
        </div>

        {regularPrice && (
          <span
            className={`mb-1 inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${launchPillClass}`}
          >
            Lanzamiento
          </span>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const action = getPlanAction(plan);

  const ctaClassHighlighted =
    "mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-[#15120A] px-5 py-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-[1px] hover:bg-black";

  const ctaClassDefault =
    "mokko-button-secondary mt-10 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm";

  const renderCTA = (isHighlighted: boolean) => {
    const className = isHighlighted ? ctaClassHighlighted : ctaClassDefault;

    if (action.type === "internal") {
      return (
        <Link to={action.to} className={className}>
          {plan.cta}
        </Link>
      );
    }

    return (
      <a
        href={action.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {plan.cta}
      </a>
    );
  };

  if (plan.highlighted) {
    return (
      <div className="mokko-card-highlight mokko-price-card mokko-transition group relative">
        <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

        {plan.badge && (
          <div className="absolute right-6 top-6 rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-[#1A1A14]">
            {plan.badge}
          </div>
        )}

        <div className="pr-24 text-sm font-medium text-black/60">
          {plan.name}
        </div>

        <div className="mt-5">
          <LaunchPriceBlock plan={plan} isHighlighted />
        </div>

        <div className="mt-3 text-sm text-black/60">{plan.priceLabel}</div>

        <ul className="mt-8 space-y-4 text-[15px] leading-7 text-black/80">
          {plan.features.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>

        {renderCTA(true)}
      </div>
    );
  }

  return (
    <div className="mokko-card mokko-price-card mokko-transition group relative hover:border-white/15">
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="text-sm font-medium text-white/55">{plan.name}</div>

      <div className="mt-5">
        <LaunchPriceBlock plan={plan} isHighlighted={false} />
      </div>

      <div className="mt-3 text-sm text-white/50">{plan.priceLabel}</div>

      <ul className="mt-8 space-y-4 text-[15px] leading-7 text-white/75">
        {plan.features.map((feature) => (
          <li key={feature}>• {feature}</li>
        ))}
      </ul>

      {renderCTA(false)}
    </div>
  );
}

export default function Placas() {
  return (
    <section id="planes" className="relative bg-black/20 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E8C547]">
            Placas
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-5xl">
            Elige la placa ideal para proteger a tu mascota.
          </h2>

          <p className="mt-4 max-w-2xl text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
            Desde una opción esencial hasta una versión personalizada, todas
            nuestras placas incluyen identificación inteligente, perfil digital
            y activación simple.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <div className="mt-8 grid gap-3 text-sm text-white/55 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
          {[
            { icon: "🔒", text: "Pago único, sin suscripciones" },
            { icon: "📱", text: "Compatible con NFC + QR" },
            { icon: "⚡", text: "Activación simple en minutos" },
          ].map((item) => (
            <div key={item.text} className="inline-flex items-center gap-2">
              <span className="text-[#E8C547]">{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
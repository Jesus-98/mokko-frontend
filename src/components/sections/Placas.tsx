import { Link } from "react-router-dom";
import { plans } from "../../data/plans";
import type { Plan } from "../../types";

const ALLY_WHATSAPP_URL =
  "https://wa.me/51906359973?text=Hola,%20quiero%20ser%20aliado%20de%20Mokko.%20%C2%BFMe%20pueden%20dar%20informaci%C3%B3n%3F";

function getPlanAction(plan: Plan) {
  const normalizedId = String(plan.id).toLowerCase();
  const normalizedName = String(plan.name).toLowerCase();

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

        <div className="text-sm font-medium text-black/60">{plan.name}</div>

        <div className="mt-4 flex items-end gap-2">
          <div className="text-5xl font-semibold tracking-tight">{plan.price}</div>
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

      <div className="mt-4">
        {plan.price ? (
          <div className="text-5xl font-semibold tracking-tight">{plan.price}</div>
        ) : (
          <div className="text-3xl font-semibold leading-tight tracking-tight">
            Planes a tu medida
          </div>
        )}
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
            Desde una opción esencial hasta una versión personalizada, todas nuestras
            placas incluyen identificación inteligente, perfil digital y activación simple.
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
            { icon: "🐾", text: "Primeras 50 placas a precio especial" },
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
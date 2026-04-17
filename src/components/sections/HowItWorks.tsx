import { steps } from "../../data/plans";

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="max-w-2xl">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E8C547]">
          Cómo funciona
        </div>
        <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
          Diseñado para actuar rápido cuando más importa.
        </h2>
        <p className="mt-4 text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
          Mokko conecta a la persona que encuentra a tu mascota contigo en cuestión
          de segundos, sin apps y sin pasos complicados.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Visual izquierda */}
        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)]">
          <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-[#E8C547]/10 blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-[#2D5A27]/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[28px] bg-[#0F0F0B] p-4 sm:p-5">
            <div className="overflow-hidden rounded-[24px] bg-[#12311c]">
              <img
                src="/placa-escaneo.png"
                alt="Persona escaneando una placa Mokko"
                className="h-[260px] w-full object-cover sm:h-[340px] lg:h-[460px]"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: "NFC + QR", desc: "Compatible con cualquier celular moderno" },
                { label: "Sin apps", desc: "El perfil se abre directo en el navegador" },
                { label: "Contacto", desc: "Llamada, WhatsApp o ubicación al instante" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                    {item.label}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/80">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pasos derecha */}
        <div className="grid gap-4 content-start">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-sm font-bold text-[#1A1A14]">
                  {step.number}
                </div>
                <div className="min-w-0">
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                  <p className="mt-3 text-[15px] leading-7 text-white/65">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { steps } from "../../data/plans";

const highlights = [
  {
    label: "NFC + QR",
    desc: "Compatible con celulares modernos.",
  },
  {
    label: "Sin apps",
    desc: "El perfil se abre en el navegador.",
  },
  {
    label: "Contacto rápido",
    desc: "WhatsApp, llamada o ubicación.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-24"
    >
      <div className="max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8C547] sm:text-sm">
          Cómo funciona
        </div>

        <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
          Diseñado para actuar rápido cuando más importa.
        </h2>

        <p className="mt-4 text-[15px] leading-7 text-white/65 sm:text-lg sm:leading-8">
          Mokko conecta a la persona que encuentra a tu mascota contigo en
          cuestión de segundos, sin apps y sin pasos complicados.
        </p>
      </div>

      <div className="mt-8 grid gap-5 md:mt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-3 shadow-[0_10px_40px_rgba(0,0,0,0.18)] sm:rounded-[34px] sm:p-4">
          <div className="absolute -left-12 top-10 h-40 w-40 rounded-full bg-[#E8C547]/10 blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-40 w-40 rounded-full bg-[#2D5A27]/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[24px] bg-[#0F0F0B] p-3 sm:rounded-[28px] sm:p-5">
            <div className="overflow-hidden rounded-[20px] bg-[#12311c] sm:rounded-[24px]">
              <img
                src="/placa-escaneo.png"
                alt="Persona escaneando una placa Mokko"
                className="h-[220px] w-full object-cover sm:h-[340px] lg:h-[460px]"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/45 sm:text-xs">
                    {item.label}
                  </div>

                  <div className="mt-2 text-sm font-medium leading-6 text-white/80">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid content-start gap-3 sm:gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-[24px] border border-white/10 bg-white/5 p-5 transition hover:border-white/15 hover:bg-white/[0.06] sm:rounded-[28px] sm:p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-sm font-bold text-[#1A1A14] sm:h-12 sm:w-12">
                  {step.number}
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl font-semibold leading-tight sm:text-2xl">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-white/65 sm:mt-3 sm:text-[15px]">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-[24px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 sm:rounded-[28px] sm:p-6">
        <div className="text-lg font-semibold text-[#F5F0E8]">
          Pensado para momentos reales.
        </div>

        <p className="mt-2 text-sm leading-7 text-white/65">
          Quien encuentre a tu mascota solo necesita escanear la placa para ver
          cómo contactarte o enviarte su ubicación.
        </p>
      </div>
    </section>
  );
}
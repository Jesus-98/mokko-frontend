import { MapPinned } from "lucide-react";
import WhatsAppIcon from "../icons/WhatsAppIcon";
import PhoneIcon from "../icons/PhoneIcon";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.22),transparent_34%)]" />

      <div className="mokko-container grid gap-10 py-10 md:py-12 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <div className="relative z-10 flex h-full flex-col justify-center">
          <span className="mokko-badge mokko-badge-primary w-fit">
            Placa inteligente para mascotas
          </span>

          <h1 className="mt-6 max-w-3xl text-[38px] font-semibold leading-[1.05] sm:text-5xl xl:text-6xl">
            Si alguien encuentra a tu mascota,{" "}
            <span className="text-[#E8C547]">
              podrá contactarte en segundos.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/70 sm:text-lg sm:leading-8">
            Mokko convierte una placa física en una identidad digital para tu
            mascota. Sin apps, sin complicaciones. Acercá tu celular y contactá
            al dueño al instante.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#planes"
              className="mokko-button-primary w-full rounded-2xl px-6 py-4 text-center text-sm sm:w-auto"
            >
              Protege a tu mascota hoy
            </a>
            <a
              href="#como-funciona"
              className="mokko-button-secondary w-full rounded-2xl px-6 py-4 text-center text-sm sm:w-auto"
            >
              Ver cómo funciona
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/45">
            <div className="flex items-center gap-2">
              <span className="text-[#E8C547]">✓</span>
              Sin app requerida
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#E8C547]">✓</span>
              Alerta en segundos
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#E8C547]">✓</span>
              Fabricado en Perú
            </div>
          </div>
        </div>

        <div className="relative z-10 flex w-full items-center justify-center lg:justify-end">
          <div className="absolute -left-10 top-12 h-36 w-36 rounded-full bg-[#2D5A27]/20 blur-3xl sm:h-44 sm:w-44" />
          <div className="absolute -right-8 -top-6 h-40 w-40 rounded-full bg-[#E8C547]/15 blur-3xl sm:h-48 sm:w-48" />

          <div className="relative w-full max-w-[360px] rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:max-w-[390px] sm:rounded-[32px]">
            <div className="rounded-[24px] bg-[#0F0F0B] p-3 ring-1 ring-white/5 sm:rounded-[28px] sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/45 sm:text-sm">
                    Mascota encontrada
                  </div>
                  <div className="mt-1 text-[24px] font-semibold leading-none text-white sm:text-[28px]">
                    Max
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8C547] px-3 py-2 text-[11px] font-semibold text-[#1A1A14]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#1A1A14]" />
                  Activo
                </div>
              </div>

              <div className="mt-4 rounded-[22px] bg-[#F5F0E8] p-3 text-[#1A1A14]">
                <div className="aspect-[4/3] w-full overflow-hidden rounded-[16px] bg-[#d9d2c5]">
                  <img
                    src="/mascota-hero.jpg"
                    alt="Mascota Mokko"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="mt-3 rounded-[16px] bg-[#E8C547]/25 px-4 py-3 text-sm font-medium leading-6 text-[#1A1A14]">
                  Si encontraste a Max, por favor contacta a su dueño.
                </div>

                <div className="mt-3 grid gap-3">
                  <div className="rounded-[16px] bg-black/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-black/45">
                      Dueño registrado
                    </div>
                    <div className="mt-2 text-base font-semibold">J**** N.</div>
                  </div>

                  <div className="rounded-[16px] bg-black/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-black/45">
                      Teléfono
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      +51 9** *** ***
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] sm:py-4"
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px]" />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white/35 px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#e6e6e6] sm:py-4"
                  >
                    <PhoneIcon className="h-[18px] w-[18px]" />
                    Llamar
                  </button>

                  <button
                    type="button"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#d4b03f]"
                  >
                    <MapPinned className="h-[18px] w-[18px]" />
                    Enviar ubicación al dueño
                  </button>
                </div>

                <div className="mt-3 text-center text-[11px] text-black/38">
                  Perfil Mokko • Identidad digital para mascotas
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-6">
            <div className="text-xl font-semibold leading-8 text-[#E8C547]">
              Sin app. Solo acercar el celular.
            </div>
            <p className="mt-3 text-sm leading-7 text-white/70">
              El perfil se abre directo en el navegador. Quien encuentre a tu
              mascota no necesita instalar nada para contactarte.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
            <div className="text-xl font-semibold text-[#E8C547]">Ideal para</div>
            <div className="mt-3 space-y-2 text-sm leading-7 text-white/70">
              <div>• Dueños que no quieren arriesgarse</div>
              <div>• Veterinarias que quieren ofrecer más</div>
              <div>• Criadores y protectoras de animales</div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
            <div className="text-xl font-semibold leading-8 text-[#E8C547]">
              Más que una placa.
            </div>
            <p className="mt-3 text-sm leading-7 text-white/70">
              Mokko no es solo una placa. Es la base de algo más grande para el
              cuidado de tu mascota.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}
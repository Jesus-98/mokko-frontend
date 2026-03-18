import { useState } from "react";
import Footer from "./components/Footer";
export default function MokkoLandingIndex() {
const [openFaq, setOpenFaq] = useState<number | null>(0);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const faqs = [
    {
      question: "📍 ¿Es un GPS para rastrear a mi mascota en tiempo real?",
      answer: `No. MOKKO es una Placa de Identidad Inteligente. A diferencia de un GPS, que requiere baterías pesadas y una suscripción mensual, MOKKO utiliza tecnología NFC o QR, la misma que usa tus billeteras virtuales (Apple Pay y Google Pay).

Funciona como un "seguro de identidad": cuando alguien encuentra a tu mascota y escanea la placa con su celular, accede al perfil digital con toda tu información de contacto.

Dato extra: En el momento del escaneo, el sistema puede enviarte una notificación con la ubicación exacta de donde fue encontrada.`,
    },
    {
      question: "🔋 ¿Necesito cargar la placa o usa pilas?",
      answer: `Nunca. Al no ser un localizador activo (GPS), la placa no necesita energía propia. Se activa mediante el campo magnético del celular que la escanea. Esto permite que sea liviana, pequeña y eterna.`,
    },
    {
      question: "📱 ¿Quién encuentre a mi mascota necesita instalar una App?",
      answer: `No. Este es nuestro mayor beneficio. El 99% de los celulares modernos tienen NFC o lector de QR. Solo tienen que acercar su teléfono a la placa MOKKO y se abrirá automáticamente el perfil de tu mascota en su navegador.`,
    },
    {
      question: "🐾 ¿Qué sucede exactamente cuando alguien encuentra a mi mascota?",
      answer: `Cuando una persona encuentra a tu mascota y escanea la placa MOKKO (vía NFC o QR), ocurren tres cosas de inmediato:

Información al instante: El rescatista verá el perfil digital de tu mascota con su nombre, tus números de contacto, dirección y si necesita medicación urgente.

Botón de Auxilio: El perfil incluye un botón directo para llamarte o escribirte por WhatsApp sin que el rescatista tenga que copiar tu número.

Notificación de ubicación: En el momento del escaneo, el sistema solicitará permiso al rescatista para compartir su ubicación GPS. Si acepta, recibirás una notificación inmediata con el punto exacto en el mapa donde se encuentra tu mascota.`,
    },
    {
      question: "✏️ ¿Qué pasa si la información de mi perfil cambia (ej. cambio de teléfono)?",
      answer: `No necesitas comprar una placa nueva. Como es una placa inteligente conectada a la nube, puedes entrar a tu cuenta MOKKO en cualquier momento y actualizar tus datos al instante. La placa física siempre mostrará la información más reciente.`,
    },
    {
      question: "💧 ¿La placa resiste el agua?",
      answer: `¡Totalmente! Nuestras placas están fabricadas mediante impresión 3D de alta durabilidad, y el chip NFC está sellado internamente. Tu mascota puede correr, jugar y mojarse sin que la tecnología se dañe.`,
    },
    {
      question: "💸 ¿Tengo que pagar una suscripción mensual?",
      answer: `No. En MOKKO creemos que la seguridad no debe ser una renta. Creas tu cuenta gratis, registras a tu mascota y solo pagas una vez por el costo de la placa física (Genérica o Personalizada).`,
    },
  ];

  return (
    <div className="min-h-screen bg-[#1A1A14] text-[#F5F0E8]">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#1A1A14]/90 backdrop-blur">
        <div className="mokko-container flex h-20 items-center justify-between">
          <a href="#inicio" className="flex items-center gap-3">
            <img
              src="/logo-mokko.png"
              alt="Mokko"
              className="h-10 w-auto object-contain sm:h-12"
            />
          </a>

          <nav className="hidden items-center gap-6 text-sm text-white/75 lg:flex">
            <a href="#como-funciona" className="transition hover:text-white">
              Cómo funciona
            </a>
            <a href="#planes" className="transition hover:text-white">
              Placas
            </a>
            <a href="#aliados" className="transition hover:text-white">
              Aliados
            </a>
            <a href="#faq" className="transition hover:text-white">
              Ayuda / FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <a
              href="#acceso"
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5"
            >
              Ingresar
            </a>
            <a
              href="#cta"
              className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:translate-y-[-1px]"
            >
              Activar mi placa
            </a>
          </div>

          {/* BOTÓN MOBILE */}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
          >
            <div className="flex flex-col gap-1.5">
              <span className="block h-[2px] w-5 rounded-full bg-white" />
              <span className="block h-[2px] w-5 rounded-full bg-white" />
              <span className="block h-[2px] w-5 rounded-full bg-white" />
            </div>
          </button>
        </div>

        {/* PANEL MOBILE */}
        <div
          className={`overflow-hidden border-t border-white/10 bg-[#141410]/95 transition-all duration-300 lg:hidden ${
            mobileMenuOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="mokko-container flex flex-col gap-2 py-4">
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Cómo funciona
            </a>
            <a
              href="#planes"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Placas
            </a>
            <a
              href="#aliados"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Aliados
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              Ayuda / FAQ
            </a>

            <div className="mt-2 grid gap-3 pt-2">
              <a
                href="#acceso"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
              >
                Acceso
              </a>
              <a
                href="#cta"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:translate-y-[-1px]"
              >
                Activar mi placa
              </a>
            </div>
          </div>
        </div>
      </header>

      <main id="inicio">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.22),transparent_34%)]" />

          <div className="mokko-container grid gap-10 py-10 md:py-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:min-h-[calc(100vh-80px)]">
            <div className="relative z-10 flex h-full flex-col justify-center">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Placa inteligente para mascotas
              </span>

              <h1 className="mt-6 max-w-3xl text-[38px] font-semibold leading-[1.05] sm:text-5xl xl:text-6xl">
                Si alguien encuentra a tu mascota,{" "}
                <span className="text-[#E8C547]">podrá contactarte en segundos.</span>
              </h1>

              <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/70 sm:text-lg sm:leading-8">
                Mokko convierte una placa física en una identidad digital para tu mascota.
                Sin apps, sin complicaciones. Escanea o acerca tu celular y contacta al dueño al instante.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="#cta"
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

                    <div className="inline-flex items-center rounded-full bg-[#E8C547] px-3 py-2 text-[11px] font-semibold text-[#1A1A14]">
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
                        <div className="mt-2 text-base font-semibold">+51 9** *** ***</div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#25D366] px-4 py-3 text-sm font-semibold text-white sm:py-4 hover:bg-[#1ebe5d] transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20.52 3.48A11.9 11.9 0 0012.03 0C5.4 0 .03 5.37.03 12c0 2.12.56 4.2 1.63 6.04L0 24l6.17-1.6A11.93 11.93 0 0012.03 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.51-8.52zM12.03 21.8c-1.8 0-3.56-.48-5.1-1.38l-.37-.22-3.66.95.98-3.57-.24-.37A9.8 9.8 0 012.23 12c0-5.41 4.4-9.8 9.8-9.8 2.62 0 5.08 1.02 6.93 2.87A9.74 9.74 0 0121.83 12c0 5.41-4.4 9.8-9.8 9.8zm5.54-7.36c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.52 0 1.48 1.07 2.92 1.22 3.12.15.2 2.1 3.2 5.1 4.48.71.3 1.26.48 1.7.62.71.22 1.36.19 1.87.11.57-.08 1.78-.73 2.03-1.44.25-.7.25-1.3.17-1.44-.07-.15-.27-.22-.57-.37z" />
                        </svg>
                        WhatsApp
                      </div>

                      <div className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white/35 px-4 py-3 text-sm font-semibold text-[#1A1A14] sm:py-4 hover:bg-[#e6e6e6] transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6.6 10.8a15.05 15.05 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.7 22 2 13.3 2 2c0-.6.4-1 1-1h4.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.7.1.4 0 .8-.3 1.1l-2.2 2.2z" />
                        </svg>
                        Llamar
                      </div>

                      <div className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] hover:bg-[#d4b03f] transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 119.5 9 2.5 2.5 0 0112 11.5z" />
                        </svg>
                        Enviar ubicación al dueño
                      </div>
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
                  Una placa, múltiples posibilidades
                </div>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  Escanea, ve su perfil y contacta al instante desde cualquier celular.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                <div className="text-xl font-semibold text-[#E8C547]">
                  Ideal para
                </div>
                <div className="mt-3 space-y-2 text-sm leading-7 text-white/72">
                  <div>• Dueños de mascotas</div>
                  <div>• Centros de adopción</div>
                  <div>• Veterinarias</div>
                </div>
              </div>

              <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                <div className="text-xl font-semibold leading-8 text-[#E8C547]">
                  Más que una identificación
                </div>
                <p className="mt-3 text-sm leading-7 text-white/72">
                  Mokko es la base para un ecosistema pet tech con perfiles, contactos
                  rápidos y futuras funciones en un solo lugar.
                </p>
              </div>
            </div>
          </section>
        </section>

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
              Mokko conecta a la persona que encuentra a tu mascota contigo en cuestión de segundos,
              sin apps y sin pasos complicados.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            {/* VISUAL IZQUIERDA */}
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
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                      NFC + QR
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/80">
                      Compatible con cualquier celular moderno
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Sin apps
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/80">
                      El perfil se abre directo en el navegador
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                      Contacto
                    </div>
                    <div className="mt-2 text-sm font-medium text-white/80">
                      Llamada, WhatsApp o ubicación al instante
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PASOS DERECHA */}
            <div className="grid gap-4">
              {[
                [
                  "01",
                  "Activa tu placa",
                  "Ingresa a “Activar mi placa”, crea tu cuenta y registra los datos de tu mascota. Solo necesitas el código único incluido con tu placa Mokko.",
                ],
                [
                  "02",
                  "Alguien escanea",
                  "Cuando alguien encuentre a tu mascota, podrá acercar su celular o escanear el QR. El perfil se abrirá automáticamente, sin necesidad de apps.",
                ],
                [
                  "03",
                  "Te contactan",
                  "La persona verá tu información al instante y podrá llamarte, escribirte por WhatsApp o enviarte su ubicación para ayudarte a recuperarla más rápido.",
                ],
              ].map(([step, title, text]) => (
                <div
                  key={step}
                  className="rounded-[28px] border border-white/10 bg-white/5 p-6 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-sm font-bold text-[#1A1A14]">
                      {step}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-2xl font-semibold">{title}</h3>
                      <p className="mt-3 text-[15px] leading-7 text-white/65">
                        {text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="placas" className="relative bg-black/20 py-16 md:py-24">
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
              {/* BASIC */}
              <div className="mokko-card mokko-price-card mokko-transition group hover:border-white/15">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

                <div className="text-sm font-medium text-white/55">Mokko Essential</div>

                <div className="mt-4 flex items-end gap-2">
                  <div className="text-5xl font-semibold tracking-tight">S/ 29</div>
                </div>

                <div className="mt-3 text-sm text-white/50">
                  Pago único • Sin mensualidades
                </div>

                <ul className="mt-8 space-y-4 text-[15px] leading-7 text-white/75">
                  <li>• Placa inteligente con NFC + QR</li>
                  <li>• Perfil digital editable en cualquier momento</li>
                  <li>• Contacto rápido con el dueño</li>
                  <li>• Reportes de ubicación al escanear</li>
                </ul>

                <a
                  href="#cta"
                  className="mokko-button-secondary mt-10 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm"
                >
                  Obtener mi placa
                </a>
              </div>

              {/* PRO */}
              <div className="mokko-card-highlight mokko-price-card mokko-transition group">
                <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute right-6 top-6 rounded-full bg-black/10 px-3 py-1 text-xs font-semibold text-[#1A1A14]">
                  Más vendido
                </div>

                <div className="text-sm font-medium text-black/60">Mokko Custom</div>

                <div className="mt-4 flex items-end gap-2">
                  <div className="text-5xl font-semibold tracking-tight">S/ 49</div>
                </div>

                <div className="mt-3 text-sm text-black/60">
                  Pago único • Recomendado
                </div>

                <ul className="mt-8 space-y-4 text-[15px] leading-7 text-black/80">
                  <li>• Todo lo de Mokko Essential</li>
                  <li>• Diseño de placa personalizado</li>
                  <li>• Perfil digital editable en cualquier momento</li>
                  <li>• Historial médico y vacunas</li>
                  <li>• Mejor presentación para regalo o branding</li>
                </ul>

                <a
                  href="#cta"
                  className="mt-10 inline-flex w-full items-center justify-center rounded-2xl 
          bg-[#15120A] px-5 py-4 text-sm font-semibold text-white
          shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
          transition hover:translate-y-[-1px] hover:bg-black"
                >
                  Obtener mi placa
                </a>
              </div>

              {/* PARTNERS */}
              <div className="mokko-card mokko-price-card mokko-transition group hover:border-white/15">
                <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

                <div className="text-sm font-medium text-white/55">Mokko Partners</div>

                <div className="mt-4 text-5xl font-semibold tracking-tight">Planes a tu medida</div>

                <div className="mt-3 text-sm text-white/50">
                  Tu marca. Nuestras placas.
                </div>

                <ul className="mt-8 space-y-4 text-[15px] leading-7 text-white/75">
                  <li>• Escala con precios especiales según volumen</li>
                  <li>• Lanza placas con tu propia marca</li>
                  <li>• Integra Mokko fácilmente en tu negocio</li>
                  <li>• Gestiona todo desde un panel para aliados (próximamente)</li>
                </ul>

                <a
                  href="#cta"
                  className="mokko-button-secondary mt-10 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3.5 text-sm"
                >
                  Quiero ser aliado
                </a>
              </div>
            </div>

            {/* MICROCOPY */}
            <div className="mt-8 grid gap-3 text-sm text-white/55 sm:flex sm:flex-wrap sm:items-center sm:gap-6">
              <div className="inline-flex items-center gap-2">
                <span className="text-[#E8C547]">🔒</span>
                Pago único, sin suscripciones
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="text-[#E8C547]">📱</span>
                Compatible con NFC + QR
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="text-[#E8C547]">⚡</span>
                Activación simple en minutos
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="bg-black/20 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E8C547]">
                Ayuda / FAQ
              </div>
              <h2 className="mt-4 text-3xl font-semibold md:text-5xl">
                Preguntas frecuentes sobre Mokko.
              </h2>
            </div>

            <div className="mt-10 grid gap-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/5 sm:px-6"
                    >
                      <span className="text-base font-semibold text-[#F5F0E8] sm:text-lg">
                        {faq.question}
                      </span>
                      <span className="shrink-0 text-2xl font-light text-[#E8C547]">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>

                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        isOpen
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="whitespace-pre-line px-5 pb-6 leading-7 text-white/65 sm:px-6 sm:leading-8">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

<Footer />
    </div>
  );
}

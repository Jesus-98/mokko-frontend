export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.22),transparent_34%)]" />

      <div className="mokko-container grid gap-10 py-10 md:py-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:min-h-[calc(100vh-80px)]">

        {/* Texto izquierda */}
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
            Sin apps, sin complicaciones. Acercá tu celular y contactá al dueño al instante.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href="#placas"
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

          {/* Social proof */}
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

        {/* Mockup derecha */}
        <div className="relative z-10 flex w-full items-center justify-center lg:justify-end">
          <div className="absolute -left-10 top-12 h-36 w-36 rounded-full bg-[#2D5A27]/20 blur-3xl sm:h-44 sm:w-44" />
          <div className="absolute -right-8 -top-6 h-40 w-40 rounded-full bg-[#E8C547]/15 blur-3xl sm:h-48 sm:w-48" />

          <div className="relative w-full max-w-[360px] rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur-sm sm:max-w-[390px] sm:rounded-[32px]">
            <div className="rounded-[24px] bg-[#0F0F0B] p-3 ring-1 ring-white/5 sm:rounded-[28px] sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/45 sm:text-sm">Mascota encontrada</div>
                  <div className="mt-1 text-[24px] font-semibold leading-none text-white sm:text-[28px]">
                    Max
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8C547] px-3 py-2 text-[11px] font-semibold text-[#1A1A14]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A14] animate-pulse" />
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
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1ebe5d] sm:py-4"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.52 3.48A11.9 11.9 0 0012.03 0C5.4 0 .03 5.37.03 12c0 2.12.56 4.2 1.63 6.04L0 24l6.17-1.6A11.93 11.93 0 0012.03 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.51-8.52zM12.03 21.8c-1.8 0-3.56-.48-5.1-1.38l-.37-.22-3.66.95.98-3.57-.24-.37A9.8 9.8 0 012.23 12c0-5.41 4.4-9.8 9.8-9.8 2.62 0 5.08 1.02 6.93 2.87A9.74 9.74 0 0121.83 12c0 5.41-4.4 9.8-9.8 9.8zm5.54-7.36c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.8-1.68-2.1-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.05 1.03-1.05 2.52 0 1.48 1.07 2.92 1.22 3.12.15.2 2.1 3.2 5.1 4.48.71.3 1.26.48 1.7.62.71.22 1.36.19 1.87.11.57-.08 1.78-.73 2.03-1.44.25-.7.25-1.3.17-1.44-.07-.15-.27-.22-.57-.37z" />
                    </svg>
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-black/10 bg-white/35 px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#e6e6e6] sm:py-4"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6.6 10.8a15.05 15.05 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.4.6 3.7.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 1C10.7 22 2 13.3 2 2c0-.6.4-1 1-1h4.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.7.1.4 0 .8-.3 1.1l-2.2 2.2z" />
                    </svg>
                    Llamar
                  </button>

                  <button
                    type="button"
                    className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#d4b03f]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 119.5 9 2.5 2.5 0 0112 11.5z" />
                    </svg>
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

      {/* Cards inferiores */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-6">
            <div className="text-xl font-semibold leading-8 text-[#E8C547]">
              Sin app. Solo acercar el celular.
            </div>
            <p className="mt-3 text-sm leading-7 text-white/70">
              El perfil se abre directo en el navegador. Quien encuentre a tu mascota
              no necesita instalar nada para contactarte.
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
              Mokko no es solo una placa.
              Es la base de algo más grande
              para el cuidado de tu mascota.
            </p>
          </div>
        </div>
      </section>
    </section>
  );
}

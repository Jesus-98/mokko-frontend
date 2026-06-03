import { useState } from "react";
import { faqs } from "../../data/faqs";
import { SUPPORT_WHATSAPP_URLS } from "../../config/contact";

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-black/20 py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E8C547] sm:text-sm">
            Ayuda / FAQ
          </div>

          <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl">
            Preguntas frecuentes sobre Mokko.
          </h2>

          <p className="mt-4 text-[15px] leading-7 text-white/65 sm:text-lg sm:leading-8">
            Resolvemos las dudas más comunes sobre activación, uso de la placa,
            perfil digital y contacto con el dueño.
          </p>
        </div>

        <div className="mt-8 grid gap-3 md:mt-10 md:gap-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;

            return (
              <div
                key={faq.question}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5 transition hover:border-white/15 hover:bg-white/[0.06]"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-white/5 sm:px-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold leading-6 text-[#F5F0E8] sm:text-lg sm:leading-7">
                    {faq.question}
                  </span>

                  <span className="shrink-0 text-2xl font-light leading-none text-[#E8C547] transition-all duration-300">
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
                    <div className="whitespace-pre-line px-5 pb-6 text-sm leading-7 text-white/65 sm:px-6 sm:text-base sm:leading-8">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547]/8 p-5 md:mt-10 md:p-6">
          <div className="grid gap-4 md:flex md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-[#F5F0E8]">
                ¿Tienes otra consulta?
              </div>

              <p className="mt-2 text-sm leading-7 text-white/65">
                Escríbenos por WhatsApp y te ayudamos a elegir o activar tu
                placa Mokko.
              </p>
            </div>

            <a
              href={SUPPORT_WHATSAPP_URLS.support}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] transition hover:-translate-y-[1px] hover:bg-[#f0cf55] md:w-auto"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
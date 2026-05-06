import { useState } from "react";
import { faqs } from "../../data/faqs";
import { SUPPORT_WHATSAPP_URLS } from "../../config/contact";

export default function FAQ() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
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
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-[#F5F0E8] sm:text-lg">
                    {faq.question}
                  </span>
                  <span className="shrink-0 text-2xl font-light text-[#E8C547] transition-all duration-300">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
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

        {/* CTA al final del FAQ */}
        <div className="mt-10 rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547]/5 p-6 text-center">
          <p className="text-white/70">
            ¿Tenés otra consulta?{" "}
            <a
              href={SUPPORT_WHATSAPP_URLS.support}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#E8C547] transition hover:underline"
            >
              Escribinos por WhatsApp →
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

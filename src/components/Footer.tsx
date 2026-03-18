import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";

function TikTokIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.24V2h-3.12v12.4a2.67 2.67 0 1 1-2.67-2.67c.2 0 .4.02.59.07V8.62a5.8 5.8 0 0 0-.59-.03A5.79 5.79 0 1 0 15.82 14V8.73a7.9 7.9 0 0 0 4.77 1.6V7.21c-.34 0-.67-.18-1-.52Z" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer id="acceso" className="border-t border-white/10 bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="text-lg font-semibold text-[#F5F0E8]">Mokko</div>

            <p className="mt-2 text-sm text-white/60">
              Identificación inteligente para mascotas.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="Facebook"
              >
                <Facebook size={18} />
              </a>

              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>

              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40">
              Navegación
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-white/70">
              <a href="#como-funciona" className="hover:text-white">
                Cómo funciona
              </a>
              <a href="#planes" className="hover:text-white">
                Quiero mi placa mokko
              </a>
              <a href="#cta" className="hover:text-white">
                Quiero ser aliado
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40">
              Contacto
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href="mailto:hola@mokko.pet"
                className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
              >
                <Mail size={16} className="text-[#E8C547]" />
                hola@mokko.pet
              </a>

              <a
                href="https://wa.me/51944606429"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
              >
                <MessageCircle size={16} className="text-[#E8C547]" />
                +51 944 606 429
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/40 md:flex-row md:justify-between">
          <span>© 2026 Mokko. Todos los derechos reservados.</span>

          <div className="flex gap-4">
            <a href="#" className="hover:text-white/70">
              Privacidad
            </a>
            <a href="#" className="hover:text-white/70">
              Términos
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
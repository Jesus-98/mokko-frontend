import { Facebook, Instagram, Mail, MessageCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_WHATSAPP_URLS,
} from "../../config/contact";

const SUPPORT_EMAIL = "mokkopet@gmail.com";

const SOCIAL_LINKS = {
  facebook: "https://www.facebook.com/share/1AzqbEKXwH/",
  instagram: "https://www.instagram.com/mokko.pet/",
  tiktok: "https://www.tiktok.com/@mokkopet",
};

function TikTokIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.24V2h-3.12v12.4a2.67 2.67 0 1 1-2.67-2.67c.2 0 .4.02.59.07V8.62a5.8 5.8 0 0 0-.59-.03A5.79 5.79 0 1 0 15.82 14V8.73a7.9 7.9 0 0 0 4.77 1.6V7.21c-.34 0-.67-.18-1-.52Z" />
    </svg>
  );
}

export default function Footer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const goToTop = (path: string) => {
    navigate(path);

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 120);
  };

  const goToSection = (sectionId: string) => {
    if (location.pathname !== "/") {
      navigate("/");

      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({
          behavior: "smooth",
        });
      }, 150);

      return;
    }

    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
  };

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
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="Facebook de Mokko"
              >
                <Facebook size={18} />
              </a>

              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="Instagram de Mokko"
              >
                <Instagram size={18} />
              </a>

              <a
                href={SOCIAL_LINKS.tiktok}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:border-[#E8C547]/40 hover:bg-[#E8C547]/10 hover:text-[#E8C547]"
                aria-label="TikTok de Mokko"
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
              <button
                type="button"
                onClick={() => goToSection("como-funciona")}
                className="text-left transition hover:text-white"
              >
                Cómo funciona
              </button>

              <button
                type="button"
                onClick={() => goToSection("planes")}
                className="text-left transition hover:text-white"
              >
                Quiero mi placa Mokko
              </button>

              <a
                href={SUPPORT_WHATSAPP_URLS.ally}
                target="_blank"
                rel="noreferrer"
                className="text-left transition hover:text-white"
              >
                Quiero ser aliado
              </a>

              <button
                type="button"
                onClick={() => goToTop(user ? "/dashboard" : "/login")}
                className="text-left transition hover:text-white"
              >
                {user ? "Mi cuenta" : "Iniciar sesión"}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-widest text-white/40">
              Contacto
            </h3>

            <div className="mt-4 flex flex-col gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
              >
                <Mail size={16} className="text-[#E8C547]" />
                {SUPPORT_EMAIL}
              </a>

              <a
                href={SUPPORT_WHATSAPP_URLS.general}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
              >
                <MessageCircle size={16} className="text-[#E8C547]" />
                {SUPPORT_WHATSAPP_DISPLAY}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs text-white/40 md:flex-row md:justify-between">
          <span>© 2026 Mokko. Todos los derechos reservados.</span>

          <div className="flex gap-4">
            <Link
              to="/privacidad"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-white/70"
            >
              Privacidad
            </Link>

            <Link
              to="/terminos"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-white/70"
            >
              Términos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
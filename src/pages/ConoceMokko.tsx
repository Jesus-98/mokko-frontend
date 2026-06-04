import {
  ArrowRight,
  Facebook,
  Globe,
  Instagram,
  MapPinned,
  MessageCircle,
  Music2,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { SUPPORT_WHATSAPP_URLS } from "../config/contact";

const DEMO_PROFILE_URL = "/p/LFWTKH";

type SocialLink = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type MainLink = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  variant: "brand" | "whatsapp";
  external?: boolean;
};

const socialLinks: SocialLink[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/mokko.pet/",
    icon: Instagram,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@mokkopet",
    icon: Music2,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1AzqbEKXwH/",
    icon: Facebook,
  },
];

const mainLinks: MainLink[] = [
  {
    label: "Conocer Mokko",
    description: "Qué es, cómo funciona, planes y beneficios.",
    href: "/",
    icon: Globe,
    variant: "brand",
  },
  {
    label: "Hablar por WhatsApp",
    description: "Consultas, pedidos o alianzas con negocios.",
    href: SUPPORT_WHATSAPP_URLS.support,
    icon: MessageCircle,
    variant: "whatsapp",
    external: true,
  },
];

export default function ConoceMokko() {
  return (
    <main className="min-h-screen bg-[#1A1A14] text-[#F5F0E8]">
      <section className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(232,197,71,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.22),transparent_36%)]" />
        <div className="absolute -left-20 top-24 h-56 w-56 rounded-full bg-[#E8C547]/10 blur-3xl" />
        <div className="absolute -right-24 bottom-24 h-64 w-64 rounded-full bg-[#2D5A27]/25 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] max-w-[460px] flex-col">
          <div className="flex flex-1 flex-col justify-center">
            <header className="text-center">
              <a
                href="/"
                className="mx-auto inline-flex items-center justify-center"
                aria-label="Ir al inicio de Mokko"
              >
                <img
                  src="/logo-mokko.png"
                  alt="Mokko"
                  loading="eager"
                  decoding="async"
                  className="h-auto w-60 object-contain sm:w-72"
                />
              </a>

              <h1 className="mt-7 text-5xl font-semibold leading-[0.92] tracking-[-0.045em] sm:text-6xl">
                <span className="block text-[#F5F0E8]">La identidad</span>
                <span className="block text-[#F5F0E8]">digital</span>
                <span className="block text-[#E8C547]">de tu mascota.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-sm text-base leading-7 text-white/70">
                Placas inteligentes con QR y NFC para cuidar a tu mejor amigo y
                ayudarte a encontrarlo si se pierde.
              </p>
            </header>

            <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl backdrop-blur-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                  <Smartphone className="h-6 w-6" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold">Demo rápida</h2>
                  <p className="mt-1 text-sm leading-6 text-white/60">
                    Así funciona si alguien encuentra a tu mascota.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <DemoStep
                  number="01"
                  title="Escanean el QR o acercan la placa"
                  description="Funciona con QR en cualquier celular con cámara y con NFC en equipos compatibles."
                />

                <DemoStep
                  number="02"
                  title="Se abre el perfil"
                  description="Ven los datos que tú permitas y los botones de contacto."
                />

                <DemoStep
                  number="03"
                  title="Te contactan rápido"
                  description="Pueden llamarte, escribirte por WhatsApp o enviarte su ubicación."
                />
              </div>

              <a
                href={DEMO_PROFILE_URL}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-5 py-4 text-sm font-semibold text-[#F5F0E8] transition hover:bg-[#E8C547]/20"
              >
                Ver perfil demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </section>

            <section className="mt-4 grid gap-3">
              {mainLinks.map((item) => (
                <MainLinkCard key={item.label} {...item} />
              ))}
            </section>

            <section className="mt-5 rounded-[28px] border border-white/10 bg-[#0F0F0B]/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/75">
                <MapPinned className="h-4 w-4 text-[#E8C547]" />
                Encuéntranos en redes
              </div>

              <div className="grid grid-cols-3 gap-2">
                {socialLinks.map((item) => (
                  <SocialLinkCard key={item.label} {...item} />
                ))}
              </div>
            </section>

            <section className="mt-5 rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547]/10 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#E8C547]" />

                <p className="text-sm leading-6 text-white/65">
                  Mokko no es GPS. Es una placa inteligente de identidad
                  digital: liviana, sin batería y sin app.
                </p>
              </div>
            </section>
          </div>

          <footer className="pt-6 text-center text-xs text-white/35">
            © {new Date().getFullYear()} Mokko · Hecho en Perú
          </footer>
        </div>
      </section>
    </main>
  );
}

function DemoStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8C547]/10 text-xs font-bold text-[#E8C547]">
          {number}
        </div>

        <div>
          <div className="text-sm font-semibold text-[#F5F0E8]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-white/55">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

function MainLinkCard({
  label,
  description,
  href,
  icon: Icon,
  variant,
  external = false,
}: MainLink) {
  const isWhatsapp = variant === "whatsapp";

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={`flex items-center gap-4 rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] ${
        isWhatsapp
          ? "border-[#2D5A27]/35 bg-[#2D5A27]/20 hover:bg-[#2D5A27]/30"
          : "border-[#E8C547]/25 bg-[#E8C547]/10 hover:bg-[#E8C547]/20"
      }`}
    >
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
          isWhatsapp
            ? "bg-[#2D5A27]/70 text-green-100"
            : "bg-white/[0.06] text-[#E8C547]"
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[#F5F0E8]">{label}</div>
        <div className="mt-1 text-sm leading-5 text-white/55">
          {description}
        </div>
      </div>

      <ArrowRight className="h-5 w-5 shrink-0 text-white/45" />
    </a>
  );
}

function SocialLinkCard({ label, href, icon: Icon }: SocialLink) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Abrir ${label} de Mokko`}
      className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 text-center text-xs font-medium text-white/75 transition hover:bg-white/[0.07]"
    >
      <Icon className="h-5 w-5 text-[#E8C547]" />
      {label}
    </a>
  );
}
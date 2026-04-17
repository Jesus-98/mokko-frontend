import type { Plan } from "../types";

export const plans: Plan[] = [
  {
    id: "essential",
    name: "Mokko Essential",
    price: "S/ 29",
    priceLabel: "Pago único • Sin mensualidades",
    description: "Lo que necesitás para proteger a tu mascota hoy.",
    features: [
      "Placa inteligente con NFC + QR",
      "Perfil digital editable en cualquier momento",
      "Contacto rápido con el dueño",
      "Reportes de ubicación al escanear",
    ],
    cta: "Obtener mi placa",
    highlighted: false,
  },
  {
    id: "custom",
    name: "Mokko Custom",
    price: "S/ 39",
    priceLabel: "Pago único • Recomendado",
    description: "Con el nombre de tu mascota y diseño personalizado.",
    features: [
      "Todo lo de Mokko Essential",
      "Diseño de placa personalizado",
      "Nombre de tu mascota en la placa",
      "Historial médico y vacunas",
    ],
    cta: "Obtener mi placa",
    highlighted: true,
    badge: "Más popular",
  },
  {
    id: "partners",
    name: "Mokko Partners",
    price: null,
    priceLabel: "Tu marca. Nuestras placas.",
    description: "Para veterinarias, tiendas pet y alianzas B2B.",
    features: [
      "Precios especiales por volumen",
      "Placas con tu logo y marca",
      "Integración fácil en tu negocio",
      "Comisión por cada activación",
      "Panel de gestión para aliados (próximamente)",
    ],
    cta: "Quiero ser aliado",
    highlighted: false,
  },
];

export const steps = [
  {
    number: "01",
    title: "Activa tu placa",
    description:
      'Ingresa a "Activar mi placa", crea tu cuenta y registra los datos de tu mascota. Solo necesitas el código único incluido con tu placa Mokko.',
  },
  {
    number: "02",
    title: "Alguien escanea",
    description:
      "Cuando alguien encuentre a tu mascota, podrá acercar su celular o escanear el QR. El perfil se abrirá automáticamente, sin necesidad de apps.",
  },
  {
    number: "03",
    title: "Te contactan",
    description:
      "La persona verá tu información al instante y podrá llamarte, escribirte por WhatsApp o enviarte su ubicación para ayudarte a recuperarla más rápido.",
  },
];

export const navLinks = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Placas", href: "#placas" },
  { label: "Ayuda / FAQ", href: "#faq" },
  { label: "Aliados", href: "#aliados" },
];

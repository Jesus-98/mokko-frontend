

import type { FaqItem } from "../types";

export const faqs: FaqItem[] = [
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
    answer: `No. En MOKKO creemos que la seguridad no debe ser una renta. Creas tu cuenta gratis, registras a tu mascota y solo pagas una vez por el costo de la placa física (Essential o Custom).`,
  },
];

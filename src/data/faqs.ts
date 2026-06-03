import type { FaqItem } from "../types";

export const faqs: FaqItem[] = [
  {
    question: "📍 ¿Mokko es un GPS para rastrear a mi mascota en tiempo real?",
    answer: `No. Mokko no es un GPS ni rastrea a tu mascota en tiempo real.

Mokko es una placa inteligente con NFC y QR. Funciona como una identidad digital para tu mascota: cuando alguien la encuentra y escanea la placa con su celular, puede ver su perfil público y contactarte rápidamente.

Si la persona acepta compartir su ubicación, Mokko puede registrar el punto desde donde se envió el reporte para que puedas revisarlo desde tu cuenta.`,
  },
  {
    question: "🔋 ¿Necesito cargar la placa o usa pilas?",
    answer: `No. La placa no necesita batería, pilas ni carga.

El NFC funciona al acercar un celular compatible, y el QR puede escanearse con la cámara del teléfono. Por eso la placa es liviana, práctica y no requiere mantenimiento eléctrico.`,
  },
  {
    question: "📱 ¿La persona que encuentre a mi mascota necesita instalar una app?",
    answer: `No. Esa es una de las ventajas principales de Mokko.

La persona solo necesita acercar su celular a la placa NFC o escanear el código QR. El perfil de tu mascota se abrirá en el navegador, sin instalar aplicaciones ni crear una cuenta.`,
  },
  {
    question: "🐾 ¿Qué sucede cuando alguien encuentra a mi mascota?",
    answer: `Cuando una persona escanea la placa Mokko, puede acceder al perfil público de tu mascota.

Según la configuración del perfil, podrá ver información útil como el nombre de tu mascota, botones para llamarte o escribirte por WhatsApp, y un formulario para enviar un reporte.

Si la persona acepta compartir su ubicación, podrás recibir un reporte con el punto desde donde fue enviada la alerta.`,
  },
  {
    question: "✏️ ¿Qué pasa si cambio de teléfono o quiero actualizar mis datos?",
    answer: `No necesitas comprar una placa nueva.

Como la placa está conectada a un perfil digital, puedes entrar a tu cuenta Mokko y actualizar tus datos cuando lo necesites. La placa física seguirá siendo la misma, pero mostrará la información actualizada en el perfil.`,
  },
  {
    question: "💧 ¿La placa resiste el agua?",
    answer: `Sí, la placa está pensada para el uso diario de una mascota.

Está fabricada mediante impresión 3D y el chip NFC va protegido dentro de la placa. Aun así, recomendamos evitar golpes muy fuertes, mordidas constantes o exposición extrema para mantenerla en buen estado por más tiempo.`,
  },
  {
    question: "💸 ¿Tengo que pagar una suscripción mensual?",
    answer: `No. Mokko no requiere suscripción mensual.

Creas tu cuenta, registras a tu mascota y pagas una sola vez por la placa física que elijas, ya sea Essential o Custom.`,
  },
  {
    question: "🔒 ¿Puedo ocultar mis datos si no quiero mostrar todo públicamente?",
    answer: `Sí. Desde tu cuenta puedes configurar la visibilidad del perfil de tu mascota.

Puedes usar un perfil público, un perfil privado o activar el modo perdido cuando necesites destacar que tu mascota está extraviada. Incluso en modo privado, Mokko puede permitir que alguien envíe un reporte o ubicación sin mostrar todos tus datos.`,
  },
];
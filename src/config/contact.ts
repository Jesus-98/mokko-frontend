export const SUPPORT_WHATSAPP = "51906359973";
export const SUPPORT_WHATSAPP_DISPLAY = "+51 906 359 973";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export const SUPPORT_WHATSAPP_URLS = {
  ally: buildWhatsAppUrl(
    "Hola, quiero ser aliado de Mokko. ¿Me pueden dar información?"
  ),
  support: buildWhatsAppUrl(
    "Hola Mokko, tengo una consulta sobre sus placas inteligentes."
  ),
  general: buildWhatsAppUrl(
    "Hola, tengo una consulta sobre Mokko. ¿Me pueden ayudar?"
  ),
};
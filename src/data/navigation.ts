import { SUPPORT_WHATSAPP_URLS } from "../config/contact";

export type NavLink = {
  label: string;
  href?: string;
  type: "section" | "external";
  url?: string;
};

export const navLinks: NavLink[] = [
  { label: "Cómo funciona", href: "#como-funciona", type: "section" },
  { label: "Placas", href: "#planes", type: "section" },
  {
    label: "Aliados",
    type: "external",
    url: SUPPORT_WHATSAPP_URLS.ally,
  },
  { label: "Ayuda / FAQ", href: "#faq", type: "section" },
];
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
    url: "https://wa.me/51906359973?text=Hola%2C%20quiero%20informaci%C3%B3n%20para%20ser%20aliado%20de%20Mokko.",
  },
  { label: "Ayuda / FAQ", href: "#faq", type: "section" },
];
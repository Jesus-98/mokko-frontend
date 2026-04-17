import type { AdminModuleItem } from "../../types/admin";

export const adminModules: AdminModuleItem[] = [
  {
    key: "orders",
    title: "Pedidos",
    description: "Gestiona pedidos, estados y seguimiento por WhatsApp.",
    href: "/admin/pedidos",
  },
  {
    key: "inventory_tags",
    title: "Inventario de placas",
    description:
      "Controla códigos fabricados, pendientes y exportación para producción.",
    href: "/admin/inventario-placas",
  },
  {
    key: "users",
    title: "Usuarios",
    description: "Consulta clientes, teléfonos, ciudades y roles.",
    href: "/admin/usuarios",
  },
  {
    key: "pets",
    title: "Mascotas",
    description: "Revisa mascotas, perfiles y relación con sus placas.",
    href: "/admin/mascotas",
  },
  {
    key: "reports",
    title: "Reportes",
    description: "Atiende incidencias y reportes de mascotas encontradas.",
    href: "/admin/reportes",
  },
];
type Props = {
  status: string | null | undefined;
};

function getStatusClasses(status: string) {
  switch (status) {
    case "pending_payment":
    case "payment_submitted":
    case "new":
    case "submitted":
      return "bg-[#E8C547]/15 text-[#E8C547]";
    case "paid":
    case "in_production":
    case "ready":
    case "delivered":
    case "verified":
    case "activated":
      return "bg-[#2D5A27]/25 text-[#D6F5CF]";
    case "cancelled":
    case "rejected":
    case "lost":
    case "retired":
      return "bg-red-500/15 text-red-200";
    default:
      return "bg-white/8 text-white/70";
  }
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    draft: "Borrador",
    pending_payment: "Pendiente de pago",
    payment_submitted: "Pago enviado",
    paid: "Pagado",
    in_production: "En producción",
    ready: "Listo",
    shipped: "Enviado",
    delivered: "Entregado",
    cancelled: "Cancelado",
    new: "Nuevo",
    viewed: "Visto",
    resolved: "Resuelto",
    dismissed: "Descartado",
    submitted: "Enviado",
    verified: "Verificado",
    rejected: "Rechazado",
    available: "Disponible",
    reserved: "Reservada",
    activated: "Activada",
    suspended: "Suspendida",
    lost: "Perdida",
    retired: "Retirada",
  };

  return map[status] || status;
}

export default function AdminStatusBadge({ status }: Props) {
  if (!status) return null;

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${getStatusClasses(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
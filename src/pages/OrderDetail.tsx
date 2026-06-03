import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Clock3,
  MessageCircle,
  PackageCheck,
  PencilLine,
  ReceiptText,
  Repeat2,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { buildWhatsAppUrl } from "../config/contact";

type OrderStatus =
  | "draft"
  | "pending_payment"
  | "payment_submitted"
  | "paid"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "cancelled";

type SoldPlanType = "essential" | "custom" | "partner_batch" | "other";
type DesignType = "generic" | "custom" | "partner" | "limited";

type CustomizationData = {
  color?: string | null;
  color_label?: string | null;
  shape?: string | null;
  shape_label?: string | null;
  size?: string | null;
  size_code?: string | null;
  size_label?: string | null;
  pet_name?: string | null;
  constraints?: {
    fixed_shape?: string | boolean | null;
    fixed_shape_label?: string | null;
    fixed_size?: string | boolean | null;
    fixed_size_label?: string | null;
    fixed_logo_color?: string | null;
    logo_color?: string | null;
  } | null;
} | null;

type OrderItemRow = {
  id: string;
  sold_plan_type: SoldPlanType;
  design_type: DesignType;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customization_data: CustomizationData;
  notes?: string | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  currency: string;
  sales_channel: string;
  notes: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  created_at: string;
  confirmed_at: string | null;
  whatsapp_thread: string | null;
  order_items: OrderItemRow[];
};

type OrderWhatsappAction = "consult" | "change" | "cancel" | "repeat";

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "draft":
      return "Borrador";
    case "pending_payment":
      return "Pendiente de pago";
    case "payment_submitted":
      return "Pago enviado";
    case "paid":
      return "Pagado";
    case "in_production":
      return "En producción";
    case "ready":
      return "Listo";
    case "shipped":
      return "Enviado";
    case "delivered":
      return "Entregado";
    case "cancelled":
      return "Cancelado";
    default:
      return status;
  }
}

function getStatusHint(status: OrderStatus) {
  switch (status) {
    case "draft":
      return "Tu pedido aún no ha sido enviado.";
    case "pending_payment":
      return "Esperando confirmación del pago.";
    case "payment_submitted":
      return "Recibimos tu comprobante y lo estamos validando.";
    case "paid":
      return "Pago confirmado correctamente.";
    case "in_production":
      return "Tu placa está siendo preparada.";
    case "ready":
      return "Tu pedido ya está listo.";
    case "shipped":
      return "Tu pedido va en camino.";
    case "delivered":
      return "Pedido completado.";
    case "cancelled":
      return "Este pedido fue cancelado.";
    default:
      return "Estado actualizado.";
  }
}

function getStatusClass(status: OrderStatus) {
  switch (status) {
    case "pending_payment":
    case "payment_submitted":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "paid":
    case "in_production":
    case "ready":
    case "shipped":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "delivered":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "cancelled":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-white/75";
  }
}

function getPlanLabel(plan: SoldPlanType) {
  switch (plan) {
    case "essential":
      return "Essential";
    case "custom":
      return "Custom";
    case "partner_batch":
      return "Lote aliado";
    case "other":
      return "Otro";
    default:
      return plan;
  }
}

function getDesignLabel(design: DesignType) {
  switch (design) {
    case "generic":
      return "Genérico";
    case "custom":
      return "Personalizado";
    case "partner":
      return "Aliado";
    case "limited":
      return "Edición limitada";
    default:
      return design;
  }
}

function getSalesChannelLabel(channel: string) {
  switch ((channel || "").toLowerCase()) {
    case "web":
      return "Web";
    case "instagram":
      return "Instagram";
    case "facebook":
      return "Facebook";
    case "whatsapp":
      return "WhatsApp";
    case "mercadolibre":
      return "Mercado Libre";
    default:
      return channel || "No definido";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatMoney(
  value: number | string | null | undefined,
  currency = "PEN"
) {
  const amount = Number(value || 0);

  if (currency === "PEN") {
    return `S/ ${amount.toFixed(2)}`;
  }

  return `${amount.toFixed(2)} ${currency}`;
}

function getColorLabelFromData(custom: CustomizationData) {
  if (!custom) return null;

  if (custom.color_label?.trim()) return custom.color_label.trim();

  switch ((custom.color || "").toLowerCase()) {
    case "white":
      return "Blanco";
    case "black":
      return "Negro";
    case "green":
      return "Verde";
    default:
      return custom.color ?? null;
  }
}

function getShapeLabelFromData(custom: CustomizationData) {
  if (!custom) return null;

  if (custom.shape_label?.trim()) return custom.shape_label.trim();
  if (custom.constraints?.fixed_shape_label?.trim()) {
    return custom.constraints.fixed_shape_label.trim();
  }

  switch ((custom.shape || "").toLowerCase()) {
    case "circle":
      return "Circular";
    case "bone":
      return "Huesito";
    default:
      return custom.shape ?? null;
  }
}

function getSizeLabelFromData(custom: CustomizationData) {
  if (!custom) return null;

  if (custom.size_label?.trim()) return custom.size_label.trim();
  if (custom.constraints?.fixed_size_label?.trim()) {
    return custom.constraints.fixed_size_label.trim();
  }
  if (custom.size?.trim()) return custom.size.trim();
  if (custom.size_code?.trim()) return custom.size_code.trim();

  return null;
}

function canRequestChange(status: OrderStatus) {
  return (
    status === "pending_payment" ||
    status === "payment_submitted" ||
    status === "paid" ||
    status === "in_production" ||
    status === "ready"
  );
}

function canRequestCancellation(status: OrderStatus) {
  return (
    status === "pending_payment" ||
    status === "payment_submitted" ||
    status === "paid"
  );
}

function canRepeatOrder(status: OrderStatus) {
  return status === "delivered" || status === "cancelled";
}

function getChangeLabel(status: OrderStatus) {
  if (status === "pending_payment") return "Modificar pedido";
  if (status === "in_production" || status === "ready") return "Consultar cambios";
  return "Solicitar cambio";
}

function buildOrderSummaryLines(order: OrderRow) {
  const lines: string[] = [];

  lines.push(`Pedido: ${order.order_number}`);
  lines.push(`Estado actual: ${getStatusLabel(order.status)}`);
  lines.push(`Fecha: ${formatDateTime(order.created_at)}`);
  lines.push(`Canal: ${getSalesChannelLabel(order.sales_channel)}`);
  lines.push("");

  (order.order_items ?? []).forEach((item, index) => {
    const custom = item.customization_data || null;
    const colorLabel = getColorLabelFromData(custom);
    const shapeLabel = getShapeLabelFromData(custom);
    const sizeLabel = getSizeLabelFromData(custom);

    lines.push(`Placa ${index + 1}`);
    lines.push(`Tipo: ${getPlanLabel(item.sold_plan_type)}`);

    if (item.sold_plan_type === "custom" && custom?.pet_name) {
      lines.push(`Nombre: ${custom.pet_name}`);
    }

    if (colorLabel) lines.push(`Color: ${colorLabel}`);
    if (shapeLabel) lines.push(`Forma: ${shapeLabel}`);
    if (sizeLabel) lines.push(`Tamaño: ${sizeLabel}`);

    lines.push(`Cantidad: ${Number(item.quantity || 0)}`);
    lines.push(`Precio unitario: ${formatMoney(item.unit_price, order.currency)}`);
    lines.push(`Subtotal: ${formatMoney(item.subtotal, order.currency)}`);
    lines.push("");
  });

  lines.push(`Total: ${formatMoney(order.total, order.currency)}`);

  return lines;
}

function buildOrderWhatsappMessage(
  order: OrderRow,
  action: OrderWhatsappAction
) {
  const lines: string[] = [];

  if (action === "consult") {
    lines.push(`Hola, quiero consultar por mi pedido ${order.order_number}.`);
  }

  if (action === "change") {
    lines.push(`Hola, quiero solicitar un cambio en mi pedido ${order.order_number}.`);
    lines.push("");
    lines.push("Cambio que deseo realizar:");
  }

  if (action === "cancel") {
    lines.push(`Hola, quiero solicitar la cancelación de mi pedido ${order.order_number}.`);
    lines.push("");
    lines.push("Motivo de cancelación:");
  }

  if (action === "repeat") {
    lines.push(`Hola, quiero repetir o hacer un pedido similar al ${order.order_number}.`);
  }

  lines.push("");
  lines.push("Detalle del pedido:");
  lines.push(...buildOrderSummaryLines(order));

  return lines.join("\n");
}

function getOrderWhatsappUrl(order: OrderRow, action: OrderWhatsappAction) {
  return buildWhatsAppUrl(buildOrderWhatsappMessage(order, action));
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !id) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadOrder = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            order_number,
            status,
            total,
            subtotal,
            discount_amount,
            shipping_amount,
            currency,
            sales_channel,
            notes,
            guest_name,
            guest_email,
            guest_phone,
            created_at,
            confirmed_at,
            whatsapp_thread,
            order_items (
              id,
              sold_plan_type,
              design_type,
              quantity,
              unit_price,
              subtotal,
              customization_data,
              notes
            )
          `
          )
          .eq("id", id)
          .eq("customer_user_id", user.id)
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (!isMounted) return;

        if (!data) {
          setOrder(null);
          setErrorMsg("No se encontró este pedido o no tienes acceso a verlo.");
          return;
        }

        setOrder(data as OrderRow);
      } catch (error) {
        console.error("Error al cargar el detalle del pedido:", error);

        if (!isMounted) return;

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle del pedido."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadOrder();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user, id]);

  const totalPlates = useMemo(() => {
    if (!order) return 0;

    return (order.order_items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );
  }, [order]);

  const hasDiscount = useMemo(() => {
    return !!order && Number(order.discount_amount || 0) > 0;
  }, [order]);

  const hasShipping = useMemo(() => {
    return !!order && Number(order.shipping_amount || 0) > 0;
  }, [order]);

  const showLoading = authLoading || loading;

  if (!authLoading && !user) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12">
              <div className="text-2xl font-semibold">
                Inicia sesión para ver tu pedido
              </div>

              <p className="mt-3 text-sm leading-7 text-white/70">
                Necesitas una cuenta Mokko para revisar el detalle de tus
                pedidos.
              </p>

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  to="/login?next=/mis-pedidos"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                >
                  Iniciar sesión
                </Link>

                <Link
                  to="/register?next=/mis-pedidos"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
                >
                  Crear cuenta
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Detalle de pedido
                    </span>

                    <div className="space-y-4">
                      <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                        Pedido{" "}
                        <span className="text-[#E8C547]">
                          {order?.order_number || ""}
                        </span>
                      </h1>

                      <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Revisa las placas solicitadas, el total y el estado
                        actual de tu pedido.
                      </p>
                    </div>

                    {order && (
                      <div className="flex flex-wrap gap-2">
                        <StatusPill className={getStatusClass(order.status)}>
                          {getStatusLabel(order.status)}
                        </StatusPill>

                        <StatusPill className="border-white/10 bg-white/5 text-white/75">
                          {order.order_number}
                        </StatusPill>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <Link
                      to="/mis-pedidos"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] sm:w-auto sm:py-3.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Volver
                    </Link>

                    {order && (
                      <a
                        href={getOrderWhatsappUrl(order, "consult")}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Consultar por WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {showLoading ? (
                <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/65 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                  Cargando detalle del pedido...
                </div>
              ) : errorMsg ? (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {errorMsg}
                </div>
              ) : order ? (
                <>
                  <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm leading-6 text-[#f6df8a]">
                    {getStatusHint(order.status)}
                  </div>

                  <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                    <MetricCard
                      icon={PackageCheck}
                      label="Estado"
                      value={getStatusLabel(order.status)}
                      description="Actual."
                      highlight={
                        order.status === "delivered" ||
                        order.status === "ready"
                      }
                    />

                    <MetricCard
                      icon={ShoppingBag}
                      label="Placas"
                      value={totalPlates}
                      description="Solicitadas."
                    />

                    <MetricCard
                      icon={ReceiptText}
                      label="Total"
                      value={formatMoney(order.total, order.currency)}
                      description="Final."
                      highlight
                    />

                    <MetricCard
                      icon={Clock3}
                      label="Fecha"
                      value={formatDateTime(order.created_at)}
                      description="Creación."
                    />
                  </section>

                  <div className="mt-7 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                    <section className="grid gap-5">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">
                            Placas del pedido
                          </h2>

                          <p className="text-sm leading-7 text-white/65">
                            Detalle de cada placa solicitada.
                          </p>
                        </div>

                        <div className="mt-6 grid gap-4">
                          {(order.order_items ?? []).map((item, index) => {
                            const custom = item.customization_data || null;
                            const colorLabel = getColorLabelFromData(custom);
                            const shapeLabel = getShapeLabelFromData(custom);
                            const sizeLabel = getSizeLabelFromData(custom);

                            return (
                              <article
                                key={item.id}
                                className="rounded-[24px] border border-white/10 bg-[#141410] p-5"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                      Placa {index + 1}
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <h3 className="text-xl font-semibold">
                                        {getPlanLabel(item.sold_plan_type)}
                                      </h3>

                                      <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                        {getDesignLabel(item.design_type)}
                                      </StatusPill>
                                    </div>
                                  </div>

                                  <div className="text-left sm:text-right">
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                      Subtotal
                                    </div>
                                    <div className="mt-1 text-lg font-semibold text-[#E8C547]">
                                      {formatMoney(
                                        item.subtotal,
                                        order.currency
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                  {item.sold_plan_type === "custom" &&
                                    custom?.pet_name && (
                                      <InfoCard
                                        label="Nombre"
                                        value={String(custom.pet_name)}
                                      />
                                    )}

                                  {colorLabel && (
                                    <InfoCard label="Color" value={colorLabel} />
                                  )}

                                  {shapeLabel && (
                                    <InfoCard label="Forma" value={shapeLabel} />
                                  )}

                                  {sizeLabel && (
                                    <InfoCard label="Tamaño" value={sizeLabel} />
                                  )}

                                  <InfoCard
                                    label="Cantidad"
                                    value={String(Number(item.quantity || 0))}
                                  />

                                  <InfoCard
                                    label="Precio unitario"
                                    value={formatMoney(
                                      item.unit_price,
                                      order.currency
                                    )}
                                  />
                                </div>

                                {item.notes?.trim() && (
                                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                      Observaciones
                                    </div>
                                    <div className="mt-2 text-sm leading-7 text-white/70">
                                      {item.notes}
                                    </div>
                                  </div>
                                )}
                              </article>
                            );
                          })}
                        </div>
                      </div>
                    </section>

                    <aside className="grid content-start gap-6">
                      <section className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                            <ReceiptText className="h-5 w-5" />
                          </div>

                          <div>
                            <h2 className="text-2xl font-semibold">Resumen</h2>
                            <p className="mt-1 text-sm text-white/60">
                              Monto registrado del pedido.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 grid gap-3">
                          <ResumenMonto
                            label="Subtotal"
                            value={formatMoney(
                              order.subtotal,
                              order.currency
                            )}
                          />

                          {hasDiscount && (
                            <ResumenMonto
                              label="Descuento"
                              value={formatMoney(
                                order.discount_amount,
                                order.currency
                              )}
                            />
                          )}

                          {hasShipping && (
                            <ResumenMonto
                              label="Envío"
                              value={formatMoney(
                                order.shipping_amount,
                                order.currency
                              )}
                            />
                          )}

                          <ResumenMonto
                            label="Total final"
                            value={formatMoney(order.total, order.currency)}
                            highlight
                          />
                        </div>
                      </section>

                      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">
                            Datos del pedido
                          </h2>
                          <p className="text-sm leading-7 text-white/65">
                            Información registrada al generar la orden.
                          </p>
                        </div>

                        <div className="mt-6 grid gap-3">
                          <InfoPanel
                            label="Canal"
                            value={getSalesChannelLabel(order.sales_channel)}
                          />
                          <InfoPanel
                            label="Cliente"
                            value={order.guest_name || "—"}
                          />
                          <InfoPanel
                            label="Correo"
                            value={order.guest_email || "—"}
                          />
                          <InfoPanel
                            label="Teléfono"
                            value={order.guest_phone || "—"}
                          />
                          <InfoPanel
                            label="Confirmado"
                            value={formatDateTime(order.confirmed_at)}
                          />
                        </div>

                        {order.notes?.trim() && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-[#141410] p-4">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                              Observaciones del pedido
                            </div>
                            <div className="mt-2 text-sm leading-7 text-white/70">
                              {order.notes}
                            </div>
                          </div>
                        )}
                      </section>

                      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="flex items-start gap-3">
                          <Truck className="mt-1 h-5 w-5 text-[#E8C547]" />
                          <div>
                            <h2 className="text-xl font-semibold">
                              Acciones del pedido
                            </h2>
                            <p className="mt-2 text-sm leading-7 text-white/65">
                              Puedes consultar, solicitar cambios o pedir la
                              cancelación según el estado actual.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3">
                          <ActionLink
                            href={getOrderWhatsappUrl(order, "consult")}
                            icon={MessageCircle}
                            variant="yellow"
                          >
                            Consultar pedido
                          </ActionLink>

                          {canRequestChange(order.status) && (
                            <ActionLink
                              href={getOrderWhatsappUrl(order, "change")}
                              icon={PencilLine}
                              variant="neutral"
                            >
                              {getChangeLabel(order.status)}
                            </ActionLink>
                          )}

                          {canRequestCancellation(order.status) && (
                            <ActionLink
                              href={getOrderWhatsappUrl(order, "cancel")}
                              icon={XCircle}
                              variant="red"
                            >
                              Solicitar cancelación
                            </ActionLink>
                          )}

                          {canRepeatOrder(order.status) && (
                            <ActionLink
                              href={getOrderWhatsappUrl(order, "repeat")}
                              icon={Repeat2}
                              variant="green"
                            >
                              Repetir pedido
                            </ActionLink>
                          )}
                        </div>
                      </section>
                    </aside>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 sm:rounded-[28px] sm:p-5 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">
          {label}
        </div>

        <div
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            highlight
              ? "bg-[#E8C547]/14 text-[#E8C547]"
              : "bg-white/8 text-white/60"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 break-words text-lg font-semibold text-[#F5F0E8] sm:text-2xl">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white/85">
        {value}
      </div>
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white/80">
        {value}
      </div>
    </div>
  );
}

function ResumenMonto({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410]"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>

      <div
        className={`mt-2 break-words ${
          highlight
            ? "text-xl font-semibold text-[#E8C547]"
            : "text-base font-semibold text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${className}`}
    >
      {children}
    </span>
  );
}

function ActionLink({
  children,
  href,
  icon: Icon,
  variant,
}: {
  children: React.ReactNode;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "yellow" | "neutral" | "red" | "green";
}) {
  const variantClass =
    variant === "yellow"
      ? "border-[#E8C547]/20 bg-[#E8C547] text-[#1A1A14] hover:bg-[#f0cf55]"
      : variant === "red"
        ? "border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/15"
        : variant === "green"
          ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-100 hover:bg-[#2D5A27]/20"
          : "border-white/10 text-white/85 hover:bg-white/5";

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${variantClass}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </a>
  );
}
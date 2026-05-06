import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
    case "draft":
      return "border-white/10 bg-white/5 text-white/75";

    case "pending_payment":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#E8C547]";

    case "payment_submitted":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#E8C547]";

    case "paid":
      return "border-white/10 bg-white/5 text-white/85";

    case "in_production":
      return "border-white/10 bg-white/5 text-white/85";

    case "ready":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#F5F0E8]";

    case "shipped":
      return "border-white/10 bg-white/5 text-white/85";

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
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function formatMoney(value: number | string | null | undefined, currency = "PEN") {
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

export default function OrderDetail() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [order, setOrder] = useState<OrderRow | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !id) return;

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
        if (isMounted) {
          setLoading(false);
        }
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

  const supportWhatsappUrl = useMemo(() => {
    if (!order) return "#";

    const msg = [
      `Hola, quiero consultar por mi pedido ${order.order_number}.`,
      "",
      `Estado actual: ${getStatusLabel(order.status)}`,
    ].join("\n");

    return buildWhatsAppUrl(msg);
  }, [order]);

  const showLoading = authLoading || loading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/mis-pedidos"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  ← Volver a mis pedidos
                </Link>

                {order && (
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    {order.order_number}
                  </span>
                )}
              </div>

              {showLoading ? (
                <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                  Cargando detalle del pedido...
                </div>
              ) : errorMsg ? (
                <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              ) : order ? (
                <>
                  <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                        Pedido{" "}
                        <span className="text-[#E8C547]">{order.order_number}</span>
                      </h1>

                      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Aquí puedes revisar el detalle completo de tu pedido, las
                        placas solicitadas y su estado actual.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span
                        className={`inline-flex items-center justify-center rounded-full border px-4 py-2 text-center text-sm font-medium leading-none ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>

                      <a
                        href={supportWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                      >
                        Consultar por WhatsApp
                      </a>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-white/55">
                    {getStatusHint(order.status)}
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-4">
                    <div className="rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-6">
                      <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                        Estado
                      </div>
                      <div className="mt-3 text-2xl font-semibold text-[#E8C547]">
                        {getStatusLabel(order.status)}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                      <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                        Placas
                      </div>
                      <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                        {totalPlates}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                      <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                        Total
                      </div>
                      <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                        {formatMoney(order.total, order.currency)}
                      </div>
                    </div>

                    <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                      <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                        Fecha
                      </div>
                      <div className="mt-3 text-xl font-semibold text-[#E8C547]">
                        {formatDateTime(order.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-5">
                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
                        <h2 className="text-2xl font-semibold">Placas del pedido</h2>

                        <div className="mt-6 grid gap-4">
                          {(order.order_items ?? []).map((item, index) => {
                            const custom = item.customization_data || null;
                            const colorLabel = getColorLabelFromData(custom);
                            const shapeLabel = getShapeLabelFromData(custom);
                            const sizeLabel = getSizeLabelFromData(custom);

                            return (
                              <div
                                key={item.id}
                                className="rounded-[24px] border border-white/10 bg-[#141410] p-5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                      Placa {index + 1}
                                    </div>
                                    <div className="mt-2 text-xl font-semibold">
                                      {getPlanLabel(item.sold_plan_type)}
                                    </div>
                                  </div>

                                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                    {getDesignLabel(item.design_type)}
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                  {item.sold_plan_type === "custom" &&
                                    custom?.pet_name && (
                                      <DatoCard
                                        label="Nombre"
                                        value={String(custom.pet_name)}
                                      />
                                    )}

                                  {colorLabel && (
                                    <DatoCard label="Color" value={colorLabel} />
                                  )}

                                  {shapeLabel && (
                                    <DatoCard label="Forma" value={shapeLabel} />
                                  )}

                                  {sizeLabel && (
                                    <DatoCard label="Tamaño" value={sizeLabel} />
                                  )}

                                  <DatoCard
                                    label="Cantidad"
                                    value={String(Number(item.quantity || 0))}
                                  />

                                  <DatoCard
                                    label="Precio unitario"
                                    value={formatMoney(
                                      item.unit_price,
                                      order.currency
                                    )}
                                  />

                                  <DatoCard
                                    label="Subtotal"
                                    value={formatMoney(
                                      item.subtotal,
                                      order.currency
                                    )}
                                  />
                                </div>

                                {item.notes?.trim() && (
                                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                      Observaciones
                                    </div>
                                    <div className="mt-2 text-sm leading-7 text-white/70">
                                      {item.notes}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6">
                      <div className="rounded-[32px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                        <h2 className="text-2xl font-semibold">Resumen</h2>

                        <div className="mt-6 grid gap-3">
                          <ResumenMonto
                            label="Subtotal"
                            value={formatMoney(order.subtotal, order.currency)}
                          />
                          <ResumenMonto
                            label="Descuento"
                            value={formatMoney(
                              order.discount_amount,
                              order.currency
                            )}
                          />
                          <ResumenMonto
                            label="Envío"
                            value={formatMoney(
                              order.shipping_amount,
                              order.currency
                            )}
                          />
                          <ResumenMonto
                            label="Total final"
                            value={formatMoney(order.total, order.currency)}
                            highlight
                          />
                        </div>
                      </div>

                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6">
                        <h2 className="text-2xl font-semibold">Datos del pedido</h2>

                        <div className="mt-6 grid gap-3">
                          <DatoPanel
                            label="Canal"
                            value={getSalesChannelLabel(order.sales_channel)}
                          />
                          <DatoPanel
                            label="Cliente"
                            value={order.guest_name || "—"}
                          />
                          <DatoPanel
                            label="Correo"
                            value={order.guest_email || "—"}
                          />
                          <DatoPanel
                            label="Teléfono"
                            value={order.guest_phone || "—"}
                          />
                          <DatoPanel
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
                      </div>
                    </div>
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

function DatoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white/85">{value}</div>
    </div>
  );
}

function DatoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white/80">{value}</div>
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
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div
        className={`mt-2 ${
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
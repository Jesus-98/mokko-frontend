import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

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
} | null;

type OrderItemRow = {
  id: string;
  sold_plan_type: SoldPlanType;
  design_type: DesignType;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customization_data: CustomizationData;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  sales_channel: string;
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

function formatOrderDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
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
  if (custom.size?.trim()) return custom.size.trim();
  if (custom.size_code?.trim()) return custom.size_code.trim();

  return null;
}

export default function Orders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    let isMounted = true;

    const loadOrders = async () => {
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
            created_at,
            sales_channel,
            order_items (
              id,
              sold_plan_type,
              design_type,
              quantity,
              unit_price,
              subtotal,
              customization_data
            )
          `
          )
          .eq("customer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw new Error(error.message);
        }

        if (!isMounted) return;

        setOrders((data ?? []) as OrderRow[]);
      } catch (error) {
        console.error("Error al cargar los pedidos:", error);

        if (!isMounted) return;

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "No se pudieron cargar tus pedidos."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadOrders();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user]);

  const totalOrders = orders.length;

  const activeOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "delivered" && order.status !== "cancelled"
      ).length,
    [orders]
  );

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  );

  const totalPlates = useMemo(
    () =>
      orders.reduce(
        (sum, order) =>
          sum +
          (order.order_items ?? []).reduce(
            (itemsSum, item) => itemsSum + Number(item.quantity || 0),
            0
          ),
        0
      ),
    [orders]
  );

  const showLoading = authLoading || loading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Mis pedidos
              </span>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Historial de <span className="text-[#E8C547]">pedidos</span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    Aquí puedes revisar tus pedidos, su estado actual y el detalle
                    de las placas que solicitaste.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/pedido")}
                  className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                >
                  Hacer nuevo pedido
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            {showLoading ? (
              <div className="mx-auto mt-8 max-w-6xl rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                Cargando pedidos...
              </div>
            ) : (
              <>
                <div className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-4">
                  <div className="rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-6">
                    <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                      Pedidos
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                      {totalOrders}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Total de pedidos registrados.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                    <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                      Activos
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                      {activeOrders}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Pedidos aún en proceso.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                    <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                      Placas
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                      {totalPlates}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Placas pedidas en total.
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-white/8 bg-white/[0.04] p-6">
                    <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                      Total estimado
                    </div>
                    <div className="mt-3 text-4xl font-semibold text-[#E8C547]">
                      S/ {totalSpent.toFixed(0)}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Suma histórica de tus pedidos.
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-8 max-w-6xl">
                  {orders.length === 0 ? (
                    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                      <div className="text-2xl font-semibold">
                        Aún no tienes pedidos
                      </div>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
                        Cuando hagas tu primer pedido Mokko, aquí podrás ver el
                        número de orden, el estado y el detalle de las placas.
                      </p>

                      <button
                        type="button"
                        onClick={() => navigate("/pedido")}
                        className="mt-6 rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                      >
                        Hacer mi primer pedido
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-5">
                      {orders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h2 className="text-2xl font-semibold">
                                  {order.order_number}
                                </h2>

                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(
                                    order.status
                                  )}`}
                                >
                                  {getStatusLabel(order.status)}
                                </span>
                              </div>

                              <div className="mt-2 text-sm text-white/55">
                                {getStatusHint(order.status)}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/55">
                                <span>Fecha: {formatOrderDate(order.created_at)}</span>
                                <span>Canal: {getSalesChannelLabel(order.sales_channel)}</span>
                                <span>
                                  Placas:{" "}
                                  {(order.order_items ?? []).reduce(
                                    (sum, item) => sum + Number(item.quantity || 0),
                                    0
                                  )}
                                </span>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-[#141410] px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                Total
                              </div>
                              <div className="mt-2 text-xl font-semibold text-[#E8C547]">
                                S/ {Number(order.total || 0).toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 md:grid-cols-2">
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
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-base font-semibold">
                                      Placa {index + 1}
                                    </div>

                                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                      {getPlanLabel(item.sold_plan_type)}
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-2 text-sm text-white/70">
                                    {item.sold_plan_type === "custom" &&
                                      custom?.pet_name && (
                                        <div>
                                          <span className="text-white/45">Nombre:</span>{" "}
                                          {String(custom.pet_name)}
                                        </div>
                                      )}

                                    {colorLabel && (
                                      <div>
                                        <span className="text-white/45">Color:</span>{" "}
                                        {colorLabel}
                                      </div>
                                    )}

                                    {shapeLabel && (
                                      <div>
                                        <span className="text-white/45">Forma:</span>{" "}
                                        {shapeLabel}
                                      </div>
                                    )}

                                    {sizeLabel && (
                                      <div>
                                        <span className="text-white/45">Tamaño:</span>{" "}
                                        {sizeLabel}
                                      </div>
                                    )}

                                    <div>
                                      <span className="text-white/45">Cantidad:</span>{" "}
                                      {Number(item.quantity || 0)}
                                    </div>

                                    <div>
                                      <span className="text-white/45">Precio:</span>{" "}
                                      S/ {Number(item.unit_price || 0).toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/mis-pedidos/${order.id}`)}
                              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                            >
                              Ver detalle
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
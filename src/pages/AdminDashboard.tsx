import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import SectionTitle from "../components/ui/SectionTitle";
import AdminMetricCard from "../components/admin/AdminMetricCard";
import AdminModuleCard from "../components/admin/AdminModuleCard";
import AdminBarChart from "../components/admin/AdminBarChart";
import AdminEmptyState from "../components/admin/AdminEmptyState";
import AdminStatusBadge from "../components/admin/AdminStatusBadge";
import AdminPageHeader from "../components/admin/AdminPageHeader";
import AdminFlashMessages from "../components/admin/AdminFlashMessages";
import AdminAccessDenied from "../components/admin/AdminAccessDenied";
import { useAuth } from "../context/AuthContext";
import { adminModules } from "../data/admin/adminModules";
import { getAdminDashboardData } from "../services/admin/dashboard.service";
import type { AdminMetrics, ChartItem, RecentOrder } from "../types/admin";

const INITIAL_METRICS: AdminMetrics = {
  totalOrders: 0,
  pendingPaymentOrders: 0,
  inProductionOrders: 0,
  deliveredOrders: 0,
  newReports: 0,
  activePets: 0,
  totalUsers: 0,
  verifiedRevenueMonth: 0,
  verifiedRevenueTotal: 0,
};

type PriorityTone = "neutral" | "warm" | "green";

function formatCurrency(value: number, currency = "PEN") {
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0);
  } catch {
    return `S/ ${Number(value || 0).toFixed(2)}`;
  }
}

function formatDate(dateString: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function getChannelLabel(channel: string) {
  const map: Record<string, string> = {
    web: "Web",
    whatsapp: "WhatsApp",
    partner: "Aliado",
    manual: "Manual",
    presential: "Presencial",
  };

  return map[channel] || channel;
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Administrador";
  if (role === "partner") return "Aliado";
  if (role === "customer") return "Cliente";

  return "Sin rol";
}

function getPriorityClass(tone: PriorityTone) {
  if (tone === "warm") {
    return "border-[#E8C547]/20 bg-[#E8C547]/10";
  }

  if (tone === "green") {
    return "border-[#2D5A27]/30 bg-[#2D5A27]/15";
  }

  return "border-white/10 bg-white/[0.04]";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, role } = useAuth();

  const [metrics, setMetrics] = useState<AdminMetrics>(INITIAL_METRICS);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [salesByMonth, setSalesByMonth] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = useMemo(() => {
    return (
      profile?.full_name?.trim() ||
      user?.email?.split("@")[0] ||
      profile?.email?.split("@")[0] ||
      "Administrador"
    );
  }, [profile?.full_name, profile?.email, user?.email]);

  const displayEmail = user?.email || profile?.email || "Sin correo";
  const showLoading = authLoading || loading;

  const loadDashboard = useCallback(async () => {
    if (role !== "admin") return;

    try {
      setLoading(true);
      setError(null);

      const data = await getAdminDashboardData();

      setMetrics(data.metrics);
      setRecentOrders(data.recentOrders);
      setSalesByMonth(data.salesByMonth);
    } catch (err) {
      console.error("Error cargando Panel Administrativo:", err);
      setError(
        "No se pudo cargar el panel administrativo. Revisa permisos, políticas de acceso o lecturas de Supabase."
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (authLoading) return;

    if (role !== "admin") {
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [authLoading, role, loadDashboard]);

  const mainMetrics = useMemo(
    () => [
      {
        title: "Pedidos totales",
        value: metrics.totalOrders,
        subtitle: "Órdenes registradas",
        variant: "metricNeutral" as const,
      },
      {
        title: "Pendientes de pago",
        value: metrics.pendingPaymentOrders,
        subtitle: "Por regularizar",
        variant: "metricWarm" as const,
      },
      {
        title: "En producción",
        value: metrics.inProductionOrders,
        subtitle: "Actualmente en proceso",
        variant: "metricNeutral" as const,
      },
      {
        title: "Entregados",
        value: metrics.deliveredOrders,
        subtitle: "Completados",
        variant: "metricGreen" as const,
      },
    ],
    [metrics]
  );

  const businessMetrics = useMemo(
    () => [
      {
        title: "Ingresos del mes",
        value: formatCurrency(metrics.verifiedRevenueMonth),
        subtitle: "Pagos verificados",
        variant: "metricGreen" as const,
      },
      {
        title: "Ingresos acumulados",
        value: formatCurrency(metrics.verifiedRevenueTotal),
        subtitle: "Histórico verificado",
        variant: "metricNeutral" as const,
      },
      {
        title: "Reportes nuevos",
        value: metrics.newReports,
        subtitle: "Incidencias pendientes",
        variant: "metricWarm" as const,
      },
      {
        title: "Usuarios",
        value: metrics.totalUsers,
        subtitle: "Cuentas registradas",
        variant: "metricNeutral" as const,
      },
      {
        title: "Mascotas activas",
        value: metrics.activePets,
        subtitle: "Registradas en el sistema",
        variant: "metricGreen" as const,
      },
    ],
    [metrics]
  );

  const priorityItems = useMemo(
    () => [
      {
        label: "Pendientes de pago",
        value: metrics.pendingPaymentOrders,
        description: "Pedidos que requieren validación o seguimiento.",
        tone: "warm" as PriorityTone,
        actionLabel: "Ver pedidos",
        onClick: () => navigate("/admin/pedidos"),
      },
      {
        label: "En producción",
        value: metrics.inProductionOrders,
        description: "Pedidos que están en fabricación o preparación.",
        tone: "neutral" as PriorityTone,
        actionLabel: "Ver producción",
        onClick: () => navigate("/admin/pedidos"),
      },
      {
        label: "Reportes nuevos",
        value: metrics.newReports,
        description: "Reportes de hallazgo que conviene revisar pronto.",
        tone: "warm" as PriorityTone,
        actionLabel: "Ver reportes",
        onClick: () => navigate("/admin/reportes"),
      },
      {
        label: "Mascotas activas",
        value: metrics.activePets,
        description: "Base activa de mascotas registradas.",
        tone: "green" as PriorityTone,
        actionLabel: "Ver mascotas",
        onClick: () => navigate("/admin/mascotas"),
      },
    ],
    [metrics, navigate]
  );

  const quickActions = useMemo(
    () => [
      {
        title: "Pedidos",
        description: "Gestiona estados, notas y seguimiento comercial.",
        onClick: () => navigate("/admin/pedidos"),
      },
      {
        title: "Inventario de placas",
        description: "Revisa códigos fabricados, stock y exportación.",
        onClick: () => navigate("/admin/inventario-placas"),
      },
      {
        title: "Usuarios",
        description: "Consulta clientes, contacto y ubicación registrada.",
        onClick: () => navigate("/admin/usuarios"),
      },
      {
        title: "Mascotas",
        description: "Revisa mascotas registradas y sus perfiles.",
        onClick: () => navigate("/admin/mascotas"),
      },
      {
        title: "Reportes",
        description: "Atiende incidencias y reportes recientes.",
        onClick: () => navigate("/admin/reportes"),
      },
    ],
    [navigate]
  );

  if (!authLoading && role !== "admin") {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <AdminAccessDenied
            title="Acceso restringido"
            message="No tienes permisos para acceder al panel administrativo."
            backTo="/dashboard"
            backLabel="Ir a mi panel"
          />
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
            <div className="mx-auto max-w-7xl">
              <AdminPageHeader
                badge="Panel administrativo"
                title={`Hola, ${displayName}`}
                description="Centro de control de Mokko para pedidos, usuarios, mascotas, placas y reportes."
                actions={
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/dashboard")}
                      disabled={showLoading}
                      className="w-full sm:w-auto"
                    >
                      Panel cliente
                    </Button>

                    <Button
                      variant="ghost"
                      onClick={() => void loadDashboard()}
                      disabled={showLoading}
                      className="w-full sm:w-auto"
                    >
                      Refrescar
                    </Button>

                    <Button
                      variant="primary"
                      onClick={() => navigate("/admin/pedidos")}
                      disabled={showLoading}
                      className="w-full px-5 py-3 sm:w-auto"
                    >
                      Abrir pedidos
                    </Button>
                  </div>
                }
              />

              <AdminFlashMessages error={error || ""} className="mt-6" />

              <section className="mt-8">
                <SectionTitle
                  title="Prioridad operativa"
                  description="Lo que conviene revisar primero para operar hoy."
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {priorityItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={item.onClick}
                      disabled={showLoading}
                      className={`rounded-[26px] border p-5 text-left shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition hover:border-[#E8C547]/25 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 ${getPriorityClass(
                        item.tone
                      )}`}
                    >
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                        {item.label}
                      </div>

                      <div className="mt-3 text-3xl font-semibold text-[#F5F0E8]">
                        {showLoading ? "..." : item.value}
                      </div>

                      <p className="mt-2 text-sm leading-7 text-white/62">
                        {item.description}
                      </p>

                      <div className="mt-4 text-sm font-semibold text-[#E8C547]">
                        {item.actionLabel} →
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <SectionTitle
                  title="Indicadores principales"
                  description="Lectura rápida del estado actual de pedidos."
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {mainMetrics.map((item) => (
                    <AdminMetricCard
                      key={item.title}
                      title={item.title}
                      value={item.value}
                      subtitle={item.subtitle}
                      variant={item.variant}
                      loading={loading}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <SectionTitle
                  title="Negocio y soporte"
                  description="Métricas clave para seguimiento comercial y atención."
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {businessMetrics.map((item) => (
                    <AdminMetricCard
                      key={item.title}
                      title={item.title}
                      value={item.value}
                      subtitle={item.subtitle}
                      variant={item.variant}
                      loading={loading}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-8">
                <SectionTitle
                  title="Módulos administrativos"
                  description="Accede a las áreas principales del panel."
                />

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {adminModules.map((module) => (
                    <AdminModuleCard
                      key={module.key}
                      title={module.title}
                      description={module.description}
                      actionLabel="Abrir módulo"
                      onClick={() => navigate(module.href)}
                      disabled={showLoading}
                    />
                  ))}
                </div>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                <Card variant="panel" className="p-5 sm:p-6">
                  <SectionTitle
                    title="Ventas por mes"
                    description="Pagos verificados en los últimos 6 meses."
                  />

                  <div className="mt-6">
                    {loading ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
                        Cargando gráfico...
                      </div>
                    ) : salesByMonth.length === 0 ? (
                      <AdminEmptyState
                        title="Sin datos todavía"
                        description="Aún no hay ventas verificadas para mostrar."
                      />
                    ) : (
                      <AdminBarChart
                        items={salesByMonth}
                        valueFormatter={(value) => formatCurrency(value)}
                      />
                    )}
                  </div>
                </Card>

                <Card variant="panelWarm" className="p-5 sm:p-6">
                  <SectionTitle
                    title="Accesos rápidos"
                    description="Atajos para las tareas más frecuentes."
                  />

                  <div className="mt-6 grid gap-3">
                    {quickActions.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={item.onClick}
                        disabled={showLoading}
                        className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-[#E8C547]/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <div className="text-base font-semibold text-[#F5F0E8]">
                          {item.title}
                        </div>
                        <div className="mt-1 text-sm leading-7 text-white/65">
                          {item.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </section>

              <section className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
                <Card variant="panel" className="p-5 sm:p-6">
                  <SectionTitle
                    title="Actividad reciente"
                    description="Últimos pedidos registrados."
                  />

                  <div className="mt-6 space-y-3">
                    {loading ? (
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
                        Cargando actividad reciente...
                      </div>
                    ) : recentOrders.length === 0 ? (
                      <AdminEmptyState
                        title="Aún no hay pedidos recientes"
                        description="Cuando se registren pedidos aparecerán aquí."
                      />
                    ) : (
                      recentOrders.map((order) => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => navigate("/admin/pedidos")}
                          className="w-full rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-left transition hover:border-[#E8C547]/20 hover:bg-white/[0.05]"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="break-all text-base font-semibold text-[#F5F0E8]">
                                  {order.order_number}
                                </div>
                                <AdminStatusBadge status={order.status} />
                              </div>

                              <div className="mt-2 text-sm leading-7 text-white/65">
                                {order.guest_name || "Sin nombre"} ·{" "}
                                {order.guest_phone || "Sin teléfono"} ·{" "}
                                {getChannelLabel(order.sales_channel)}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-left md:min-w-[150px] md:text-right">
                              <div className="text-sm font-semibold text-[#F5F0E8]">
                                {formatCurrency(
                                  Number(order.total || 0),
                                  order.currency || "PEN"
                                )}
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.12em] text-white/45">
                                {formatDate(order.created_at)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </Card>

                <div className="grid gap-6">
                  <Card variant="panelGreen" className="p-5 sm:p-6">
                    <SectionTitle
                      title="Resumen de atención"
                      description="Lo más importante para operar hoy."
                    />

                    <div className="mt-6 grid gap-3">
                      <MiniSummaryCard
                        label="Pendientes de pago"
                        value={loading ? "..." : metrics.pendingPaymentOrders}
                      />

                      <MiniSummaryCard
                        label="En producción"
                        value={loading ? "..." : metrics.inProductionOrders}
                      />

                      <MiniSummaryCard
                        label="Reportes nuevos"
                        value={loading ? "..." : metrics.newReports}
                      />
                    </div>
                  </Card>

                  <Card variant="panel" className="p-5 sm:p-6">
                    <SectionTitle
                      title="Cuenta activa"
                      description="Resumen de la sesión actual."
                    />

                    <div className="mt-6 grid gap-3">
                      <MiniInfoCard label="Correo" value={displayEmail} />
                      <MiniInfoCard label="Nombre" value={displayName} />
                      <MiniInfoCard label="Rol" value={getRoleLabel(role)} />
                    </div>
                  </Card>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function MiniSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <Card
      variant="dark"
      className="rounded-2xl p-4 shadow-none backdrop-blur-none"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white/85">{value}</div>
    </Card>
  );
}

function MiniInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card
      variant="dark"
      className="rounded-2xl p-4 shadow-none backdrop-blur-none"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white/85">
        {value}
      </div>
    </Card>
  );
}
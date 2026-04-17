import { supabase } from "../../lib/supabase";
import type { AdminMetrics, ChartItem, RecentOrder } from "../../types/admin";

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

type OrderDashboardRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number | null;
  currency: string | null;
  sales_channel: string | null;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
};

const VERIFIED_REVENUE_STATUSES = new Set<OrderStatus>([
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
]);

const IN_PRODUCTION_STATUSES = new Set<OrderStatus>([
  "paid",
  "in_production",
  "ready",
  "shipped",
]);

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    month: "short",
  }).format(date);
}

function buildLastSixMonthsBase(): { key: string; label: string; value: number }[] {
  const months: { key: string; label: string; value: number }[] = [];
  const current = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(current.getFullYear(), current.getMonth() - i, 1);
    months.push({
      key: getMonthKey(date),
      label: getMonthLabel(date),
      value: 0,
    });
  }

  return months;
}

export async function getAdminDashboardData(): Promise<{
  metrics: AdminMetrics;
  recentOrders: RecentOrder[];
  salesByMonth: ChartItem[];
}> {
  const [
    ordersRes,
    reportsCountRes,
    petsCountRes,
    usersCountRes,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total,
        currency,
        sales_channel,
        created_at,
        guest_name,
        guest_phone
      `)
      .order("created_at", { ascending: false }),

    supabase
      .from("found_reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),

    supabase
      .from("pets")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true }),
  ]);

  if (ordersRes.error) {
    throw new Error(`No se pudieron cargar los pedidos: ${ordersRes.error.message}`);
  }

  if (reportsCountRes.error) {
    throw new Error(
      `No se pudieron cargar los reportes nuevos: ${reportsCountRes.error.message}`
    );
  }

  if (petsCountRes.error) {
    throw new Error(
      `No se pudieron cargar las mascotas activas: ${petsCountRes.error.message}`
    );
  }

  if (usersCountRes.error) {
    throw new Error(
      `No se pudieron cargar los usuarios: ${usersCountRes.error.message}`
    );
  }

  const orders = ((ordersRes.data ?? []) as OrderDashboardRow[]).map((order) => ({
    ...order,
    total: Number(order.total || 0),
  }));

  const totalOrders = orders.length;
  const pendingPaymentOrders = orders.filter(
    (order) =>
      order.status === "pending_payment" || order.status === "payment_submitted"
  ).length;

  const inProductionOrders = orders.filter((order) =>
    IN_PRODUCTION_STATUSES.has(order.status)
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  const verifiedOrders = orders.filter((order) =>
    VERIFIED_REVENUE_STATUSES.has(order.status)
  );

  const verifiedRevenueTotal = verifiedOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const now = new Date();
  const verifiedRevenueMonth = verifiedOrders
    .filter((order) => {
      const createdAt = new Date(order.created_at);

      return (
        createdAt.getFullYear() === now.getFullYear() &&
        createdAt.getMonth() === now.getMonth()
      );
    })
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const monthsBase = buildLastSixMonthsBase();
  const monthsMap = new Map(monthsBase.map((item) => [item.key, item]));

  for (const order of verifiedOrders) {
    const createdAt = new Date(order.created_at);
    if (Number.isNaN(createdAt.getTime())) continue;

    const key = getMonthKey(createdAt);
    const current = monthsMap.get(key);

    if (current) {
      current.value += Number(order.total || 0);
    }
  }

  const salesByMonth: ChartItem[] = monthsBase.map((item) => ({
    label: item.label,
    value: item.value,
  }));

  const recentOrders: RecentOrder[] = orders.slice(0, 5).map((order) => ({
    id: order.id,
    order_number: order.order_number,
    status: order.status,
    total: Number(order.total || 0),
    currency: order.currency || "PEN",
    sales_channel: order.sales_channel || "web",
    created_at: order.created_at,
    guest_name: order.guest_name,
    guest_phone: order.guest_phone,
  }));

  const metrics: AdminMetrics = {
    totalOrders,
    pendingPaymentOrders,
    inProductionOrders,
    deliveredOrders,
    newReports: reportsCountRes.count || 0,
    activePets: petsCountRes.count || 0,
    totalUsers: usersCountRes.count || 0,
    verifiedRevenueMonth,
    verifiedRevenueTotal,
  };

  return {
    metrics,
    recentOrders,
    salesByMonth,
  };
}
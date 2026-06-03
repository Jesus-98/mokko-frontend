import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../../components/ui/CustomSelect";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminFlashMessages from "../../components/admin/AdminFlashMessages";
import AdminAccessDenied from "../../components/admin/AdminAccessDenied";

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
type DateFilterField = "created_at" | "confirmed_at";

type OrderItemRow = {
  id: string;
  sold_plan_type: SoldPlanType;
  quantity: number;
  unit_price: number;
  subtotal: number;
  customization_data: {
    color?: string | null;
    color_label?: string | null;
    shape?: string | null;
    shape_label?: string | null;
    size?: string | null;
    size_code?: string | null;
    size_label?: string | null;
    pet_name?: string | null;
  } | null;
};

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  shipping_amount: number;
  total: number;
  currency: string;
  created_at: string;
  confirmed_at: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  sales_channel: string;
  notes: string | null;
  customer_user_id: string | null;
  order_items: OrderItemRow[];
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  country_id: string | null;
  division_level_1_id: string | null;
  division_level_2_id: string | null;
  division_level_3_id: string | null;
  address_line: string | null;
};

type CountryRow = {
  id: string;
  name: string;
  iso2: string;
};

type GeoDivisionRow = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  country_id: string;
};

type OrderViewRow = OrderRow & {
  display_name: string;
  display_email: string;
  display_phone: string;
  display_whatsapp: string;
  country_id: string | null;
  country_name: string | null;
  division_level_1_id: string | null;
  division_level_1_name: string | null;
  division_level_2_id: string | null;
  division_level_2_name: string | null;
  division_level_3_id: string | null;
  division_level_3_name: string | null;
  address_line: string | null;
  location_label: string;
};

type QuickFilter =
  | "all"
  | "pending"
  | "processing"
  | "delivered"
  | "cancelled";

type OrderAdjustmentDraft = {
  discount_amount: string;
  shipping_amount: string;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "draft",
  "pending_payment",
  "payment_submitted",
  "paid",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "cancelled",
];

const ITEMS_PER_PAGE = 10;

const inputClass =
  "w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 disabled:cursor-not-allowed disabled:opacity-60";

const dateInputClass = `${inputClass} [color-scheme:dark]`;

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

function getStatusClass(status: OrderStatus) {
  switch (status) {
    case "draft":
      return "border-white/10 bg-white/5 text-white/75";
    case "pending_payment":
    case "payment_submitted":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "paid":
    case "in_production":
    case "shipped":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "ready":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#F5F0E8]";
    case "delivered":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "cancelled":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-white/75";
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

function formatChannelLabel(channel: string | null | undefined) {
  const value = (channel || "").toLowerCase();

  if (value === "web") return "Web";
  if (value === "admin") return "Admin";
  if (value === "partner") return "Aliado";
  if (value === "manual") return "Manual";
  if (value === "whatsapp") return "WhatsApp";
  if (!value) return "No definido";

  return channel || "No definido";
}

function formatColorLabel(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();

  if (normalized === "white") return "Blanco";
  if (normalized === "black") return "Negro";
  if (normalized === "green") return "Verde";
  if (!value) return "—";

  return value;
}

function formatShapeLabel(value: string | null | undefined) {
  const normalized = (value || "").toLowerCase();

  if (normalized === "circle") return "Circular";
  if (normalized === "bone") return "Huesito";
  if (!value) return "—";

  return value;
}

function getColorLabelFromData(custom: OrderItemRow["customization_data"]) {
  if (!custom) return null;
  if (custom.color_label?.trim()) return custom.color_label.trim();
  return custom.color ? formatColorLabel(custom.color) : null;
}

function getShapeLabelFromData(custom: OrderItemRow["customization_data"]) {
  if (!custom) return null;
  if (custom.shape_label?.trim()) return custom.shape_label.trim();
  return custom.shape ? formatShapeLabel(custom.shape) : null;
}

function getSizeLabelFromData(custom: OrderItemRow["customization_data"]) {
  if (!custom) return null;
  if (custom.size_label?.trim()) return custom.size_label.trim();
  if (custom.size?.trim()) return custom.size.trim();
  if (custom.size_code?.trim()) return custom.size_code.trim();
  return null;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function buildLocationLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildItemSummary(item: OrderItemRow, index: number) {
  const custom = item.customization_data || null;
  const colorLabel = getColorLabelFromData(custom);
  const shapeLabel = getShapeLabelFromData(custom);
  const sizeLabel = getSizeLabelFromData(custom);

  const parts: string[] = [];

  parts.push(`Placa ${index + 1}`);
  parts.push(getPlanLabel(item.sold_plan_type));

  if (custom?.pet_name) parts.push(`Nombre: ${custom.pet_name}`);
  if (colorLabel) parts.push(`Color: ${colorLabel}`);
  if (shapeLabel) parts.push(`Forma: ${shapeLabel}`);
  if (sizeLabel) parts.push(`Tamaño: ${sizeLabel}`);

  return parts.join(" · ");
}

function matchesQuickFilter(status: OrderStatus, filter: QuickFilter) {
  if (filter === "all") return true;

  if (filter === "pending") {
    return status === "pending_payment" || status === "payment_submitted";
  }

  if (filter === "processing") {
    return (
      status === "paid" ||
      status === "in_production" ||
      status === "ready" ||
      status === "shipped"
    );
  }

  if (filter === "delivered") return status === "delivered";
  if (filter === "cancelled") return status === "cancelled";

  return true;
}

function sanitizeMoneyInput(value: string) {
  const sanitized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const parts = sanitized.split(".");

  if (parts.length <= 1) return sanitized;

  return `${parts[0]}.${parts.slice(1).join("")}`;
}

function parseMoney(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatMoneyInput(value: number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

function calculateFinalTotal(
  subtotal: number,
  discountAmount: number,
  shippingAmount: number
) {
  return subtotal - discountAmount + shippingAmount;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateInput() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return formatDateInput(today);
}

function getRelativeDateInput(daysAgo: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);

  return formatDateInput(date);
}

function getStartOfDay(dateValue: string) {
  return new Date(`${dateValue}T00:00:00`);
}

function getEndOfDay(dateValue: string) {
  return new Date(`${dateValue}T23:59:59.999`);
}

function getDateFieldLabel(field: DateFilterField) {
  return field === "created_at" ? "Fecha de creación" : "Fecha de confirmación";
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (
    let page = Math.max(1, currentPage - 1);
    page <= Math.min(totalPages, currentPage + 1);
    page++
  ) {
    pages.add(page);
  }

  const orderedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  for (let index = 0; index < orderedPages.length; index++) {
    const page = orderedPages[index];
    const previous = orderedPages[index - 1];

    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  return items;
}

function getPhoneDigits(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function getPhoneCallUrl(value: string | null | undefined) {
  const digits = getPhoneDigits(value);
  if (!digits) return "";

  return `tel:${digits}`;
}

function getWhatsAppUrl(value: string | null | undefined, orderNumber: string) {
  const digits = getPhoneDigits(value);
  if (!digits) return "";

  const message = encodeURIComponent(
    `Hola, te escribimos de Mokko por tu pedido ${orderNumber}.`
  );

  return `https://wa.me/${digits}?text=${message}`;
}

export default function AdminOrdersPage() {
  const { role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [orders, setOrders] = useState<OrderViewRow[]>([]);
  const [savingStatusOrderId, setSavingStatusOrderId] = useState<string | null>(
    null
  );
  const [savingAdjustmentsOrderId, setSavingAdjustmentsOrderId] = useState<
    string | null
  >(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [adjustmentsByOrder, setAdjustmentsByOrder] = useState<
    Record<string, OrderAdjustmentDraft>
  >({});

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const [countryFilter, setCountryFilter] = useState("");
  const [level1Filter, setLevel1Filter] = useState("");
  const [level2Filter, setLevel2Filter] = useState("");
  const [level3Filter, setLevel3Filter] = useState("");

  const [dateField, setDateField] = useState<DateFilterField>("created_at");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const loadOrders = useCallback(async () => {
    if (role !== "admin") return;

    setLoading(true);
    setErrorMsg("");
    setWarningMsg("");
    setSuccessMsg("");

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          status,
          subtotal,
          discount_amount,
          shipping_amount,
          total,
          currency,
          created_at,
          confirmed_at,
          guest_name,
          guest_email,
          guest_phone,
          sales_channel,
          notes,
          customer_user_id,
          order_items (
            id,
            sold_plan_type,
            quantity,
            unit_price,
            subtotal,
            customization_data
          )
        `
        )
        .order("created_at", { ascending: false });

      if (ordersError) {
        throw new Error(ordersError.message);
      }

      const baseOrders = (ordersData ?? []) as OrderRow[];
      const warnings: string[] = [];

      const profileIds = uniqueStrings(
        baseOrders.map((order) => order.customer_user_id)
      );

      let profilesData: ProfileRow[] = [];
      let countriesData: CountryRow[] = [];
      let divisionsData: GeoDivisionRow[] = [];

      if (profileIds.length > 0) {
        const { data: profilesRes, error: profilesError } = await supabase
          .from("profiles")
          .select(
            `
            id,
            full_name,
            email,
            phone,
            whatsapp_phone,
            country_id,
            division_level_1_id,
            division_level_2_id,
            division_level_3_id,
            address_line
          `
          )
          .in("id", profileIds);

        if (profilesError) {
          warnings.push(
            "No se pudo cargar la ubicación de todos los clientes. Se muestran datos parciales."
          );
        } else {
          profilesData = (profilesRes ?? []) as ProfileRow[];
        }
      }

      const countryIds = uniqueStrings(
        profilesData.map((profile) => profile.country_id)
      );
      const divisionIds = uniqueStrings([
        ...profilesData.map((profile) => profile.division_level_1_id),
        ...profilesData.map((profile) => profile.division_level_2_id),
        ...profilesData.map((profile) => profile.division_level_3_id),
      ]);

      if (countryIds.length > 0) {
        const { data: countriesRes, error: countriesError } = await supabase
          .from("countries")
          .select("id, name, iso2")
          .in("id", countryIds);

        if (countriesError) {
          warnings.push(
            "No se pudieron cargar todos los países asociados a los pedidos."
          );
        } else {
          countriesData = (countriesRes ?? []) as CountryRow[];
        }
      }

      if (divisionIds.length > 0) {
        const { data: divisionsRes, error: divisionsError } = await supabase
          .from("geo_divisions")
          .select("id, name, level, parent_id, country_id")
          .in("id", divisionIds);

        if (divisionsError) {
          warnings.push(
            "No se pudieron cargar todas las divisiones geográficas asociadas a los pedidos."
          );
        } else {
          divisionsData = (divisionsRes ?? []) as GeoDivisionRow[];
        }
      }

      const profilesMap = new Map(profilesData.map((item) => [item.id, item]));
      const countriesMap = new Map(countriesData.map((item) => [item.id, item]));
      const divisionsMap = new Map(divisionsData.map((item) => [item.id, item]));

      const normalizedOrders: OrderViewRow[] = baseOrders.map((order) => {
        const profile = order.customer_user_id
          ? profilesMap.get(order.customer_user_id) ?? null
          : null;

        const country = profile?.country_id
          ? countriesMap.get(profile.country_id) ?? null
          : null;

        const level1 = profile?.division_level_1_id
          ? divisionsMap.get(profile.division_level_1_id) ?? null
          : null;

        const level2 = profile?.division_level_2_id
          ? divisionsMap.get(profile.division_level_2_id) ?? null
          : null;

        const level3 = profile?.division_level_3_id
          ? divisionsMap.get(profile.division_level_3_id) ?? null
          : null;

        const locationLabel = buildLocationLabel([
          level3?.name,
          level2?.name,
          level1?.name,
          country?.name,
        ]);

        return {
          ...order,
          display_name:
            order.guest_name || profile?.full_name || "Cliente sin nombre",
          display_email:
            order.guest_email || profile?.email || "Sin correo registrado",
          display_phone:
            order.guest_phone ||
            profile?.phone ||
            profile?.whatsapp_phone ||
            "Sin teléfono registrado",
          display_whatsapp:
            profile?.whatsapp_phone ||
            order.guest_phone ||
            "Sin WhatsApp registrado",
          country_id: profile?.country_id || null,
          country_name: country?.name || null,
          division_level_1_id: profile?.division_level_1_id || null,
          division_level_1_name: level1?.name || null,
          division_level_2_id: profile?.division_level_2_id || null,
          division_level_2_name: level2?.name || null,
          division_level_3_id: profile?.division_level_3_id || null,
          division_level_3_name: level3?.name || null,
          address_line: profile?.address_line || null,
          location_label: locationLabel || "Sin ubicación registrada",
        };
      });

      const nextAdjustments: Record<string, OrderAdjustmentDraft> = {};
      normalizedOrders.forEach((order) => {
        nextAdjustments[order.id] = {
          discount_amount: formatMoneyInput(order.discount_amount),
          shipping_amount: formatMoneyInput(order.shipping_amount),
        };
      });

      setOrders(normalizedOrders);
      setAdjustmentsByOrder(nextAdjustments);
      setWarningMsg(warnings.join(" "));
    } catch (error) {
      console.error("AdminOrdersPage load error:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los pedidos."
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;

    void loadOrders();
  }, [authLoading, role, loadOrders]);

  const totalOrders = orders.length;

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "pending_payment" ||
          order.status === "payment_submitted"
      ).length,
    [orders]
  );

  const productionOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status === "paid" ||
          order.status === "in_production" ||
          order.status === "ready" ||
          order.status === "shipped"
      ).length,
    [orders]
  );

  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "delivered").length,
    [orders]
  );

  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === "cancelled").length,
    [orders]
  );

  const countryOptions = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    orders.forEach((order) => {
      if (order.country_id && order.country_name) {
        map.set(order.country_id, order.country_name);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [orders]);

  const level1Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    orders
      .filter((order) =>
        countryFilter ? order.country_id === countryFilter : true
      )
      .forEach((order) => {
        if (order.division_level_1_id && order.division_level_1_name) {
          map.set(order.division_level_1_id, order.division_level_1_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [orders, countryFilter]);

  const level2Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    orders
      .filter((order) =>
        countryFilter ? order.country_id === countryFilter : true
      )
      .filter((order) =>
        level1Filter ? order.division_level_1_id === level1Filter : true
      )
      .forEach((order) => {
        if (order.division_level_2_id && order.division_level_2_name) {
          map.set(order.division_level_2_id, order.division_level_2_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [orders, countryFilter, level1Filter]);

  const level3Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    orders
      .filter((order) =>
        countryFilter ? order.country_id === countryFilter : true
      )
      .filter((order) =>
        level1Filter ? order.division_level_1_id === level1Filter : true
      )
      .filter((order) =>
        level2Filter ? order.division_level_2_id === level2Filter : true
      )
      .forEach((order) => {
        if (order.division_level_3_id && order.division_level_3_name) {
          map.set(order.division_level_3_id, order.division_level_3_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [orders, countryFilter, level1Filter, level2Filter]);

  const statusOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: "all", label: "Todos" },
      ...STATUS_OPTIONS.map((status) => ({
        value: status,
        label: getStatusLabel(status),
      })),
    ],
    []
  );

  const dateFieldOptions = useMemo<CustomSelectOption[]>(
    () => [
      { value: "created_at", label: "Fecha de creación" },
      { value: "confirmed_at", label: "Fecha de confirmación" },
    ],
    []
  );

  const hasInvalidDateRange = useMemo(() => {
    return Boolean(dateFrom && dateTo && dateFrom > dateTo);
  }, [dateFrom, dateTo]);

  const filteredOrders = useMemo(() => {
    if (hasInvalidDateRange) return [];

    const term = normalizeText(searchTerm);

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" ? true : order.status === statusFilter;

      const matchesQuick = matchesQuickFilter(order.status, quickFilter);

      const matchesCountry = countryFilter
        ? order.country_id === countryFilter
        : true;

      const matchesLevel1 = level1Filter
        ? order.division_level_1_id === level1Filter
        : true;

      const matchesLevel2 = level2Filter
        ? order.division_level_2_id === level2Filter
        : true;

      const matchesLevel3 = level3Filter
        ? order.division_level_3_id === level3Filter
        : true;

      const targetDateValue =
        dateField === "created_at" ? order.created_at : order.confirmed_at;

      const matchesDateFrom = dateFrom
        ? targetDateValue
          ? new Date(targetDateValue) >= getStartOfDay(dateFrom)
          : false
        : true;

      const matchesDateTo = dateTo
        ? targetDateValue
          ? new Date(targetDateValue) <= getEndOfDay(dateTo)
          : false
        : true;

      const itemText = order.order_items
        .map((item, index) => buildItemSummary(item, index))
        .join(" ");

      const haystack = normalizeText(
        [
          order.order_number,
          order.display_name,
          order.display_email,
          order.display_phone,
          order.display_whatsapp,
          order.location_label,
          order.address_line || "",
          formatChannelLabel(order.sales_channel),
          order.notes || "",
          itemText,
        ].join(" ")
      );

      const matchesSearch = term ? haystack.includes(term) : true;

      return (
        matchesStatus &&
        matchesQuick &&
        matchesCountry &&
        matchesLevel1 &&
        matchesLevel2 &&
        matchesLevel3 &&
        matchesDateFrom &&
        matchesDateTo &&
        matchesSearch
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
    quickFilter,
    countryFilter,
    level1Filter,
    level2Filter,
    level3Filter,
    dateField,
    dateFrom,
    dateTo,
    hasInvalidDateRange,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    return filteredOrders.slice(start, end);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    quickFilter,
    countryFilter,
    level1Filter,
    level2Filter,
    level3Filter,
    dateField,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setQuickFilter("all");
    setCountryFilter("");
    setLevel1Filter("");
    setLevel2Filter("");
    setLevel3Filter("");
    setDateField("created_at");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
    setStatusFilter("all");
  };

  const applyDatePreset = (preset: "today" | "last7" | "last30") => {
    const today = getTodayDateInput();

    if (preset === "today") {
      setDateFrom(today);
      setDateTo(today);
      return;
    }

    if (preset === "last7") {
      setDateFrom(getRelativeDateInput(6));
      setDateTo(today);
      return;
    }

    setDateFrom(getRelativeDateInput(29));
    setDateTo(today);
  };

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setSavingStatusOrderId(orderId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const confirmedAt = new Date().toISOString();

      const payload: {
        status: OrderStatus;
        confirmed_at?: string | null;
      } = {
        status: nextStatus,
      };

      if (nextStatus === "paid") {
        payload.confirmed_at = confirmedAt;
      }

      const { error } = await supabase
        .from("orders")
        .update(payload)
        .eq("id", orderId);

      if (error) {
        throw new Error(error.message);
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: nextStatus,
                confirmed_at:
                  nextStatus === "paid" ? confirmedAt : order.confirmed_at,
              }
            : order
        )
      );

      setSuccessMsg("Estado actualizado correctamente.");
    } catch (error) {
      console.error("AdminOrdersPage update status error:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado."
      );
    } finally {
      setSavingStatusOrderId(null);
    }
  };

  const handleAdjustmentInputChange = (
    orderId: string,
    field: keyof OrderAdjustmentDraft,
    value: string
  ) => {
    setAdjustmentsByOrder((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {
          discount_amount: "0.00",
          shipping_amount: "0.00",
        }),
        [field]: sanitizeMoneyInput(value),
      },
    }));

    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleSaveAdjustments = async (order: OrderViewRow) => {
    const draft = adjustmentsByOrder[order.id] ?? {
      discount_amount: formatMoneyInput(order.discount_amount),
      shipping_amount: formatMoneyInput(order.shipping_amount),
    };

    const discountAmount = parseMoney(draft.discount_amount);
    const shippingAmount = parseMoney(draft.shipping_amount);

    if (Number.isNaN(discountAmount) || discountAmount < 0) {
      setErrorMsg("El descuento debe ser un número válido mayor o igual a 0.");
      return;
    }

    if (Number.isNaN(shippingAmount) || shippingAmount < 0) {
      setErrorMsg("El envío debe ser un número válido mayor o igual a 0.");
      return;
    }

    if (discountAmount > Number(order.subtotal || 0)) {
      setErrorMsg("El descuento no puede ser mayor al subtotal del pedido.");
      return;
    }

    const nextTotal = calculateFinalTotal(
      Number(order.subtotal || 0),
      discountAmount,
      shippingAmount
    );

    if (nextTotal < 0) {
      setErrorMsg("El total final no puede ser negativo.");
      return;
    }

    setSavingAdjustmentsOrderId(order.id);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          total: nextTotal,
        })
        .eq("id", order.id);

      if (error) {
        throw new Error(error.message);
      }

      setOrders((prev) =>
        prev.map((current) =>
          current.id === order.id
            ? {
                ...current,
                discount_amount: discountAmount,
                shipping_amount: shippingAmount,
                total: nextTotal,
              }
            : current
        )
      );

      setAdjustmentsByOrder((prev) => ({
        ...prev,
        [order.id]: {
          discount_amount: formatMoneyInput(discountAmount),
          shipping_amount: formatMoneyInput(shippingAmount),
        },
      }));

      setSuccessMsg("Descuento y envío actualizados correctamente.");
    } catch (error) {
      console.error("AdminOrdersPage save adjustments error:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los ajustes del pedido."
      );
    } finally {
      setSavingAdjustmentsOrderId(null);
    }
  };

  const exportCsv = () => {
    if (filteredOrders.length === 0) {
      setErrorMsg("No hay pedidos para exportar con los filtros actuales.");
      return;
    }

    const headers = [
      "Número de pedido",
      "Estado",
      "Fecha de creación",
      "Fecha de confirmación",
      "Cliente",
      "Correo",
      "Teléfono",
      "WhatsApp",
      "País",
      "Departamento/Región",
      "Provincia/Ciudad",
      "Distrito",
      "Dirección",
      "Canal",
      "Subtotal",
      "Descuento",
      "Envío",
      "Total",
      "Moneda",
      "Placas",
      "Notas",
    ];

    const rows = filteredOrders.map((order) => {
      const itemSummary = order.order_items
        .map((item, index) => buildItemSummary(item, index))
        .join(" | ");

      return [
        order.order_number,
        getStatusLabel(order.status),
        formatDateTime(order.created_at),
        order.confirmed_at ? formatDateTime(order.confirmed_at) : "",
        order.display_name,
        order.display_email,
        order.display_phone,
        order.display_whatsapp,
        order.country_name || "",
        order.division_level_1_name || "",
        order.division_level_2_name || "",
        order.division_level_3_name || "",
        order.address_line || "",
        formatChannelLabel(order.sales_channel),
        Number(order.subtotal || 0).toFixed(2),
        Number(order.discount_amount || 0).toFixed(2),
        Number(order.shipping_amount || 0).toFixed(2),
        Number(order.total || 0).toFixed(2),
        order.currency || "PEN",
        itemSummary,
        order.notes || "",
      ];
    });

    const csvContent = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `mokko-pedidos-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setSuccessMsg("CSV exportado correctamente.");
  };

  const goToPage = () => {
    const parsedPage = Number(pageInput);

    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    const safePage = Math.min(Math.max(1, Math.floor(parsedPage)), totalPages);
    setCurrentPage(safePage);
  };

  if (!authLoading && role !== "admin") {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <AdminAccessDenied message="No tienes permisos para acceder a la gestión de pedidos." />
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
                badge="Admin · Pedidos"
                title="Gestión de pedidos"
                description="Revisa pedidos, filtra por ubicación y fechas, actualiza estados, ajusta envío o descuento y exporta resultados."
                actions={
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={loading || filteredOrders.length === 0}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadOrders()}
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      {loading ? "Actualizando..." : "Recargar pedidos"}
                    </button>
                  </div>
                }
              />

              <AdminFlashMessages
                success={successMsg}
                error={errorMsg}
                warning={errorMsg ? "" : warningMsg}
                className="mt-6"
              />

              {loading ? (
                <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                  Cargando pedidos...
                </div>
              ) : (
                <>
                  <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                    <QuickStatCard
                      label="Total"
                      value={totalOrders}
                      active={quickFilter === "all"}
                      variant={quickFilter === "all" ? "yellow" : "neutral"}
                      onClick={() => applyQuickFilter("all")}
                    />

                    <QuickStatCard
                      label="Pendientes"
                      value={pendingOrders}
                      active={quickFilter === "pending"}
                      variant="yellow"
                      onClick={() => applyQuickFilter("pending")}
                    />

                    <QuickStatCard
                      label="En proceso"
                      value={productionOrders}
                      active={quickFilter === "processing"}
                      variant="neutral"
                      onClick={() => applyQuickFilter("processing")}
                    />

                    <QuickStatCard
                      label="Entregados"
                      value={deliveredOrders}
                      active={quickFilter === "delivered"}
                      variant="green"
                      onClick={() => applyQuickFilter("delivered")}
                    />

                    <QuickStatCard
                      label="Cancelados"
                      value={cancelledOrders}
                      active={quickFilter === "cancelled"}
                      variant="danger"
                      onClick={() => applyQuickFilter("cancelled")}
                    />
                  </section>

                  <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Filtros</h2>
                        <p className="mt-2 text-sm leading-7 text-white/60">
                          Busca por pedido, cliente, contacto, ubicación o
                          detalle de placas.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto"
                      >
                        Limpiar filtros
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.75fr_0.75fr_0.75fr_0.75fr_0.75fr]">
                      <div className="xl:col-span-2">
                        <label className="mb-2 block text-sm text-white/80">
                          Buscar pedido o cliente
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="MK-000123, cliente, correo, teléfono, dirección..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Estado
                        </label>
                        <CustomSelect
                          value={statusFilter}
                          onChange={(nextValue) =>
                            setStatusFilter(nextValue as "all" | OrderStatus)
                          }
                          options={statusOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          País
                        </label>
                        <CustomSelect
                          value={countryFilter}
                          onChange={(nextValue) => {
                            setCountryFilter(nextValue);
                            setLevel1Filter("");
                            setLevel2Filter("");
                            setLevel3Filter("");
                          }}
                          options={countryOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Departamento / región
                        </label>
                        <CustomSelect
                          value={level1Filter}
                          onChange={(nextValue) => {
                            setLevel1Filter(nextValue);
                            setLevel2Filter("");
                            setLevel3Filter("");
                          }}
                          options={level1Options}
                          placeholder="Todos"
                          disabled={!countryFilter && level1Options.length === 0}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Provincia / ciudad
                        </label>
                        <CustomSelect
                          value={level2Filter}
                          onChange={(nextValue) => {
                            setLevel2Filter(nextValue);
                            setLevel3Filter("");
                          }}
                          options={level2Options}
                          placeholder="Todos"
                          disabled={!level1Filter && level2Options.length === 0}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Distrito
                        </label>
                        <CustomSelect
                          value={level3Filter}
                          onChange={(nextValue) => setLevel3Filter(nextValue)}
                          options={level3Options}
                          placeholder="Todos"
                          disabled={!level2Filter && level3Options.length === 0}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_0.9fr_0.9fr_1.4fr]">
                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Campo de fecha
                        </label>
                        <CustomSelect
                          value={dateField}
                          onChange={(nextValue) =>
                            setDateField(nextValue as DateFilterField)
                          }
                          options={dateFieldOptions}
                          placeholder="Fecha de creación"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Fecha desde
                        </label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className={dateInputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Fecha hasta
                        </label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className={dateInputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Rangos rápidos
                        </label>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                          <button
                            type="button"
                            onClick={() => applyDatePreset("today")}
                            className="rounded-2xl border border-white/10 px-3 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:px-4"
                          >
                            Hoy
                          </button>

                          <button
                            type="button"
                            onClick={() => applyDatePreset("last7")}
                            className="rounded-2xl border border-white/10 px-3 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:px-4"
                          >
                            7 días
                          </button>

                          <button
                            type="button"
                            onClick={() => applyDatePreset("last30")}
                            className="rounded-2xl border border-white/10 px-3 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:px-4"
                          >
                            30 días
                          </button>
                        </div>
                      </div>
                    </div>

                    {hasInvalidDateRange && (
                      <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                        La fecha “desde” no puede ser mayor que la fecha “hasta”.
                      </div>
                    )}

                    {dateField === "confirmed_at" && (dateFrom || dateTo) && (
                      <div className="mt-4 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                        Estás filtrando por{" "}
                        <strong>{getDateFieldLabel(dateField)}</strong>. Los
                        pedidos aún no confirmados no aparecerán en este rango.
                      </div>
                    )}

                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white/60">
                      Mostrando{" "}
                      <span className="font-semibold text-white">
                        {filteredOrders.length}
                      </span>{" "}
                      pedido{filteredOrders.length === 1 ? "" : "s"}.
                    </div>
                  </section>

                  <section className="mt-8 grid gap-5">
                    {filteredOrders.length === 0 ? (
                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                        <div className="text-2xl font-semibold">
                          No se encontraron pedidos
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/65">
                          Ajusta la búsqueda o los filtros para ver otros
                          resultados.
                        </p>
                      </div>
                    ) : (
                      paginatedOrders.map((order) => {
                        const orderStatusOptions: CustomSelectOption[] =
                          STATUS_OPTIONS.map((status) => ({
                            value: status,
                            label: getStatusLabel(status),
                          }));

                        const draft = adjustmentsByOrder[order.id] ?? {
                          discount_amount: formatMoneyInput(
                            order.discount_amount
                          ),
                          shipping_amount: formatMoneyInput(
                            order.shipping_amount
                          ),
                        };

                        const draftDiscount = parseMoney(draft.discount_amount);
                        const draftShipping = parseMoney(draft.shipping_amount);

                        const recalculatedTotal =
                          !Number.isNaN(draftDiscount) &&
                          !Number.isNaN(draftShipping)
                            ? calculateFinalTotal(
                                Number(order.subtotal || 0),
                                draftDiscount,
                                draftShipping
                              )
                            : Number(order.total || 0);

                        const whatsappUrl = getWhatsAppUrl(
                          order.display_whatsapp || order.display_phone,
                          order.order_number
                        );

                        const callUrl = getPhoneCallUrl(
                          order.display_phone || order.display_whatsapp
                        );

                        return (
                          <article
                            key={order.id}
                            className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6"
                          >
                            <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
                              <div className="min-w-0">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <h2 className="break-all text-2xl font-semibold">
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

                                    <div className="mt-3 grid gap-2 text-sm text-white/58 sm:grid-cols-2 xl:grid-cols-4">
                                      <SmallInfo
                                        label="Fecha"
                                        value={formatDateTime(order.created_at)}
                                      />
                                      <SmallInfo
                                        label="Canal"
                                        value={formatChannelLabel(
                                          order.sales_channel
                                        )}
                                      />
                                      <SmallInfo
                                        label="Cliente"
                                        value={order.display_name}
                                      />
                                      <SmallInfo
                                        label="Teléfono"
                                        value={order.display_phone}
                                      />
                                    </div>

                                    <div className="mt-3 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm leading-6 text-white/65">
                                      <span className="text-white/40">
                                        Ubicación:
                                      </span>{" "}
                                      {order.location_label}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-4 md:grid-cols-2">
                                  {order.order_items.map((item, index) => {
                                    const custom =
                                      item.customization_data || null;
                                    const colorLabel =
                                      getColorLabelFromData(custom);
                                    const shapeLabel =
                                      getShapeLabelFromData(custom);
                                    const sizeLabel = getSizeLabelFromData(custom);

                                    return (
                                      <div
                                        key={item.id}
                                        className="rounded-[24px] border border-white/10 bg-[#141410] p-5"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                              Placa {index + 1}
                                            </div>

                                            <div className="mt-2 text-base font-semibold">
                                              {getPlanLabel(
                                                item.sold_plan_type
                                              )}
                                            </div>
                                          </div>

                                          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                                            Cant. {Number(item.quantity || 0)}
                                          </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 text-sm leading-6 text-white/70">
                                          {item.sold_plan_type === "custom" &&
                                            custom?.pet_name && (
                                              <SmallLine
                                                label="Nombre"
                                                value={String(custom.pet_name)}
                                              />
                                            )}

                                          {colorLabel && (
                                            <SmallLine
                                              label="Color"
                                              value={colorLabel}
                                            />
                                          )}

                                          {shapeLabel && (
                                            <SmallLine
                                              label="Forma"
                                              value={shapeLabel}
                                            />
                                          )}

                                          {sizeLabel && (
                                            <SmallLine
                                              label="Tamaño"
                                              value={sizeLabel}
                                            />
                                          )}

                                          <SmallLine
                                            label="Precio"
                                            value={formatMoney(
                                              item.unit_price,
                                              order.currency
                                            )}
                                          />

                                          <SmallLine
                                            label="Subtotal"
                                            value={formatMoney(
                                              item.subtotal,
                                              order.currency
                                            )}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {order.notes && (
                                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                                    {order.notes}
                                  </div>
                                )}

                                {expandedOrderId === order.id && (
                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <InfoBox
                                      label="Correo"
                                      value={order.display_email}
                                    />
                                    <InfoBox
                                      label="WhatsApp"
                                      value={order.display_whatsapp}
                                    />
                                    <InfoBox
                                      label="País"
                                      value={
                                        order.country_name || "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Departamento / región"
                                      value={
                                        order.division_level_1_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Provincia / ciudad"
                                      value={
                                        order.division_level_2_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Distrito"
                                      value={
                                        order.division_level_3_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Dirección"
                                      value={
                                        order.address_line || "No registrada"
                                      }
                                    />
                                    <InfoBox
                                      label="Confirmado"
                                      value={
                                        order.confirmed_at
                                          ? formatDateTime(order.confirmed_at)
                                          : "Aún no confirmado"
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              <aside className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Total actual
                                </div>

                                <div className="mt-2 text-2xl font-semibold text-[#E8C547]">
                                  {formatMoney(order.total, order.currency)}
                                </div>

                                <div className="mt-5 grid gap-3">
                                  <SummaryMiniBox
                                    label="Subtotal"
                                    value={formatMoney(
                                      order.subtotal,
                                      order.currency
                                    )}
                                  />

                                  <MoneyInputBox
                                    label="Descuento"
                                    value={draft.discount_amount}
                                    disabled={
                                      savingAdjustmentsOrderId === order.id
                                    }
                                    onChange={(value) =>
                                      handleAdjustmentInputChange(
                                        order.id,
                                        "discount_amount",
                                        value
                                      )
                                    }
                                  />

                                  <MoneyInputBox
                                    label="Envío"
                                    value={draft.shipping_amount}
                                    disabled={
                                      savingAdjustmentsOrderId === order.id
                                    }
                                    onChange={(value) =>
                                      handleAdjustmentInputChange(
                                        order.id,
                                        "shipping_amount",
                                        value
                                      )
                                    }
                                  />

                                  <SummaryMiniBox
                                    label="Total recalculado"
                                    value={formatMoney(
                                      recalculatedTotal,
                                      order.currency
                                    )}
                                    highlight
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleSaveAdjustments(order)
                                  }
                                  disabled={
                                    savingAdjustmentsOrderId === order.id
                                  }
                                  className="mt-5 w-full rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  {savingAdjustmentsOrderId === order.id
                                    ? "Guardando ajustes..."
                                    : "Guardar descuento y envío"}
                                </button>

                                <div className="mt-5">
                                  <label className="mb-2 block text-sm text-white/80">
                                    Cambiar estado
                                  </label>

                                  <CustomSelect
                                    value={order.status}
                                    onChange={(nextValue) =>
                                      void handleStatusChange(
                                        order.id,
                                        nextValue as OrderStatus
                                      )
                                    }
                                    options={orderStatusOptions}
                                    disabled={savingStatusOrderId === order.id}
                                  />
                                </div>

                                <div className="mt-5 grid gap-3">
                                  {whatsappUrl && (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20"
                                    >
                                      Escribir por WhatsApp
                                    </a>
                                  )}

                                  {callUrl && (
                                    <a
                                      href={callUrl}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Llamar cliente
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedOrderId((current) =>
                                        current === order.id ? null : order.id
                                      )
                                    }
                                    className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    {expandedOrderId === order.id
                                      ? "Ver menos"
                                      : "Ver más"}
                                  </button>
                                </div>
                              </aside>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>

                  {filteredOrders.length > 0 && (
                    <PaginationPanel
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageInput={pageInput}
                      paginationItems={paginationItems}
                      setCurrentPage={setCurrentPage}
                      setPageInput={setPageInput}
                      goToPage={goToPage}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function QuickStatCard({
  label,
  value,
  active,
  variant,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  variant: "yellow" | "green" | "danger" | "neutral";
  onClick: () => void;
}) {
  const variantClass =
    variant === "yellow"
      ? active
        ? "border-[#E8C547]/25 bg-[#E8C547]/10"
        : "border-[#E8C547]/15 bg-[#E8C547]/8"
      : variant === "green"
        ? active
          ? "border-[#2D5A27]/70 bg-[#12311c]"
          : "border-[#2D5A27]/60 bg-[#12311c]"
        : variant === "danger"
          ? active
            ? "border-red-400/30 bg-red-400/10"
            : "border-white/8 bg-white/[0.04]"
          : active
            ? "border-[#E8C547]/20 bg-[#E8C547]/8"
            : "border-white/8 bg-white/[0.04]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] sm:rounded-[28px] sm:p-6 ${variantClass}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 sm:text-sm">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-[#E8C547] sm:text-4xl">
        {value}
      </div>
    </button>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/35">{label}:</span>{" "}
      <span className="text-white/70">{value}</span>
    </div>
  );
}

function SmallLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/45">{label}:</span>{" "}
      <span className="text-white/78">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm leading-6 text-white/80">
        {value}
      </div>
    </div>
  );
}

function SummaryMiniBox({
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
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div
        className={`mt-2 text-sm font-medium ${
          highlight ? "text-[#E8C547]" : "text-white/85"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function MoneyInputBox({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <label className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </label>

      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder="0.00"
        className="mt-2 w-full rounded-xl border border-white/10 bg-[#141410] px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 disabled:opacity-60"
      />
    </div>
  );
}

function PaginationPanel({
  currentPage,
  totalPages,
  pageInput,
  paginationItems,
  setCurrentPage,
  setPageInput,
  goToPage,
}: {
  currentPage: number;
  totalPages: number;
  pageInput: string;
  paginationItems: Array<number | "ellipsis">;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageInput: React.Dispatch<React.SetStateAction<string>>;
  goToPage: () => void;
}) {
  return (
    <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="text-sm text-white/55">
          Página {currentPage} de {totalPages}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Primera
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-sm text-white/45"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`min-w-[44px] rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    currentPage === item
                      ? "bg-[#E8C547] text-[#1A1A14] shadow-lg shadow-[#E8C547]/20"
                      : "border border-white/10 text-white/85 hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Última
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-3 sm:flex sm:items-center">
          <label className="text-sm text-white/60">Ir a página</label>

          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                goToPage();
              }
            }}
            className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 sm:w-28"
          />

          <button
            type="button"
            onClick={goToPage}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
          >
            Ir
          </button>
        </div>
      </div>
    </section>
  );
}
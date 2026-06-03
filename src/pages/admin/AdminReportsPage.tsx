import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
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

type ReportStatus = "new" | "viewed" | "resolved" | "dismissed";
type ReportSource = "qr" | "nfc" | "manual" | "unknown";

type QuickFilter =
  | "all"
  | "new"
  | "viewed"
  | "resolved"
  | "dismissed"
  | "with_location";

type PresenceFilter = "all" | "with_value" | "without_value";
type LinkFilter = "all" | "with_pet" | "only_tag";

type RelationValue<T> = T | T[] | null;

type ReportOwnerProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
};

type ReportPetRow = {
  id: string;
  name: string;
  photo_url: string | null;
  owner_user_id: string | null;
  owner_profile: RelationValue<ReportOwnerProfileRow>;
};

type ReportTagRow = {
  id: string;
  code: string;
};

type ReportRow = {
  id: string;
  status: ReportStatus;
  reporter_name: string | null;
  reporter_phone: string | null;
  note: string | null;
  location_text: string | null;
  location_lat: number | null;
  location_lng: number | null;
  source: ReportSource | null;
  created_at: string;
  viewed_at: string | null;
  resolved_at: string | null;
  pet_id: string | null;
  tag_id: string;
  pets: RelationValue<ReportPetRow>;
  tags: RelationValue<ReportTagRow>;
};

const STATUS_OPTIONS: ReportStatus[] = [
  "new",
  "viewed",
  "resolved",
  "dismissed",
];

const ITEMS_PER_PAGE = 10;

const inputClass =
  "w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 disabled:cursor-not-allowed disabled:opacity-60";

const dateInputClass = `${inputClass} [color-scheme:dark]`;

function getStatusLabel(status: ReportStatus) {
  switch (status) {
    case "new":
      return "Nuevo";
    case "viewed":
      return "Visto";
    case "resolved":
      return "Resuelto";
    case "dismissed":
      return "Descartado";
    default:
      return status;
  }
}

function getStatusClass(status: ReportStatus) {
  switch (status) {
    case "new":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "viewed":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "resolved":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "dismissed":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-white/75";
  }
}

function getSourceLabel(source: ReportSource | null | undefined) {
  switch (source) {
    case "qr":
      return "Escaneo QR";
    case "nfc":
      return "Escaneo NFC";
    case "manual":
      return "Ingreso manual";
    case "unknown":
      return "No identificado";
    default:
      return "No identificado";
  }
}

function getSourceClass(source: ReportSource | null | undefined) {
  switch (source) {
    case "qr":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "nfc":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "manual":
      return "border-white/10 bg-white/5 text-white/75";
    default:
      return "border-white/10 bg-white/5 text-white/60";
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

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined) {
  return (phone || "").replace(/\D/g, "");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function firstRelation<T>(value: RelationValue<T> | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getPetOwnerProfile(pet: ReportPetRow | null) {
  return firstRelation(pet?.owner_profile);
}

function getOwnerName(pet: ReportPetRow | null) {
  const owner = getPetOwnerProfile(pet);

  return (
    owner?.full_name?.trim() ||
    owner?.email?.trim() ||
    "Dueño no disponible"
  );
}

function getOwnerPhone(pet: ReportPetRow | null) {
  const owner = getPetOwnerProfile(pet);

  return owner?.whatsapp_phone?.trim() || owner?.phone?.trim() || "";
}

function getOwnerEmail(pet: ReportPetRow | null) {
  const owner = getPetOwnerProfile(pet);

  return owner?.email?.trim() || "";
}

function hasText(value: string | null | undefined) {
  return !!value?.trim();
}

function hasLocation(report: ReportRow) {
  return (
    hasText(report.location_text) ||
    (report.location_lat != null && report.location_lng != null)
  );
}

function matchesPresenceFilter(
  value: string | null | undefined,
  filter: PresenceFilter
) {
  if (filter === "all") return true;
  if (filter === "with_value") return hasText(value);
  if (filter === "without_value") return !hasText(value);
  return true;
}

function matchesLocationFilter(report: ReportRow, filter: PresenceFilter) {
  if (filter === "all") return true;
  if (filter === "with_value") return hasLocation(report);
  if (filter === "without_value") return !hasLocation(report);
  return true;
}

function matchesLinkFilter(petId: string | null, filter: LinkFilter) {
  if (filter === "all") return true;
  if (filter === "with_pet") return !!petId;
  if (filter === "only_tag") return !petId;
  return true;
}

function matchesQuickFilter(report: ReportRow, filter: QuickFilter) {
  if (filter === "all") return true;

  if (filter === "with_location") {
    return hasLocation(report);
  }

  return report.status === filter;
}

function isWithinDateRange(value: string, dateFrom: string, dateTo: string) {
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return false;

  if (dateFrom) {
    const from = new Date(`${dateFrom}T00:00:00`);
    if (createdAt < from) return false;
  }

  if (dateTo) {
    const to = new Date(`${dateTo}T23:59:59.999`);
    if (createdAt > to) return false;
  }

  return true;
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

function getWhatsAppUrl(phone: string | null | undefined, tagCode?: string) {
  const digits = normalizePhone(phone);
  if (!digits) return "";

  const message = encodeURIComponent(
    tagCode
      ? `Hola, te escribimos de Mokko por el reporte enviado para la placa ${tagCode}.`
      : "Hola, te escribimos de Mokko por el reporte que enviaste."
  );

  return `https://wa.me/${digits}?text=${message}`;
}

function getOwnerWhatsAppUrl(
  phone: string | null | undefined,
  petName?: string,
  tagCode?: string
) {
  const digits = normalizePhone(phone);
  if (!digits) return "";

  const message = encodeURIComponent(
    `Hola, te escribimos de Mokko por un reporte recibido${
      petName ? ` para ${petName}` : ""
    }${tagCode ? ` con la placa ${tagCode}` : ""}.`
  );

  return `https://wa.me/${digits}?text=${message}`;
}

function getPhoneCallUrl(phone: string | null | undefined) {
  const digits = normalizePhone(phone);
  if (!digits) return "";

  return `tel:${digits}`;
}

function getMapsUrl(report: ReportRow) {
  if (report.location_lat == null || report.location_lng == null) return "";

  return `https://www.google.com/maps?q=${report.location_lat},${report.location_lng}`;
}

function getPublicProfileUrl(tagCode: string) {
  return `/p/${encodeURIComponent(tagCode)}`;
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export default function AdminReportsPage() {
  const { role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [locationFilter, setLocationFilter] = useState<PresenceFilter>("all");
  const [phoneFilter, setPhoneFilter] = useState<PresenceFilter>("all");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const loadReports = useCallback(async () => {
    if (role !== "admin") return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase
        .from("found_reports")
        .select(`
          id,
          status,
          reporter_name,
          reporter_phone,
          note,
          location_text,
          location_lat,
          location_lng,
          source,
          created_at,
          viewed_at,
          resolved_at,
          pet_id,
          tag_id,
          pets (
            id,
            name,
            photo_url,
            owner_user_id,
            owner_profile:profiles!pets_owner_user_id_fkey (
              full_name,
              email,
              phone,
              whatsapp_phone
            )
          ),
          tags (
            id,
            code
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setReports((data ?? []) as ReportRow[]);
    } catch (error) {
      console.error("AdminReportsPage load error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los reportes."
      );
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;

    void loadReports();
  }, [authLoading, role, loadReports]);

  const totalReports = reports.length;

  const newReports = useMemo(
    () => reports.filter((report) => report.status === "new").length,
    [reports]
  );

  const viewedReports = useMemo(
    () => reports.filter((report) => report.status === "viewed").length,
    [reports]
  );

  const resolvedReports = useMemo(
    () => reports.filter((report) => report.status === "resolved").length,
    [reports]
  );

  const dismissedReports = useMemo(
    () => reports.filter((report) => report.status === "dismissed").length,
    [reports]
  );

  const reportsWithLocation = useMemo(
    () => reports.filter((report) => hasLocation(report)).length,
    [reports]
  );

  const reportsWithPhone = useMemo(
    () => reports.filter((report) => hasText(report.reporter_phone)).length,
    [reports]
  );

  const statusOptions: CustomSelectOption[] = useMemo(
    () => [
      { value: "all", label: "Todos" },
      ...STATUS_OPTIONS.map((status) => ({
        value: status,
        label: getStatusLabel(status),
      })),
    ],
    []
  );

  const presenceOptions: CustomSelectOption[] = useMemo(
    () => [
      { value: "all", label: "Todos" },
      { value: "with_value", label: "Con dato" },
      { value: "without_value", label: "Sin dato" },
    ],
    []
  );

  const linkOptions: CustomSelectOption[] = useMemo(
    () => [
      { value: "all", label: "Todos" },
      { value: "with_pet", label: "Con mascota vinculada" },
      { value: "only_tag", label: "Solo placa" },
    ],
    []
  );

  const hasInvalidDateRange = useMemo(() => {
    return Boolean(dateFrom && dateTo && dateFrom > dateTo);
  }, [dateFrom, dateTo]);

  const filteredReports = useMemo(() => {
    if (hasInvalidDateRange) return [];

    const term = normalizeText(searchTerm);

    return reports.filter((report) => {
      const pet = firstRelation(report.pets);
      const tag = firstRelation(report.tags);
      const ownerName = getOwnerName(pet);
      const ownerPhone = getOwnerPhone(pet);
      const ownerEmail = getOwnerEmail(pet);

      const matchesStatus =
        statusFilter === "all" ? true : report.status === statusFilter;

      const matchesQuick = matchesQuickFilter(report, quickFilter);

      const matchesSearch = term
        ? normalizeText(
            [
              report.reporter_name || "",
              report.reporter_phone || "",
              report.location_text || "",
              report.note || "",
              pet?.name || "",
              tag?.code || "",
              ownerName,
              ownerPhone,
              ownerEmail,
              report.id,
              report.tag_id,
              report.pet_id || "",
              getSourceLabel(report.source),
              getStatusLabel(report.status),
            ].join(" ")
          ).includes(term)
        : true;

      const matchesDate = isWithinDateRange(
        report.created_at,
        dateFrom,
        dateTo
      );

      const matchesLocation = matchesLocationFilter(report, locationFilter);

      const matchesPhone = matchesPresenceFilter(
        report.reporter_phone,
        phoneFilter
      );

      const matchesLink = matchesLinkFilter(report.pet_id, linkFilter);

      return (
        matchesStatus &&
        matchesQuick &&
        matchesSearch &&
        matchesDate &&
        matchesLocation &&
        matchesPhone &&
        matchesLink
      );
    });
  }, [
    reports,
    searchTerm,
    statusFilter,
    quickFilter,
    dateFrom,
    dateTo,
    locationFilter,
    phoneFilter,
    linkFilter,
    hasInvalidDateRange,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredReports.length / ITEMS_PER_PAGE)
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    return filteredReports.slice(start, end);
  }, [filteredReports, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    statusFilter,
    quickFilter,
    dateFrom,
    dateTo,
    locationFilter,
    phoneFilter,
    linkFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handleStatusChange = async (
    reportId: string,
    nextStatus: ReportStatus
  ) => {
    setSavingReportId(reportId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const nowIso = new Date().toISOString();

      const payload: {
        status: ReportStatus;
        viewed_at?: string | null;
        resolved_at?: string | null;
      } = {
        status: nextStatus,
      };

      if (nextStatus === "viewed") {
        payload.viewed_at = nowIso;
      }

      if (nextStatus === "resolved") {
        payload.viewed_at = nowIso;
        payload.resolved_at = nowIso;
      }

      if (nextStatus === "dismissed") {
        payload.resolved_at = null;
      }

      const { error } = await supabase
        .from("found_reports")
        .update(payload)
        .eq("id", reportId);

      if (error) {
        throw new Error(error.message);
      }

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: nextStatus,
                viewed_at:
                  nextStatus === "viewed" || nextStatus === "resolved"
                    ? nowIso
                    : report.viewed_at,
                resolved_at:
                  nextStatus === "resolved"
                    ? nowIso
                    : nextStatus === "dismissed"
                      ? null
                      : report.resolved_at,
              }
            : report
        )
      );

      setSuccessMsg("Estado del reporte actualizado correctamente.");
    } catch (error) {
      console.error("AdminReportsPage update status error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del reporte."
      );
    } finally {
      setSavingReportId(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setQuickFilter("all");
    setDateFrom("");
    setDateTo("");
    setLocationFilter("all");
    setPhoneFilter("all");
    setLinkFilter("all");
    setCurrentPage(1);
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

  const exportCsv = () => {
    if (filteredReports.length === 0) {
      setErrorMsg("No hay reportes para exportar con los filtros actuales.");
      return;
    }

    const headers = [
      "Estado",
      "Origen",
      "Fecha",
      "Mascota",
      "Código de placa",
      "Dueño",
      "Correo dueño",
      "Teléfono dueño",
      "Reportante",
      "Teléfono reportante",
      "Ubicación",
      "Latitud",
      "Longitud",
      "Nota",
      "Visto",
      "Resuelto",
      "ID reporte",
      "ID mascota",
      "ID placa",
    ];

    const rows = filteredReports.map((report) => {
      const pet = firstRelation(report.pets);
      const tag = firstRelation(report.tags);

      return [
        getStatusLabel(report.status),
        getSourceLabel(report.source),
        formatDateTime(report.created_at),
        pet?.name || "",
        tag?.code || "",
        getOwnerName(pet),
        getOwnerEmail(pet),
        getOwnerPhone(pet),
        report.reporter_name || "",
        report.reporter_phone || "",
        report.location_text || "",
        report.location_lat ?? "",
        report.location_lng ?? "",
        report.note || "",
        report.viewed_at ? formatDateTime(report.viewed_at) : "",
        report.resolved_at ? formatDateTime(report.resolved_at) : "",
        report.id,
        report.pet_id || "",
        report.tag_id || "",
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
    anchor.download = `mokko-reportes-${datePart}.csv`;
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
          <AdminAccessDenied message="No tienes permisos para acceder a la gestión de reportes." />
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
                badge="Admin · Reportes"
                title="Gestión de reportes"
                description="Revisa reportes nuevos, reportantes, ubicación, dueño de la mascota y cambia el estado de atención."
                actions={
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={loading || filteredReports.length === 0}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadReports()}
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      {loading ? "Actualizando..." : "Recargar reportes"}
                    </button>
                  </div>
                }
              />

              <AdminFlashMessages
                success={successMsg}
                error={errorMsg}
                className="mt-6"
              />

              {loading ? (
                <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                  Cargando reportes...
                </div>
              ) : (
                <>
                  <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
                    <StatCard
                      label="Total"
                      value={totalReports}
                      active={quickFilter === "all"}
                      variant={quickFilter === "all" ? "yellow" : "neutral"}
                      onClick={() => setQuickFilter("all")}
                    />

                    <StatCard
                      label="Nuevos"
                      value={newReports}
                      active={quickFilter === "new"}
                      variant="yellow"
                      onClick={() => setQuickFilter("new")}
                    />

                    <StatCard
                      label="Vistos"
                      value={viewedReports}
                      active={quickFilter === "viewed"}
                      variant="neutral"
                      onClick={() => setQuickFilter("viewed")}
                    />

                    <StatCard
                      label="Resueltos"
                      value={resolvedReports}
                      active={quickFilter === "resolved"}
                      variant="green"
                      onClick={() => setQuickFilter("resolved")}
                    />

                    <StatCard
                      label="Descartados"
                      value={dismissedReports}
                      active={quickFilter === "dismissed"}
                      variant="danger"
                      onClick={() => setQuickFilter("dismissed")}
                    />

                    <StatCard
                      label="Con ubicación"
                      value={reportsWithLocation}
                      active={quickFilter === "with_location"}
                      variant="neutral"
                      onClick={() => setQuickFilter("with_location")}
                    />
                  </section>

                  <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Filtros</h2>
                        <p className="mt-2 text-sm leading-7 text-white/60">
                          Busca por reportante, dueño, teléfono, ubicación,
                          mascota, código de placa, nota, origen o estado.
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

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.75fr_0.75fr_0.75fr_0.75fr]">
                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Buscar reporte
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Dueño, teléfono, mascota, placa, ubicación..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Estado
                        </label>
                        <CustomSelect
                          value={statusFilter}
                          onChange={(value) =>
                            setStatusFilter(value as "all" | ReportStatus)
                          }
                          options={statusOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Ubicación
                        </label>
                        <CustomSelect
                          value={locationFilter}
                          onChange={(value) =>
                            setLocationFilter(value as PresenceFilter)
                          }
                          options={presenceOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Teléfono reportante
                        </label>
                        <CustomSelect
                          value={phoneFilter}
                          onChange={(value) =>
                            setPhoneFilter(value as PresenceFilter)
                          }
                          options={presenceOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Vinculación
                        </label>
                        <CustomSelect
                          value={linkFilter}
                          onChange={(value) => setLinkFilter(value as LinkFilter)}
                          options={linkOptions}
                          placeholder="Todos"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[0.8fr_0.8fr_1.3fr]">
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

                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white/60">
                      Mostrando{" "}
                      <span className="font-semibold text-white">
                        {filteredReports.length}
                      </span>{" "}
                      reporte{filteredReports.length === 1 ? "" : "s"}. Con
                      teléfono del reportante:{" "}
                      <span className="font-semibold text-white">
                        {reportsWithPhone}
                      </span>
                      . Con ubicación:{" "}
                      <span className="font-semibold text-white">
                        {reportsWithLocation}
                      </span>
                      .
                    </div>
                  </section>

                  <section className="mt-8 grid gap-5">
                    {filteredReports.length === 0 ? (
                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                        <div className="text-2xl font-semibold">
                          No se encontraron reportes
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/65">
                          Ajusta la búsqueda o los filtros para ver otros
                          resultados.
                        </p>
                      </div>
                    ) : (
                      paginatedReports.map((report) => {
                        const pet = firstRelation(report.pets);
                        const tag = firstRelation(report.tags);
                        const tagCode = tag?.code || "";

                        const ownerName = getOwnerName(pet);
                        const ownerPhone = getOwnerPhone(pet);
                        const ownerEmail = getOwnerEmail(pet);
                        const ownerWhatsappUrl = getOwnerWhatsAppUrl(
                          ownerPhone,
                          pet?.name,
                          tagCode
                        );
                        const ownerCallUrl = getPhoneCallUrl(ownerPhone);

                        const whatsappUrl = getWhatsAppUrl(
                          report.reporter_phone,
                          tagCode
                        );
                        const callUrl = getPhoneCallUrl(report.reporter_phone);
                        const mapsUrl = getMapsUrl(report);
                        const publicProfileUrl = tagCode
                          ? getPublicProfileUrl(tagCode)
                          : "";

                        return (
                          <article
                            key={report.id}
                            className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6"
                          >
                            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                              <div className="min-w-0">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141410]">
                                    {pet?.photo_url ? (
                                      <img
                                        src={pet.photo_url}
                                        alt={`Foto de ${pet.name}`}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                                        Sin foto
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h2 className="break-words text-2xl font-semibold">
                                        Reporte{" "}
                                        {tagCode ? `· ${tagCode}` : ""}
                                      </h2>

                                      <StatusPill
                                        className={getStatusClass(report.status)}
                                      >
                                        {getStatusLabel(report.status)}
                                      </StatusPill>

                                      <StatusPill
                                        className={getSourceClass(report.source)}
                                      >
                                        {getSourceLabel(report.source)}
                                      </StatusPill>

                                      {hasLocation(report) && (
                                        <StatusPill className="border-blue-400/20 bg-blue-400/10 text-blue-200">
                                          Con ubicación
                                        </StatusPill>
                                      )}
                                    </div>

                                    <div className="mt-3 grid gap-2 text-sm text-white/62 sm:grid-cols-2 xl:grid-cols-3">
                                      <SmallInfo
                                        label="Fecha"
                                        value={formatDateTime(report.created_at)}
                                      />
                                      <SmallInfo
                                        label="Mascota"
                                        value={pet?.name || "No vinculada"}
                                      />
                                      <SmallInfo
                                        label="Placa"
                                        value={tagCode || "No disponible"}
                                      />
                                      <SmallInfo
                                        label="Dueño"
                                        value={ownerName}
                                      />
                                      <SmallInfo
                                        label="Contacto dueño"
                                        value={ownerPhone || "No disponible"}
                                      />
                                      <SmallInfo
                                        label="Reportante"
                                        value={report.reporter_name || "—"}
                                      />
                                      <SmallInfo
                                        label="Teléfono reportante"
                                        value={report.reporter_phone || "—"}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {report.location_text && (
                                  <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                                    <span className="text-white/45">
                                      Ubicación:
                                    </span>{" "}
                                    {report.location_text}
                                  </div>
                                )}

                                {report.note && (
                                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                                    <span className="text-white/45">Nota:</span>{" "}
                                    {report.note}
                                  </div>
                                )}

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                  <InfoBox
                                    label="Visto"
                                    value={
                                      report.viewed_at
                                        ? formatDateTime(report.viewed_at)
                                        : "Aún no"
                                    }
                                  />

                                  <InfoBox
                                    label="Resuelto"
                                    value={
                                      report.resolved_at
                                        ? formatDateTime(report.resolved_at)
                                        : "Aún no"
                                    }
                                  />
                                </div>

                                {expandedReportId === report.id && (
                                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <InfoBox label="Dueño" value={ownerName} />

                                    <InfoBox
                                      label="Correo dueño"
                                      value={ownerEmail || "No disponible"}
                                    />

                                    <InfoBox
                                      label="Teléfono / WhatsApp dueño"
                                      value={ownerPhone || "No disponible"}
                                    />

                                    <InfoBox
                                      label="ID reporte"
                                      value={report.id}
                                    />

                                    <InfoBox
                                      label="ID placa"
                                      value={report.tag_id}
                                    />

                                    <InfoBox
                                      label="ID mascota"
                                      value={report.pet_id || "No asociado"}
                                    />

                                    <InfoBox
                                      label="Código de placa"
                                      value={tagCode || "No disponible"}
                                    />

                                    <InfoBox
                                      label="Latitud"
                                      value={
                                        report.location_lat != null
                                          ? String(report.location_lat)
                                          : "No disponible"
                                      }
                                    />

                                    <InfoBox
                                      label="Longitud"
                                      value={
                                        report.location_lng != null
                                          ? String(report.location_lng)
                                          : "No disponible"
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              <aside className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Acción rápida
                                </div>

                                <div className="mt-5">
                                  <label className="mb-2 block text-sm text-white/80">
                                    Cambiar estado
                                  </label>

                                  <CustomSelect
                                    value={report.status}
                                    onChange={(value) =>
                                      void handleStatusChange(report.id, value as ReportStatus)
                                    }
                                    options={STATUS_OPTIONS.map((status) => ({
                                      value: status,
                                      label: getStatusLabel(status),
                                    }))}
                                    disabled={savingReportId === report.id}
                                  />
                                </div>

                                <ActionGroup title="Atender reporte">
                                  {mapsUrl ? (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-400/15"
                                    >
                                      Abrir ubicación
                                    </a>
                                  ) : (
                                    <div className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/45">
                                      Sin coordenadas exactas
                                    </div>
                                  )}

                                  {ownerWhatsappUrl ? (
                                    <a
                                      href={ownerWhatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#F5F0E8] transition hover:bg-[#E8C547]/15"
                                    >
                                      WhatsApp dueño
                                    </a>
                                  ) : (
                                    <div className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/45">
                                      Sin WhatsApp del dueño
                                    </div>
                                  )}

                                  {ownerCallUrl && (
                                    <a
                                      href={ownerCallUrl}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Llamar dueño
                                    </a>
                                  )}
                                </ActionGroup>

                                <ActionGroup title="Contactar reportante">
                                  {whatsappUrl ? (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20"
                                    >
                                      WhatsApp reportante
                                    </a>
                                  ) : (
                                    <div className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/45">
                                      Sin teléfono del reportante
                                    </div>
                                  )}

                                  {callUrl && (
                                    <a
                                      href={callUrl}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Llamar reportante
                                    </a>
                                  )}
                                </ActionGroup>

                                <ActionGroup title="Gestión interna">
                                  {publicProfileUrl && (
                                    <a
                                      href={publicProfileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#F5F0E8] transition hover:bg-[#E8C547]/15"
                                    >
                                      Abrir perfil público
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await copyText(report.id);
                                        setSuccessMsg("ID de reporte copiado correctamente.");
                                      } catch {
                                        setErrorMsg("No se pudo copiar el ID del reporte.");
                                      }
                                    }}
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    Copiar ID del reporte
                                  </button>

                                  {tagCode && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await copyText(tagCode);
                                          setSuccessMsg("Código de placa copiado correctamente.");
                                        } catch {
                                          setErrorMsg("No se pudo copiar el código de placa.");
                                        }
                                      }}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Copiar código de placa
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedReportId((current) =>
                                        current === report.id ? null : report.id
                                      )
                                    }
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    {expandedReportId === report.id ? "Ver menos" : "Ver más"}
                                  </button>
                                </ActionGroup>
                              </aside>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>

                  {filteredReports.length > 0 && (
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

function StatCard({
  label,
  value,
  active = false,
  variant,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  variant: "green" | "yellow" | "neutral" | "danger";
  onClick?: () => void;
}) {
  const variantClass =
    variant === "green"
      ? active
        ? "border-[#2D5A27]/70 bg-[#12311c]"
        : "border-[#2D5A27]/60 bg-[#12311c]"
      : variant === "yellow"
        ? active
          ? "border-[#E8C547]/25 bg-[#E8C547]/10"
          : "border-[#E8C547]/15 bg-[#E8C547]/8"
        : variant === "danger"
          ? active
            ? "border-red-400/30 bg-red-400/10"
            : "border-white/8 bg-white/[0.04]"
          : active
            ? "border-[#E8C547]/20 bg-[#E8C547]/8"
            : "border-white/8 bg-white/[0.04]";

  const content = (
    <>
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 sm:text-sm">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-[#E8C547] sm:text-4xl">
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] sm:rounded-[28px] sm:p-6 ${variantClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`rounded-[24px] border p-4 sm:rounded-[28px] sm:p-6 ${variantClass}`}
    >
      {content}
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

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/35">{label}:</span>{" "}
      <span className="text-white/70">{value}</span>
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

function ActionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </div>

      <div className="grid gap-3">{children}</div>
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
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
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
import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../../components/ui/CustomSelect";
import Badge from "../../components/ui/Badge";

type TagStatus =
  | "available"
  | "reserved"
  | "activated"
  | "suspended"
  | "lost"
  | "retired";

type SoldPlanType = "essential" | "custom" | "partner_batch" | "other";

type FabricationFilter = "all" | "fabricated" | "not_fabricated";
type StatusFilter = "all" | TagStatus;
type PlanFilter = "all" | SoldPlanType;

type TagRow = {
  id: string;
  code: string;
  status: TagStatus;
  sold_plan_type: SoldPlanType | null;
  is_fabricated: boolean;
  fabricated_at: string | null;
  created_at: string;
};

type InventorySummary = {
  totalTags: number;
  fabricatedCount: number;
  notFabricatedCount: number;
  readyToSellCount: number;
  activatedCount: number;
};

const INITIAL_SUMMARY: InventorySummary = {
  totalTags: 0,
  fabricatedCount: 0,
  notFabricatedCount: 0,
  readyToSellCount: 0,
  activatedCount: 0,
};

const PAGE_SIZE_OPTIONS: CustomSelectOption[] = [
  { value: "50", label: "50 por página" },
  { value: "100", label: "100 por página" },
  { value: "200", label: "200 por página" },
];

const STATUS_SEARCH_MAP: Array<{
  value: TagStatus;
  terms: string[];
}> = [
  { value: "available", terms: ["disponible", "available", "dispon", "stock"] },
  { value: "reserved", terms: ["reservada", "reservado", "reserved", "reserva"] },
  { value: "activated", terms: ["activada", "activado", "activated", "activa"] },
  { value: "suspended", terms: ["suspendida", "suspendido", "suspended"] },
  { value: "lost", terms: ["extraviada", "extraviado", "perdida", "perdido", "lost"] },
  { value: "retired", terms: ["retirada", "retirado", "retired", "baja"] },
];

const PLAN_SEARCH_MAP: Array<{
  value: SoldPlanType;
  terms: string[];
}> = [
  { value: "essential", terms: ["essential", "esencial"] },
  { value: "custom", terms: ["custom", "personalizada", "personalizado"] },
  {
    value: "partner_batch",
    terms: ["partner", "partner_batch", "lote aliado", "aliado"],
  },
  { value: "other", terms: ["otro", "otros", "other"] },
];

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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

function getPlanLabel(plan: SoldPlanType | null | undefined) {
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
      return "Sin plan";
  }
}

function getStatusLabel(status: TagStatus) {
  switch (status) {
    case "available":
      return "Disponible";
    case "reserved":
      return "Reservada";
    case "activated":
      return "Activada";
    case "suspended":
      return "Suspendida";
    case "lost":
      return "Extraviada";
    case "retired":
      return "Retirada";
    default:
      return status;
  }
}

function getStatusVariant(
  status: TagStatus
): "neutral" | "warm" | "green" | "success" | "info" | "danger" | "muted" {
  switch (status) {
    case "available":
      return "green";
    case "reserved":
      return "info";
    case "activated":
      return "success";
    case "lost":
      return "danger";
    case "suspended":
      return "muted";
    case "retired":
      return "muted";
    default:
      return "neutral";
  }
}

function getPlanVariant(
  plan: SoldPlanType | null | undefined
): "neutral" | "warm" | "green" | "success" | "info" | "danger" | "muted" {
  switch (plan) {
    case "custom":
      return "warm";
    case "partner_batch":
      return "info";
    case "essential":
      return "neutral";
    case "other":
      return "muted";
    default:
      return "neutral";
  }
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (
    let page = Math.max(1, currentPage - 2);
    page <= Math.min(totalPages, currentPage + 2);
    page++
  ) {
    pages.add(page);
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sortedPages.length; index++) {
    const page = sortedPages[index];
    const previous = sortedPages[index - 1];

    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  return items;
}

function normalizeSearchTerm(value: string) {
  return value.trim().toLowerCase();
}

function escapeForIlike(value: string) {
  return value.replace(/[%_,]/g, "");
}

function getMatchingStatuses(search: string) {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return [];

  return STATUS_SEARCH_MAP.filter((item) =>
    item.terms.some(
      (term) => term.includes(normalized) || normalized.includes(term)
    )
  ).map((item) => item.value);
}

function getMatchingPlans(search: string) {
  const normalized = normalizeSearchTerm(search);
  if (!normalized) return [];

  return PLAN_SEARCH_MAP.filter((item) =>
    item.terms.some(
      (term) => term.includes(normalized) || normalized.includes(term)
    )
  ).map((item) => item.value);
}

export default function AdminTagsInventoryPage() {
  const { role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [summary, setSummary] = useState<InventorySummary>(INITIAL_SUMMARY);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [fabricationFilter, setFabricationFilter] =
    useState<FabricationFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [goToPageInput, setGoToPageInput] = useState("1");

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const currentPageIds = useMemo(() => tags.map((tag) => tag.id), [tags]);

  const selectedPageCount = useMemo(
    () => currentPageIds.filter((id) => selectedIds.includes(id)).length,
    [currentPageIds, selectedIds]
  );

  const startItem = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalFiltered);

  const fabricationOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas" },
    { value: "fabricated", label: "Fabricadas" },
    { value: "not_fabricated", label: "No fabricadas" },
  ];

  const statusOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "available", label: "Disponible" },
    { value: "reserved", label: "Reservada" },
    { value: "activated", label: "Activada" },
    { value: "suspended", label: "Suspendida" },
    { value: "lost", label: "Extraviada" },
    { value: "retired", label: "Retirada" },
  ];

  const planOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "essential", label: "Essential" },
    { value: "custom", label: "Custom" },
    { value: "partner_batch", label: "Lote aliado" },
    { value: "other", label: "Otro" },
  ];

  const loadSummary = useCallback(async () => {
    if (role !== "admin") return;

    try {
      const [
        totalRes,
        fabricatedRes,
        notFabricatedRes,
        readyToSellRes,
        activatedRes,
      ] = await Promise.all([
        supabase.from("tags").select("*", { count: "exact", head: true }),
        supabase
          .from("tags")
          .select("*", { count: "exact", head: true })
          .eq("is_fabricated", true),
        supabase
          .from("tags")
          .select("*", { count: "exact", head: true })
          .eq("is_fabricated", false),
        supabase
          .from("tags")
          .select("*", { count: "exact", head: true })
          .eq("status", "available")
          .eq("is_fabricated", true),
        supabase
          .from("tags")
          .select("*", { count: "exact", head: true })
          .eq("status", "activated"),
      ]);

      const firstError =
        totalRes.error ||
        fabricatedRes.error ||
        notFabricatedRes.error ||
        readyToSellRes.error ||
        activatedRes.error;

      if (firstError) throw firstError;

      setSummary({
        totalTags: totalRes.count ?? 0,
        fabricatedCount: fabricatedRes.count ?? 0,
        notFabricatedCount: notFabricatedRes.count ?? 0,
        readyToSellCount: readyToSellRes.count ?? 0,
        activatedCount: activatedRes.count ?? 0,
      });
    } catch (error) {
      console.error("AdminTagsInventoryPage summary error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los indicadores del inventario."
      );
      setSummary(INITIAL_SUMMARY);
    }
  }, [role]);

  const loadTags = useCallback(async () => {
    if (role !== "admin") return;

    setLoading(true);
    setErrorMsg("");

    try {
      let query = supabase
        .from("tags")
        .select(
          `
          id,
          code,
          status,
          sold_plan_type,
          is_fabricated,
          fabricated_at,
          created_at
        `,
          { count: "exact" }
        )
        .order("code", { ascending: true });

      if (fabricationFilter === "fabricated") {
        query = query.eq("is_fabricated", true);
      } else if (fabricationFilter === "not_fabricated") {
        query = query.eq("is_fabricated", false);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (planFilter !== "all") {
        query = query.eq("sold_plan_type", planFilter);
      }

      const normalizedSearch = normalizeSearchTerm(searchTerm);

      if (normalizedSearch) {
        const safeCodeSearch = escapeForIlike(searchTerm.trim().toUpperCase());
        const matchedStatuses = getMatchingStatuses(normalizedSearch);
        const matchedPlans = getMatchingPlans(normalizedSearch);

        const orFilters = [`code.ilike.%${safeCodeSearch}%`];

        matchedStatuses.forEach((status) => {
          orFilters.push(`status.eq.${status}`);
        });

        matchedPlans.forEach((plan) => {
          orFilters.push(`sold_plan_type.eq.${plan}`);
        });

        query = query.or(orFilters.join(","));
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      setTags((data ?? []) as TagRow[]);
      setTotalFiltered(count ?? 0);
    } catch (error) {
      console.error("AdminTagsInventoryPage load error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las placas."
      );
      setTags([]);
      setTotalFiltered(0);
    } finally {
      setLoading(false);
    }
  }, [
    role,
    fabricationFilter,
    statusFilter,
    planFilter,
    searchTerm,
    currentPage,
    pageSize,
  ]);

  const refreshAll = useCallback(async () => {
    setSuccessMsg("");
    await Promise.all([loadSummary(), loadTags()]);
  }, [loadSummary, loadTags]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;
    void loadSummary();
  }, [authLoading, role, loadSummary]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;
    void loadTags();
  }, [authLoading, role, loadTags]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, fabricationFilter, statusFilter, planFilter, pageSize]);

  useEffect(() => {
    setGoToPageInput(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    if (totalFiltered === 0) return;
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalFiltered, totalPages]);

  const clearFilters = () => {
    setSearchTerm("");
    setFabricationFilter("all");
    setStatusFilter("all");
    setPlanFilter("all");
    setCurrentPage(1);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectCurrentPage = () => {
    const allCurrentSelected =
      currentPageIds.length > 0 &&
      currentPageIds.every((id) => selectedIds.includes(id));

    if (allCurrentSelected) {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
  };

  const goToPage = () => {
    const parsed = Number(goToPageInput);

    if (!Number.isFinite(parsed)) {
      setGoToPageInput(String(currentPage));
      return;
    }

    const safePage = Math.min(Math.max(1, Math.floor(parsed)), totalPages);
    setCurrentPage(safePage);
  };

  const updateFabricationState = async (nextValue: boolean) => {
    if (selectedIds.length === 0) {
      setErrorMsg("Selecciona al menos una placa.");
      return;
    }

    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const idChunks = chunkArray(selectedIds, 500);
      const fabricatedAt = nextValue ? new Date().toISOString() : null;

      for (const idsChunk of idChunks) {
        const { error } = await supabase
          .from("tags")
          .update({
            is_fabricated: nextValue,
            fabricated_at: fabricatedAt,
          })
          .in("id", idsChunk);

        if (error) throw error;
      }

      setSelectedIds([]);
      await Promise.all([loadSummary(), loadTags()]);

      setSuccessMsg(
        nextValue
          ? "Placas marcadas como fabricadas."
          : "Placas marcadas como no fabricadas."
      );
    } catch (error) {
      console.error("AdminTagsInventoryPage fabrication update error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado de fabricación."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const markSelectedAsFabricated = async () => {
    await updateFabricationState(true);
  };

  const markSelectedAsNotFabricated = async () => {
    await updateFabricationState(false);
  };

  const fetchSelectedTags = async (ids: string[]) => {
    const idChunks = chunkArray(ids, 500);
    const collected: TagRow[] = [];

    for (const idsChunk of idChunks) {
      const { data, error } = await supabase
        .from("tags")
        .select(`
          id,
          code,
          status,
          sold_plan_type,
          is_fabricated,
          fabricated_at,
          created_at
        `)
        .in("id", idsChunk)
        .order("code", { ascending: true });

      if (error) throw error;

      collected.push(...((data ?? []) as TagRow[]));
    }

    return collected.sort((a, b) => a.code.localeCompare(b.code, "es"));
  };

  const exportCsv = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const rowsToExport =
        selectedIds.length > 0 ? await fetchSelectedTags(selectedIds) : tags;

      if (rowsToExport.length === 0) {
        setErrorMsg("No hay placas para exportar.");
        return;
      }

      const baseUrl = window.location.origin;

      const headers = [
        "Código",
        "Plan",
        "Estado",
        "Fabricada",
        "Fecha fabricación",
        "Fecha de creación",
        "URL pública",
        "QR payload",
        "NFC payload",
      ];

      const rows = rowsToExport.map((tag) => {
        const publicUrl = `${baseUrl}/p/${tag.code}`;

        return [
          tag.code,
          getPlanLabel(tag.sold_plan_type),
          getStatusLabel(tag.status),
          tag.is_fabricated ? "Sí" : "No",
          tag.fabricated_at || "",
          tag.created_at || "",
          publicUrl,
          publicUrl,
          publicUrl,
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
      anchor.download = `mokko-inventario-placas-${datePart}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setSuccessMsg("CSV exportado correctamente.");
    } catch (error) {
      console.error("AdminTagsInventoryPage export error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo exportar el archivo."
      );
    }
  };

  if (!authLoading && role !== "admin") {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-red-400/20 bg-red-400/10 px-6 py-12">
              <div className="text-2xl font-semibold">Acceso restringido</div>
              <p className="mt-3 text-sm leading-7 text-red-200">
                No tienes permisos para acceder a esta página.
              </p>
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

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-7xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Admin · Inventario de placas
              </span>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Inventario de <span className="text-[#E8C547]">placas</span>
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    Controla qué códigos ya están fabricados físicamente y cuáles
                    aún no. Consulta el inventario por páginas, exporta lotes para
                    producción y evita vender códigos que todavía no tienes en
                    stock.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void exportCsv()}
                    disabled={loading || actionLoading}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Exportar CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => void refreshAll()}
                    disabled={loading || actionLoading}
                    className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Actualizando..." : "Recargar inventario"}
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                {successMsg}
              </div>
            )}

            {loading ? (
              <div className="mx-auto mt-8 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                Cargando inventario...
              </div>
            ) : (
              <>
                <div className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-5">
                  <StatCard
                    label="Total códigos"
                    value={summary.totalTags}
                    variant="green"
                  />
                  <StatCard
                    label="Fabricadas"
                    value={summary.fabricatedCount}
                    variant="neutral"
                  />
                  <StatCard
                    label="No fabricadas"
                    value={summary.notFabricatedCount}
                    variant="yellow"
                  />
                  <StatCard
                    label="Listas para vender"
                    value={summary.readyToSellCount}
                    variant="green"
                  />
                  <StatCard
                    label="Activadas"
                    value={summary.activatedCount}
                    variant="neutral"
                  />
                </div>

                <div className="mx-auto mt-8 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
                  <div className="grid gap-4 xl:grid-cols-[1.25fr_0.7fr_0.7fr_0.7fr_0.8fr]">
                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Buscar código, estado o plan
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Ej. 45R478, disponible o custom"
                        className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Fabricación
                      </label>
                      <CustomSelect
                        value={fabricationFilter}
                        onChange={(value) =>
                          setFabricationFilter(value as FabricationFilter)
                        }
                        options={fabricationOptions}
                        placeholder="Todas"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Estado
                      </label>
                      <CustomSelect
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value as StatusFilter)}
                        options={statusOptions}
                        placeholder="Todos"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Plan
                      </label>
                      <CustomSelect
                        value={planFilter}
                        onChange={(value) => setPlanFilter(value as PlanFilter)}
                        options={planOptions}
                        placeholder="Todos"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Tamaño de página
                      </label>
                      <CustomSelect
                        value={String(pageSize)}
                        onChange={(value) => setPageSize(Number(value))}
                        options={PAGE_SIZE_OPTIONS}
                        placeholder="50 por página"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/50">
                      Mostrando {startItem === 0 ? 0 : startItem} a {endItem} de{" "}
                      {totalFiltered} placa{totalFiltered === 1 ? "" : "s"}.
                    </div>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                    >
                      Limpiar filtros
                    </button>
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div className="text-sm text-white/50">
                        Seleccionadas: {selectedIds.length}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={toggleSelectCurrentPage}
                          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                        >
                          {currentPageIds.length > 0 &&
                          selectedPageCount === currentPageIds.length
                            ? "Quitar página"
                            : "Seleccionar página"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void markSelectedAsFabricated()}
                          disabled={actionLoading || selectedIds.length === 0}
                          className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Marcar seleccionadas como fabricadas
                        </button>

                        <button
                          type="button"
                          onClick={() => void markSelectedAsNotFabricated()}
                          disabled={actionLoading || selectedIds.length === 0}
                          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Marcar seleccionadas como no fabricadas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mx-auto mt-8 max-w-7xl overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-sm">
                  {tags.length === 0 ? (
                    <div className="p-8">
                      <div className="text-2xl font-semibold">
                        No se encontraron placas
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/65">
                        Ajusta la búsqueda o los filtros para ver otros
                        resultados.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 bg-[#141410] text-left text-xs uppercase tracking-[0.14em] text-white/45">
                            <th className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={
                                  currentPageIds.length > 0 &&
                                  selectedPageCount === currentPageIds.length
                                }
                                onChange={toggleSelectCurrentPage}
                                className="h-4 w-4 accent-[#E8C547]"
                              />
                            </th>
                            <th className="px-4 py-4">Código</th>
                            <th className="px-4 py-4">Plan</th>
                            <th className="px-4 py-4">Estado</th>
                            <th className="px-4 py-4">Fabricación</th>
                            <th className="px-4 py-4">Fecha fabricación</th>
                          </tr>
                        </thead>

                        <tbody>
                          {tags.map((tag) => (
                            <tr
                              key={tag.id}
                              className="border-b border-white/6 text-sm text-white/82 transition hover:bg-white/[0.03]"
                            >
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(tag.id)}
                                  onChange={() => toggleSelect(tag.id)}
                                  className="h-4 w-4 accent-[#E8C547]"
                                />
                              </td>

                              <td className="px-4 py-4 font-semibold text-[#F5F0E8]">
                                {tag.code}
                              </td>

                              <td className="px-4 py-4">
                                <Badge variant={getPlanVariant(tag.sold_plan_type)}>
                                  {getPlanLabel(tag.sold_plan_type)}
                                </Badge>
                              </td>

                              <td className="px-4 py-4">
                                <Badge variant={getStatusVariant(tag.status)}>
                                  {getStatusLabel(tag.status)}
                                </Badge>
                              </td>

                              <td className="px-4 py-4">
                                <Badge variant={tag.is_fabricated ? "success" : "muted"}>
                                  {tag.is_fabricated
                                    ? "Fabricada"
                                    : "No fabricada"}
                                </Badge>
                              </td>

                              <td className="px-4 py-4 text-white/70">
                                {formatDateTime(tag.fabricated_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="mx-auto mt-6 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="text-sm text-white/55">
                      Página {totalFiltered === 0 ? 0 : currentPage} de{" "}
                      {totalFiltered === 0 ? 0 : totalPages}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage <= 1}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Primera
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage <= 1}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Anterior
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
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
                              key={`page-${item}`}
                              type="button"
                              onClick={() => setCurrentPage(item)}
                              className={`min-w-[44px] rounded-2xl px-4 py-3 text-sm font-medium transition ${
                                item === currentPage
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
                        disabled={currentPage >= totalPages}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Siguiente
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Última
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
                    <div className="text-sm text-white/60">Ir a página</div>

                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, totalPages)}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          goToPage();
                        }
                      }}
                      className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 sm:w-32"
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

                <div className="mx-auto mt-6 max-w-7xl rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-4 text-sm leading-7 text-[#f6df8a]">
                  Consejo operativo: para vender sin errores, prioriza códigos con{" "}
                  <strong className="text-white">estado Disponible</strong> y{" "}
                  <strong className="text-white">Fabricada</strong>.
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

function StatCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "green" | "yellow" | "neutral";
}) {
  const variantClass =
    variant === "green"
      ? "border-[#2D5A27]/60 bg-[#12311c]"
      : variant === "yellow"
      ? "border-[#E8C547]/15 bg-[#E8C547]/8"
      : "border-white/8 bg-white/[0.04]";

  return (
    <div className={`rounded-[28px] border p-6 ${variantClass}`}>
      <div className="text-sm uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-3 text-4xl font-semibold text-[#E8C547]">{value}</div>
    </div>
  );
}
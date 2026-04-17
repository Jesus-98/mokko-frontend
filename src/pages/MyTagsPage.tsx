import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../components/ui/CustomSelect";

type PlanVendido = "essential" | "custom" | "partner_batch" | "other";

type EstadoTag =
  | "available"
  | "reserved"
  | "activated"
  | "suspended"
  | "lost"
  | "retired";

type FiltroEstado =
  | "visible"
  | "all"
  | "activated"
  | "suspended"
  | "lost"
  | "retired";

type FiltroPrincipal = "all" | "primary" | "secondary";

type TagRow = {
  petTagId: string;
  petId: string;
  petName: string;
  petSpecies: string | null;
  petPhotoUrl: string | null;
  petBreedLabel: string;
  isPrimary: boolean;
  assignedAt: string | null;
  relationStatus: string | null;
  soldPlanType: PlanVendido | null;
  tagId: string;
  code: string;
  tagStatus: EstadoTag;
  activatedAt: string | null;
  lostMessage: string | null;
  retiredReason: string | null;
  notes: string | null;
};

type TagFetchRow = {
  id: string;
  code: string;
  status: EstadoTag;
  sold_plan_type: PlanVendido | null;
  activated_at: string | null;
  lost_message: string | null;
  retired_reason: string | null;
  notes: string | null;
};

type PetTagFetchRow = {
  id: string;
  is_primary: boolean;
  status: string | null;
  assigned_at: string | null;
  sold_plan_type: PlanVendido | null;
  tag: TagFetchRow | TagFetchRow[] | null;
};

type PetFetchRow = {
  id: string;
  name: string;
  species: string | null;
  photo_url: string | null;
  breed_custom: string | null;
  breed:
    | {
        name: string | null;
        name_es: string | null;
      }
    | {
        name: string | null;
        name_es: string | null;
      }[]
    | null;
  pet_tags: PetTagFetchRow[] | null;
};

type PendingAction =
  | {
      petTagId: string;
      mode: "lost";
      title: string;
      confirmLabel: string;
      placeholder: string;
    }
  | {
      petTagId: string;
      mode: "retired";
      title: string;
      confirmLabel: string;
      placeholder: string;
    }
  | null;

type RpcResponse = {
  success?: boolean;
  message?: string;
  status?: EstadoTag;
};

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDateTime(value?: string | null) {
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

function getSpeciesLabel(species?: string | null) {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  if (species === "other") return "Otro";
  return "Mascota";
}

function getPlanLabel(plan?: PlanVendido | null) {
  if (plan === "essential") return "Essential";
  if (plan === "custom") return "Custom";
  if (plan === "partner_batch") return "Lote aliado";
  if (plan === "other") return "Otro";
  return "Sin plan";
}

function getTagStatusLabel(status?: EstadoTag | null) {
  switch (status) {
    case "available":
      return "Disponible";
    case "reserved":
      return "Reservada";
    case "activated":
      return "Activa";
    case "suspended":
      return "Suspendida";
    case "lost":
      return "Extraviada";
    case "retired":
      return "Retirada";
    default:
      return "No disponible";
  }
}

function getTagStatusClass(status?: EstadoTag | null) {
  switch (status) {
    case "activated":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "suspended":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "lost":
      return "border-orange-400/20 bg-orange-400/10 text-orange-200";
    case "retired":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function getPrimaryLabelClass(isPrimary: boolean) {
  return isPrimary
    ? "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]"
    : "border-white/10 bg-white/5 text-white/65";
}

function getPetBreedLabel(pet: PetFetchRow) {
  const breed = getSingleRelation(pet.breed);

  return (
    pet.breed_custom?.trim() ||
    breed?.name_es?.trim() ||
    breed?.name?.trim() ||
    "Sin raza"
  );
}

export default function MyTagsPage() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const [tags, setTags] = useState<TagRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [petFilter, setPetFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<FiltroEstado>("visible");
  const [primaryFilter, setPrimaryFilter] = useState<FiltroPrincipal>("all");

  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionNote, setActionNote] = useState("");

  const loadTags = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    setWarningMsg("");

    try {
      const { data, error } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          photo_url,
          breed_custom,
          breed:pet_breeds!pets_breed_id_fkey (
            name,
            name_es
          ),
          pet_tags:pet_tags!pet_tags_pet_id_fkey (
            id,
            is_primary,
            status,
            assigned_at,
            sold_plan_type,
            tag:tags!pet_tags_tag_id_fkey (
              id,
              code,
              status,
              sold_plan_type,
              activated_at,
              lost_message,
              retired_reason,
              notes
            )
          )
        `)
        .eq("owner_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const pets = (data ?? []) as PetFetchRow[];

      const rows: TagRow[] = pets.flatMap((pet) => {
        const petTags = pet.pet_tags ?? [];

        return petTags
          .filter((petTag) => petTag.status === "active")
          .map((petTag) => {
            const tag = getSingleRelation(petTag.tag);

            if (!tag) return null;

            return {
              petTagId: petTag.id,
              petId: pet.id,
              petName: pet.name,
              petSpecies: pet.species,
              petPhotoUrl: pet.photo_url,
              petBreedLabel: getPetBreedLabel(pet),
              isPrimary: !!petTag.is_primary,
              assignedAt: petTag.assigned_at,
              relationStatus: petTag.status,
              soldPlanType: petTag.sold_plan_type || tag.sold_plan_type || null,
              tagId: tag.id,
              code: tag.code,
              tagStatus: tag.status,
              activatedAt: tag.activated_at,
              lostMessage: tag.lost_message,
              retiredReason: tag.retired_reason,
              notes: tag.notes,
            } satisfies TagRow;
          })
          .filter((row): row is TagRow => !!row);
      });

      setTags(rows);
    } catch (error) {
      console.error("MyTagsPage load error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus placas."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }
    void loadTags();
  }, [authLoading, user?.id, loadTags]);

  const totalTags = tags.length;
  const activeTagsCount = useMemo(
    () => tags.filter((tag) => tag.tagStatus === "activated").length,
    [tags]
  );
  const suspendedTagsCount = useMemo(
    () => tags.filter((tag) => tag.tagStatus === "suspended").length,
    [tags]
  );
  const lostTagsCount = useMemo(
    () => tags.filter((tag) => tag.tagStatus === "lost").length,
    [tags]
  );
  const retiredTagsCount = useMemo(
    () => tags.filter((tag) => tag.tagStatus === "retired").length,
    [tags]
  );

  const petOptions = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    tags.forEach((tag) => {
      map.set(tag.petId, tag.petName);
    });

    return [
      { value: "all", label: "Todas" },
      ...Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], "es"))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [tags]);

  const statusOptions: CustomSelectOption[] = [
    { value: "visible", label: "Visibles" },
    { value: "activated", label: "Activas" },
    { value: "suspended", label: "Suspendidas" },
    { value: "lost", label: "Extraviadas" },
    { value: "retired", label: "Retiradas" },
    { value: "all", label: "Todas" },
  ];

  const primaryOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas" },
    { value: "primary", label: "Principales" },
    { value: "secondary", label: "Secundarias" },
  ];

  const filteredTags = useMemo(() => {
    const term = normalizeText(searchTerm);

    return tags.filter((tag) => {
      const matchesPet = petFilter === "all" ? true : tag.petId === petFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "visible"
          ? tag.tagStatus !== "retired"
          : tag.tagStatus === statusFilter;

      const matchesPrimary =
        primaryFilter === "all"
          ? true
          : primaryFilter === "primary"
          ? tag.isPrimary
          : !tag.isPrimary;

      const haystack = normalizeText(
        [
          tag.code,
          tag.petName,
          tag.petBreedLabel,
          getSpeciesLabel(tag.petSpecies),
          getPlanLabel(tag.soldPlanType),
          getTagStatusLabel(tag.tagStatus),
          tag.lostMessage || "",
          tag.retiredReason || "",
          tag.notes || "",
        ].join(" ")
      );

      const matchesSearch = term ? haystack.includes(term) : true;

      return matchesPet && matchesStatus && matchesPrimary && matchesSearch;
    });
  }, [tags, searchTerm, petFilter, statusFilter, primaryFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setPetFilter("all");
    setStatusFilter("visible");
    setPrimaryFilter("all");
  };

  const runTagStatusUpdate = async (
    petTagId: string,
    newStatus: EstadoTag,
    lostMessage?: string | null,
    retiredReason?: string | null
  ) => {
    setActionLoadingId(petTagId);
    setErrorMsg("");
    setSuccessMsg("");
    setWarningMsg("");

    try {
      const { data, error } = await supabase.rpc("update_my_tag_status", {
        p_pet_tag_id: petTagId,
        p_new_status: newStatus,
        p_lost_message: lostMessage ?? null,
        p_retired_reason: retiredReason ?? null,
      });

      if (error) throw new Error(error.message);

      const response = data as RpcResponse | null;

      if (response?.success === false) {
        throw new Error(response.message || "No se pudo actualizar la placa.");
      }

      setPendingAction(null);
      setActionNote("");
      setSuccessMsg(
        response?.message || "Estado de la placa actualizado correctamente."
      );
      await loadTags();
    } catch (error) {
      console.error("runTagStatusUpdate error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la placa."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetPrimary = async (petTagId: string) => {
    setActionLoadingId(petTagId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.rpc("set_my_primary_pet_tag", {
        p_pet_tag_id: petTagId,
      });

      if (error) throw new Error(error.message);

      const response = data as RpcResponse | null;

      if (response?.success === false) {
        throw new Error(response.message || "No se pudo marcar como principal.");
      }

      setSuccessMsg(
        response?.message || "Placa principal actualizada correctamente."
      );
      await loadTags();
    } catch (error) {
      console.error("handleSetPrimary error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo marcar la placa como principal."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const openLostAction = (petTagId: string) => {
    setPendingAction({
      petTagId,
      mode: "lost",
      title: "Marcar como extraviada",
      confirmLabel: "Guardar estado",
      placeholder:
        "Opcional: escribe un mensaje que quieras mostrar si alguien encuentra esta placa.",
    });
    setActionNote("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const openRetiredAction = (petTagId: string) => {
    setPendingAction({
      petTagId,
      mode: "retired",
      title: "Retirar placa",
      confirmLabel: "Retirar placa",
      placeholder:
        "Opcional: escribe el motivo del retiro permanente de esta placa.",
    });
    setActionNote("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  if (!authLoading && !user) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12">
              <div className="text-2xl font-semibold">Inicia sesión para ver tus placas</div>
              <p className="mt-3 text-sm leading-7 text-white/70">
                Necesitas una cuenta Mokko para gestionar tus placas activas,
                principales, suspendidas o extraviadas.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/login?next=/mis-placas"
                  className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14]"
                >
                  Iniciar sesión
                </Link>

                <Link
                  to="/register?next=/mis-placas"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.16),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-7xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Mi cuenta · Mis placas
              </span>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Gestiona tus <span className="text-[#E8C547]">placas</span>
                  </h1>

                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    Revisa tus placas activas, define cuál es la principal y
                    gestiona estados como suspendida, extraviada o retirada.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void loadTags()}
                  disabled={loading}
                  className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Actualizando..." : "Recargar placas"}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            {warningMsg && !errorMsg && (
              <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                {warningMsg}
              </div>
            )}

            {successMsg && (
              <div className="mx-auto mt-8 max-w-7xl rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                {successMsg}
              </div>
            )}

            {loading ? (
              <div className="mx-auto mt-8 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                Cargando placas...
              </div>
            ) : (
              <>
                <div className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-5">
                  <StatCard label="Total placas" value={totalTags} variant="neutral" />
                  <StatCard label="Activas" value={activeTagsCount} variant="green" />
                  <StatCard
                    label="Suspendidas"
                    value={suspendedTagsCount}
                    variant="yellow"
                  />
                  <StatCard
                    label="Extraviadas"
                    value={lostTagsCount}
                    variant="yellow"
                  />
                  <StatCard
                    label="Retiradas"
                    value={retiredTagsCount}
                    variant="neutral"
                  />
                </div>

                <div className="mx-auto mt-8 max-w-7xl rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
                  <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Buscar placa
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Código, mascota, raza, tipo o estado"
                        className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Mascota
                      </label>
                      <CustomSelect
                        value={petFilter}
                        onChange={(value) => setPetFilter(value)}
                        options={petOptions}
                        placeholder="Todas"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Estado
                      </label>
                      <CustomSelect
                        value={statusFilter}
                        onChange={(value) => setStatusFilter(value as FiltroEstado)}
                        options={statusOptions}
                        placeholder="Visibles"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Principal
                      </label>
                      <CustomSelect
                        value={primaryFilter}
                        onChange={(value) => setPrimaryFilter(value as FiltroPrincipal)}
                        options={primaryOptions}
                        placeholder="Todas"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-white/50">
                      Mostrando {filteredTags.length} placa
                      {filteredTags.length === 1 ? "" : "s"}.
                    </div>

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div className="mx-auto mt-8 grid max-w-7xl gap-5">
                  {filteredTags.length === 0 ? (
                    <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                      <div className="text-2xl font-semibold">
                        No se encontraron placas
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/65">
                        Ajusta la búsqueda o los filtros para ver otros resultados.
                      </p>
                    </div>
                  ) : (
                    filteredTags.map((tag) => {
                      const isBusy = actionLoadingId === tag.petTagId;
                      const canReactivate =
                        tag.tagStatus === "suspended" || tag.tagStatus === "lost";
                      const canSuspend = tag.tagStatus === "activated";
                      const canMarkLost =
                        tag.tagStatus === "activated" ||
                        tag.tagStatus === "suspended";
                      const canRetire =
                        tag.tagStatus !== "retired";
                      const showInlineAction = pendingAction?.petTagId === tag.petTagId;

                      return (
                        <div
                          key={tag.petTagId}
                          className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm"
                        >
                          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-[#141410]">
                                  {tag.petPhotoUrl ? (
                                    <img
                                      src={tag.petPhotoUrl}
                                      alt={tag.petName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[11px] text-white/40">
                                      Sin foto
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <h2 className="text-2xl font-semibold">{tag.code}</h2>
                                  <div className="mt-1 text-sm text-white/60">
                                    {tag.petName} · {getSpeciesLabel(tag.petSpecies)} ·{" "}
                                    {tag.petBreedLabel}
                                  </div>
                                </div>

                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getPrimaryLabelClass(
                                    tag.isPrimary
                                  )}`}
                                >
                                  {tag.isPrimary ? "Principal" : "Secundaria"}
                                </span>

                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                                  {getPlanLabel(tag.soldPlanType)}
                                </span>

                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getTagStatusClass(
                                    tag.tagStatus
                                  )}`}
                                >
                                  {getTagStatusLabel(tag.tagStatus)}
                                </span>
                              </div>

                              <div className="mt-4 grid gap-3 text-sm text-white/60 md:grid-cols-2">
                                <div>
                                  <span className="text-white/40">Mascota:</span>{" "}
                                  {tag.petName}
                                </div>
                                <div>
                                  <span className="text-white/40">Tipo:</span>{" "}
                                  {getPlanLabel(tag.soldPlanType)}
                                </div>
                                <div>
                                  <span className="text-white/40">Activación:</span>{" "}
                                  {formatDateTime(tag.activatedAt || tag.assignedAt)}
                                </div>
                                <div>
                                  <span className="text-white/40">Principal:</span>{" "}
                                  {tag.isPrimary ? "Sí" : "No"}
                                </div>
                              </div>

                              {tag.lostMessage && tag.tagStatus === "lost" && (
                                <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm text-orange-100">
                                  <span className="text-orange-200/75">Mensaje de extravío:</span>{" "}
                                  {tag.lostMessage}
                                </div>
                              )}

                              {tag.retiredReason && tag.tagStatus === "retired" && (
                                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
                                  <span className="text-red-200/75">Motivo de retiro:</span>{" "}
                                  {tag.retiredReason}
                                </div>
                              )}

                              {showInlineAction && (
                                <div className="mt-4 rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                  <div className="text-base font-semibold text-[#F5F0E8]">
                                    {pendingAction.title}
                                  </div>

                                  <p className="mt-2 text-sm leading-7 text-white/60">
                                    {pendingAction.mode === "lost"
                                      ? "La placa dejará de mostrar sus datos normales hasta que la reactives."
                                      : "La placa quedará inutilizable permanentemente y ya no podrá volver a activarse."}
                                  </p>

                                  <div className="mt-4">
                                    <label className="mb-2 block text-sm text-white/80">
                                      {pendingAction.mode === "lost"
                                        ? "Mensaje opcional"
                                        : "Motivo opcional"}
                                    </label>
                                    <textarea
                                      value={actionNote}
                                      onChange={(e) => setActionNote(e.target.value)}
                                      placeholder={pendingAction.placeholder}
                                      rows={4}
                                      className="w-full rounded-2xl border border-white/8 bg-[#0F0F0C] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50"
                                    />
                                  </div>

                                  <div className="mt-4 flex flex-wrap gap-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setPendingAction(null);
                                        setActionNote("");
                                      }}
                                      className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Cancelar
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        if (!pendingAction) return;

                                        if (pendingAction.mode === "lost") {
                                          void runTagStatusUpdate(
                                            tag.petTagId,
                                            "lost",
                                            actionNote.trim() || null,
                                            null
                                          );
                                        }

                                        if (pendingAction.mode === "retired") {
                                          void runTagStatusUpdate(
                                            tag.petTagId,
                                            "retired",
                                            null,
                                            actionNote.trim() || null
                                          );
                                        }
                                      }}
                                      className="rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {isBusy
                                        ? "Guardando..."
                                        : pendingAction.confirmLabel}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Acciones
                                </div>

                                <div className="mt-4 grid gap-3">
                                  {!tag.isPrimary && tag.tagStatus === "activated" && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleSetPrimary(tag.petTagId)}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#F5F0E8] transition hover:bg-[#E8C547]/15 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      {isBusy ? "Actualizando..." : "Marcar como principal"}
                                    </button>
                                  )}

                                  {canSuspend && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const ok = window.confirm(
                                          "¿Seguro que quieres suspender esta placa?"
                                        );
                                        if (!ok) return;
                                        void runTagStatusUpdate(
                                          tag.petTagId,
                                          "suspended",
                                          null,
                                          null
                                        );
                                      }}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Suspender
                                    </button>
                                  )}

                                  {canReactivate && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => {
                                        const ok = window.confirm(
                                          "¿Seguro que quieres reactivar esta placa?"
                                        );
                                        if (!ok) return;
                                        void runTagStatusUpdate(
                                          tag.petTagId,
                                          "activated",
                                          null,
                                          null
                                        );
                                      }}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Reactivar
                                    </button>
                                  )}

                                  {canMarkLost && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => openLostAction(tag.petTagId)}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/10 px-4 py-3 text-sm font-medium text-orange-100 transition hover:bg-orange-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Marcar como extraviada
                                    </button>
                                  )}

                                  {canRetire && (
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => openRetiredAction(tag.petTagId)}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                      Retirar placa
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void navigator.clipboard.writeText(tag.code)
                                    }
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    Copiar código
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
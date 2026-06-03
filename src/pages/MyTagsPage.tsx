import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  PawPrint,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Tags,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../components/ui/CustomSelect";
import { FieldLabel, TextArea, TextInput } from "../components/ui/Field";

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

function getPrimaryLabelClass() {
  return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
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

  const activatedTagsByPetCount = useMemo(() => {
    const map = new Map<string, number>();

    tags.forEach((tag) => {
      if (tag.tagStatus !== "activated") return;

      map.set(tag.petId, (map.get(tag.petId) ?? 0) + 1);
    });

    return map;
  }, [tags]);

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

      return matchesPet && matchesStatus && matchesSearch;
    });
  }, [tags, searchTerm, petFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm("");
    setPetFilter("all");
    setStatusFilter("visible");
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

  const copyTagCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setSuccessMsg("Código copiado al portapapeles.");
      setErrorMsg("");
    } catch {
      setErrorMsg("No se pudo copiar el código.");
      setSuccessMsg("");
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
              <div className="text-2xl font-semibold">
                Inicia sesión para ver tus placas
              </div>

              <p className="mt-3 text-sm leading-7 text-white/70">
                Necesitas una cuenta Mokko para gestionar tus placas activas,
                suspendidas, extraviadas o retiradas.
              </p>

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  to="/login?next=/mis-placas"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                >
                  Iniciar sesión
                </Link>

                <Link
                  to="/register?next=/mis-placas"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.16),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Mis placas
                    </span>

                    <div className="space-y-4">
                      <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                        Gestiona tus{" "}
                        <span className="text-[#E8C547]">placas</span>
                      </h1>

                      <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Revisa tus placas activas, cambia estados cuando sea
                        necesario y accede rápido a la mascota vinculada.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadTags()}
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {loading ? "Actualizando..." : "Recargar placas"}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {errorMsg}
                </div>
              )}

              {warningMsg && !errorMsg && (
                <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm leading-6 text-[#f6df8a]">
                  {warningMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm leading-6 text-green-200">
                  {successMsg}
                </div>
              )}

              {loading ? (
                <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/65 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                  Cargando placas...
                </div>
              ) : (
                <>
                  <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                    <MetricCard
                      icon={Tags}
                      label="Total"
                      value={totalTags}
                      description="Placas."
                    />

                    <MetricCard
                      icon={CheckCircle2}
                      label="Activas"
                      value={activeTagsCount}
                      description="En uso."
                      highlight
                    />

                    <MetricCard
                      icon={ShieldCheck}
                      label="Suspendidas"
                      value={suspendedTagsCount}
                      description="Pausadas."
                      highlight={suspendedTagsCount > 0}
                    />

                    <MetricCard
                      icon={AlertTriangle}
                      label="Extraviadas"
                      value={lostTagsCount}
                      description="Reportadas."
                      highlight={lostTagsCount > 0}
                    />

                    <MetricCard
                      icon={Archive}
                      label="Retiradas"
                      value={retiredTagsCount}
                      description="No activas."
                    />
                  </section>

                  <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Filtros</h2>
                        <p className="mt-2 text-sm leading-7 text-white/60">
                          Encuentra una placa por código, mascota, estado o
                          plan.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
                      >
                        Limpiar filtros
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.85fr_0.85fr]">
                      <div>
                        <FieldLabel>Buscar placa</FieldLabel>
                        <div className="relative">
                          <TextInput
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Código, mascota, raza, tipo o estado"
                            className="pl-11"
                          />
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Mascota</FieldLabel>
                        <CustomSelect
                          value={petFilter}
                          onChange={(value) => setPetFilter(value)}
                          options={petOptions}
                          placeholder="Todas"
                        />
                      </div>

                      <div>
                        <FieldLabel>Estado</FieldLabel>
                        <CustomSelect
                          value={statusFilter}
                          onChange={(value) =>
                            setStatusFilter(value as FiltroEstado)
                          }
                          options={statusOptions}
                          placeholder="Visibles"
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white/60">
                      Mostrando{" "}
                      <span className="font-semibold text-white">
                        {filteredTags.length}
                      </span>{" "}
                      placa{filteredTags.length === 1 ? "" : "s"}.
                    </div>
                  </section>

                  <section className="mt-7 grid gap-5">
                    {filteredTags.length === 0 ? (
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                        <div className="text-2xl font-semibold">
                          No se encontraron placas
                        </div>

                        <p className="mt-3 text-sm leading-7 text-white/65">
                          Ajusta la búsqueda o los filtros para ver otros
                          resultados.
                        </p>
                      </div>
                    ) : (
                      filteredTags.map((tag) => {
                        const isBusy = actionLoadingId === tag.petTagId;

                        const canReactivate =
                          tag.tagStatus === "suspended" ||
                          tag.tagStatus === "lost";

                        const canSuspend = tag.tagStatus === "activated";

                        const canMarkLost =
                          tag.tagStatus === "activated" ||
                          tag.tagStatus === "suspended";

                        const canRetire = tag.tagStatus !== "retired";

                        const activeTagsForPet =
                          activatedTagsByPetCount.get(tag.petId) ?? 0;

                        const hasMultipleActiveTagsForPet =
                          activeTagsForPet > 1;

                        const showPrimaryBadge =
                          hasMultipleActiveTagsForPet &&
                          tag.tagStatus === "activated" &&
                          tag.isPrimary;

                        const canSetPrimary =
                          hasMultipleActiveTagsForPet &&
                          !tag.isPrimary &&
                          tag.tagStatus === "activated";

                        const showInlineAction =
                          pendingAction?.petTagId === tag.petTagId;

                        return (
                          <article
                            key={tag.petTagId}
                            className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm transition hover:border-[#E8C547]/20 hover:bg-white/[0.055] md:rounded-[32px] md:p-6"
                          >
                            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                              <div className="min-w-0">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141410]">
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

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h2 className="break-all text-2xl font-semibold tracking-[0.08em] text-[#F5F0E8]">
                                        {tag.code}
                                      </h2>

                                      <StatusPill
                                        className={getTagStatusClass(
                                          tag.tagStatus
                                        )}
                                      >
                                        {getTagStatusLabel(tag.tagStatus)}
                                      </StatusPill>
                                    </div>

                                    <div className="mt-2 text-sm leading-6 text-white/60">
                                      {tag.petName} ·{" "}
                                      {getSpeciesLabel(tag.petSpecies)} ·{" "}
                                      {tag.petBreedLabel}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                        {getPlanLabel(tag.soldPlanType)}
                                      </StatusPill>

                                      {showPrimaryBadge && (
                                        <StatusPill
                                          className={getPrimaryLabelClass()}
                                        >
                                          Placa principal
                                        </StatusPill>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                  <InfoItem
                                    label="Mascota"
                                    value={tag.petName}
                                  />
                                  <InfoItem
                                    label="Tipo"
                                    value={getPlanLabel(tag.soldPlanType)}
                                  />
                                  <InfoItem
                                    label="Activación"
                                    value={formatDateTime(
                                      tag.activatedAt || tag.assignedAt
                                    )}
                                  />
                                  <InfoItem
                                    label="Estado"
                                    value={getTagStatusLabel(tag.tagStatus)}
                                  />
                                </div>

                                {tag.lostMessage &&
                                  tag.tagStatus === "lost" && (
                                    <div className="mt-4 rounded-2xl border border-orange-400/20 bg-orange-400/10 p-4 text-sm leading-7 text-orange-100">
                                      <span className="text-orange-200/75">
                                        Mensaje de extravío:
                                      </span>{" "}
                                      {tag.lostMessage}
                                    </div>
                                  )}

                                {tag.retiredReason &&
                                  tag.tagStatus === "retired" && (
                                    <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-7 text-red-100">
                                      <span className="text-red-200/75">
                                        Motivo de retiro:
                                      </span>{" "}
                                      {tag.retiredReason}
                                    </div>
                                  )}

                                {showInlineAction && pendingAction && (
                                  <div className="mt-5 rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                    <div className="text-base font-semibold text-[#F5F0E8]">
                                      {pendingAction.title}
                                    </div>

                                    <p className="mt-2 text-sm leading-7 text-white/60">
                                      {pendingAction.mode === "lost"
                                        ? "La placa pasará a estado extraviado hasta que la reactives."
                                        : "La placa quedará retirada permanentemente y no podrá volver a activarse."}
                                    </p>

                                    <div className="mt-4">
                                      <FieldLabel>
                                        {pendingAction.mode === "lost"
                                          ? "Mensaje opcional"
                                          : "Motivo opcional"}
                                      </FieldLabel>

                                      <TextArea
                                        value={actionNote}
                                        onChange={(e) =>
                                          setActionNote(e.target.value)
                                        }
                                        placeholder={pendingAction.placeholder}
                                        rows={4}
                                      />
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPendingAction(null);
                                          setActionNote("");
                                        }}
                                        className="w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
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
                                        className="w-full rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5"
                                      >
                                        {isBusy
                                          ? "Guardando..."
                                          : pendingAction.confirmLabel}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Acciones
                                </div>

                                <div className="mt-4 grid gap-3">
                                  {canSetPrimary && (
                                    <ActionButton
                                      disabled={isBusy}
                                      variant="yellow"
                                      icon={Star}
                                      onClick={() =>
                                        void handleSetPrimary(tag.petTagId)
                                      }
                                    >
                                      {isBusy
                                        ? "Actualizando..."
                                        : "Marcar como principal"}
                                    </ActionButton>
                                  )}

                                  {canSuspend && (
                                    <ActionButton
                                      disabled={isBusy}
                                      variant="neutral"
                                      icon={ShieldCheck}
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
                                    >
                                      Suspender
                                    </ActionButton>
                                  )}

                                  {canReactivate && (
                                    <ActionButton
                                      disabled={isBusy}
                                      variant="green"
                                      icon={RotateCcw}
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
                                    >
                                      Reactivar
                                    </ActionButton>
                                  )}

                                  {canMarkLost && (
                                    <ActionButton
                                      disabled={isBusy}
                                      variant="orange"
                                      icon={AlertTriangle}
                                      onClick={() =>
                                        openLostAction(tag.petTagId)
                                      }
                                    >
                                      Marcar como extraviada
                                    </ActionButton>
                                  )}

                                  {canRetire && (
                                    <ActionButton
                                      disabled={isBusy}
                                      variant="red"
                                      icon={Archive}
                                      onClick={() =>
                                        openRetiredAction(tag.petTagId)
                                      }
                                    >
                                      Retirar placa
                                    </ActionButton>
                                  )}

                                  <ActionButton
                                    variant="neutral"
                                    icon={Copy}
                                    onClick={() => void copyTagCode(tag.code)}
                                  >
                                    Copiar código
                                  </ActionButton>

                                  <Link
                                    to={`/mis-mascotas/${tag.petId}`}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    <PawPrint className="h-4 w-4" />
                                    Ver mascota
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>
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

      <div className="mt-4 text-3xl font-semibold text-[#F5F0E8]">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white">
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

function ActionButton({
  children,
  icon: Icon,
  variant,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  variant: "yellow" | "green" | "orange" | "red" | "neutral";
  disabled?: boolean;
  onClick: () => void;
}) {
  const variantClass =
    variant === "yellow"
      ? "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#F5F0E8] hover:bg-[#E8C547]/15"
      : variant === "green"
        ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-100 hover:bg-[#2D5A27]/20"
        : variant === "orange"
          ? "border-orange-400/20 bg-orange-400/10 text-orange-100 hover:bg-orange-400/15"
          : variant === "red"
            ? "border-red-400/20 bg-red-400/10 text-red-100 hover:bg-red-400/15"
            : "border-white/10 text-white/85 hover:bg-white/5";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-70 ${variantClass}`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
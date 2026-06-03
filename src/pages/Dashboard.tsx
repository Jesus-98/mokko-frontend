import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HeartPulse,
  MapPinned,
  PawPrint,
  Plus,
  Shield,
  Tags,
  UserRound,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type MaybeRelation<T> = T | T[] | null | undefined;

type VisibilityStatus = "public" | "private" | "lost_mode";

type PetBreedRow = {
  name: string | null;
  name_es?: string | null;
};

type PetRow = {
  id: string;
  name: string;
  species: string | null;
  breed_id: string | null;
  breed_custom?: string | null;
  photo_url?: string | null;
  breed?: MaybeRelation<PetBreedRow>;
};

type PetProfileRow = {
  pet_id: string;
  visibility_status: VisibilityStatus | null;
  medical_profile_enabled: boolean | null;
};

type PetTagRow = {
  pet_id: string;
  status: string;
};

type FoundReportRow = {
  id: string;
  pet_id: string | null;
  status: string;
  created_at: string;
};

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

type OrderRow = {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number | null;
  created_at: string;
};

type PetWithStats = PetRow & {
  activeTags: number;
  petReports: number;
  visibilityStatus: VisibilityStatus;
  medicalProfileEnabled: boolean;
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  path: string;
  tone: "warning" | "danger" | "success";
  icon: ComponentType<{ className?: string }>;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
  path: string;
  tone: "report" | "order";
};

function firstRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getSpeciesLabel(species: string | null) {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  if (species === "other") return "Mascota";
  return "Mascota";
}

function getBreedLabel(pet: PetRow) {
  const breed = firstRelation(pet.breed);

  if (pet.breed_custom?.trim()) return pet.breed_custom.trim();
  if (breed?.name_es?.trim()) return breed.name_es.trim();
  if (breed?.name?.trim()) return breed.name.trim();

  return null;
}

function isPendingReport(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "new" || normalized === "viewed";
}

function isActiveOrder(status: OrderStatus) {
  return !["delivered", "cancelled"].includes(status);
}

function getOrderStatusLabel(status: OrderStatus) {
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

function getVisibilityLabel(visibility: VisibilityStatus) {
  if (visibility === "public") return "Perfil público";
  if (visibility === "private") return "Perfil privado";
  return "Modo perdido";
}

function getVisibilityClass(visibility: VisibilityStatus) {
  if (visibility === "lost_mode") {
    return "border-orange-400/20 bg-orange-400/10 text-orange-200";
  }

  if (visibility === "private") {
    return "border-white/10 bg-white/5 text-white/65";
  }

  return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "Sin fecha";

  try {
    return new Date(value).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const [pets, setPets] = useState<PetRow[]>([]);
  const [petProfiles, setPetProfiles] = useState<PetProfileRow[]>([]);
  const [petTags, setPetTags] = useState<PetTagRow[]>([]);
  const [reports, setReports] = useState<FoundReportRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");
    setWarningMsg("");

    try {
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          breed_id,
          breed_custom,
          photo_url,
          breed:pet_breeds!pets_breed_id_fkey (
            name,
            name_es
          )
        `)
        .eq("owner_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (petsError) {
        throw new Error(`No se pudieron cargar tus mascotas: ${petsError.message}`);
      }

      const normalizedPets = (petsData ?? []) as PetRow[];
      const petIds = normalizedPets.map((pet) => pet.id);

      setPets(normalizedPets);

      const warnings: string[] = [];

      const ordersPromise = supabase
        .from("orders")
        .select("id, order_number, status, total, created_at")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (petIds.length === 0) {
        const ordersRes = await ordersPromise;

        setPetProfiles([]);
        setPetTags([]);
        setReports([]);

        if (ordersRes.error) {
          console.error("Error cargando pedidos en dashboard:", ordersRes.error);
          setOrders([]);
          warnings.push("No se pudieron cargar tus pedidos recientes.");
        } else {
          setOrders((ordersRes.data ?? []) as OrderRow[]);
        }

        setWarningMsg(warnings.join(" "));
        return;
      }

      const [profilesRes, petTagsRes, reportsRes, ordersRes] = await Promise.all([
        supabase
          .from("pet_profiles")
          .select("pet_id, visibility_status, medical_profile_enabled")
          .in("pet_id", petIds),

        supabase
          .from("pet_tags")
          .select("pet_id, status")
          .in("pet_id", petIds),

        supabase
          .from("found_reports")
          .select("id, pet_id, status, created_at")
          .in("pet_id", petIds)
          .order("created_at", { ascending: false }),

        ordersPromise,
      ]);

      if (profilesRes.error) {
        console.error("Error cargando perfiles en dashboard:", profilesRes.error);
        setPetProfiles([]);
        warnings.push(
          "No se pudo cargar la configuración pública de algunas mascotas."
        );
      } else {
        setPetProfiles((profilesRes.data ?? []) as PetProfileRow[]);
      }

      if (petTagsRes.error) {
        console.error(
          "Error cargando placas activas en dashboard:",
          petTagsRes.error.message
        );
        setPetTags([]);
        warnings.push(
          "No se pudieron cargar todas las placas activas. Se muestran datos parciales."
        );
      } else {
        setPetTags((petTagsRes.data ?? []) as PetTagRow[]);
      }

      if (reportsRes.error) {
        console.error(
          "Error cargando reportes en dashboard:",
          reportsRes.error.message
        );
        setReports([]);
        warnings.push(
          "No se pudieron cargar todos los reportes. Se muestran datos parciales."
        );
      } else {
        setReports((reportsRes.data ?? []) as FoundReportRow[]);
      }

      if (ordersRes.error) {
        console.error("Error cargando pedidos en dashboard:", ordersRes.error);
        setOrders([]);
        warnings.push("No se pudieron cargar tus pedidos recientes.");
      } else {
        setOrders((ordersRes.data ?? []) as OrderRow[]);
      }

      setWarningMsg(warnings.join(" "));
    } catch (error) {
      console.error("Error cargando dashboard:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Ocurrió un error cargando el dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setPets([]);
      setPetProfiles([]);
      setPetTags([]);
      setReports([]);
      setOrders([]);
      setErrorMsg("");
      setWarningMsg("");
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [authLoading, user?.id, loadDashboard]);

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    profile?.email?.split("@")[0] ||
    "Usuario";

  const displayEmail = user?.email || profile?.email || "Sin correo";

  const profileByPet = useMemo(() => {
    const map = new Map<string, PetProfileRow>();

    for (const petProfile of petProfiles) {
      map.set(petProfile.pet_id, petProfile);
    }

    return map;
  }, [petProfiles]);

  const tagsByPet = useMemo(() => {
    const map = new Map<string, number>();

    for (const tag of petTags) {
      if (tag.status === "active") {
        map.set(tag.pet_id, (map.get(tag.pet_id) || 0) + 1);
      }
    }

    return map;
  }, [petTags]);

  const pendingReports = useMemo(() => {
    return reports.filter((report) => isPendingReport(report.status));
  }, [reports]);

  const reportsByPet = useMemo(() => {
    const map = new Map<string, number>();

    for (const report of pendingReports) {
      if (report.pet_id) {
        map.set(report.pet_id, (map.get(report.pet_id) || 0) + 1);
      }
    }

    return map;
  }, [pendingReports]);

  const petsWithStats = useMemo<PetWithStats[]>(() => {
    return pets.map((pet) => {
      const publicProfile = profileByPet.get(pet.id);

      return {
        ...pet,
        activeTags: tagsByPet.get(pet.id) || 0,
        petReports: reportsByPet.get(pet.id) || 0,
        visibilityStatus: publicProfile?.visibility_status ?? "public",
        medicalProfileEnabled: !!publicProfile?.medical_profile_enabled,
      };
    });
  }, [pets, profileByPet, tagsByPet, reportsByPet]);

  const petNameById = useMemo(() => {
    const map = new Map<string, string>();

    for (const pet of pets) {
      map.set(pet.id, pet.name);
    }

    return map;
  }, [pets]);

  const totalPets = pets.length;

  const totalActiveTags = useMemo(
    () => petTags.filter((tag) => tag.status === "active").length,
    [petTags]
  );

  const totalReports = pendingReports.length;

  const activeOrders = useMemo(
    () => orders.filter((order) => isActiveOrder(order.status)),
    [orders]
  );

  const petsWithoutActiveTag = useMemo(
    () => petsWithStats.filter((pet) => pet.activeTags === 0),
    [petsWithStats]
  );

  const lostModePets = useMemo(
    () => petsWithStats.filter((pet) => pet.visibilityStatus === "lost_mode"),
    [petsWithStats]
  );

  const medicalEnabledPets = useMemo(
    () => petsWithStats.filter((pet) => pet.medicalProfileEnabled).length,
    [petsWithStats]
  );

  const importantAlerts = useMemo<AlertItem[]>(() => {
    const alerts: AlertItem[] = [];

    if (totalReports > 0) {
      alerts.push({
        id: "reports",
        title: `${totalReports} reporte${totalReports === 1 ? "" : "s"} pendiente${
          totalReports === 1 ? "" : "s"
        }`,
        description:
          "Revisa las ubicaciones o mensajes enviados desde los perfiles públicos.",
        actionLabel: "Ver reportes",
        path: "/mis-reportes",
        tone: "warning",
        icon: BellRing,
      });
    }

    if (petsWithoutActiveTag.length > 0) {
      alerts.push({
        id: "no-tags",
        title: `${petsWithoutActiveTag.length} mascota${
          petsWithoutActiveTag.length === 1 ? "" : "s"
        } sin placa activa`,
        description:
          "Activa una placa para que puedan contactarte si alguien la encuentra.",
        actionLabel: "Activar placa",
        path: "/activar",
        tone: "danger",
        icon: Tags,
      });
    }

    if (lostModePets.length > 0) {
      alerts.push({
        id: "lost-mode",
        title: `${lostModePets.length} mascota${
          lostModePets.length === 1 ? "" : "s"
        } en modo perdido`,
        description:
          "El perfil público mostrará la alerta de extravío y priorizará el reporte de ubicación.",
        actionLabel: "Revisar mascotas",
        path: "/mis-mascotas",
        tone: "danger",
        icon: AlertTriangle,
      });
    }

    if (activeOrders.length > 0) {
      alerts.push({
        id: "orders",
        title: `${activeOrders.length} pedido${
          activeOrders.length === 1 ? "" : "s"
        } en seguimiento`,
        description:
          "Consulta el estado de tus pedidos pendientes, en producción o listos.",
        actionLabel: "Ver pedidos",
        path: "/mis-pedidos",
        tone: "success",
        icon: ClipboardList,
      });
    }

    return alerts;
  }, [
    activeOrders.length,
    lostModePets.length,
    petsWithoutActiveTag.length,
    totalReports,
  ]);

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const reportItems: ActivityItem[] = reports.slice(0, 5).map((report) => {
      const petName = report.pet_id
        ? petNameById.get(report.pet_id) || "tu mascota"
        : "tu mascota";

      return {
        id: `report-${report.id}`,
        title: `Reporte para ${petName}`,
        description: isPendingReport(report.status)
          ? "Reporte pendiente de revisión."
          : "Reporte registrado en el historial.",
        date: report.created_at,
        path: `/mis-reportes/${report.id}`,
        tone: "report",
      };
    });

    const orderItems: ActivityItem[] = orders.slice(0, 5).map((order) => ({
      id: `order-${order.id}`,
      title: `Pedido ${order.order_number}`,
      description: getOrderStatusLabel(order.status),
      date: order.created_at,
      path: `/mis-pedidos/${order.id}`,
      tone: "order",
    }));

    return [...reportItems, ...orderItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [orders, petNameById, reports]);

  const showLoading = authLoading || loading;

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
                  <div>
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Dashboard Mokko
                    </span>

                    <h1 className="mt-5 text-3xl font-semibold leading-tight sm:text-5xl">
                      Hola,{" "}
                      <span className="text-[#E8C547]">{displayName}</span>
                    </h1>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                      Gestiona tus mascotas, placas, reportes y pedidos desde un
                      solo lugar.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate("/activar")}
                      disabled={showLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-3.5 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3"
                    >
                      <Tags className="h-4 w-4" />
                      Activar placa
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/mis-mascotas")}
                      disabled={showLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white/88 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3"
                    >
                      <Plus className="h-4 w-4" />
                      Agregar mascota
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              {!!warningMsg && !errorMsg && (
                <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                  {warningMsg}
                </div>
              )}

              <section className="mt-7 md:mt-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold md:text-2xl">
                      Pendientes importantes
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      Acciones que podrían necesitar tu atención.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {showLoading ? (
                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60 md:rounded-[28px]">
                      Cargando pendientes...
                    </div>
                  ) : importantAlerts.length > 0 ? (
                    importantAlerts.slice(0, 4).map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onClick={() => navigate(alert.path)}
                      />
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-[#2D5A27]/25 bg-[#2D5A27]/12 p-5 md:rounded-[28px]">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2D5A27]/20 text-green-200">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-white">
                            Todo en orden
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/65">
                            No tienes reportes pendientes ni alertas importantes
                            por ahora.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  icon={PawPrint}
                  label="Mascotas"
                  value={showLoading ? "—" : totalPets}
                  description="Registradas en tu cuenta."
                />

                <MetricCard
                  icon={Tags}
                  label="Placas activas"
                  value={showLoading ? "—" : totalActiveTags}
                  description="Vinculadas a tus mascotas."
                />

                <MetricCard
                  icon={MapPinned}
                  label="Reportes"
                  value={showLoading ? "—" : totalReports}
                  description="Nuevos o vistos."
                  highlight={totalReports > 0}
                />

                <MetricCard
                  icon={ClipboardList}
                  label="Pedidos"
                  value={showLoading ? "—" : activeOrders.length}
                  description="Pendientes o en proceso."
                />
              </section>

              <div className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm md:rounded-[32px] md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold md:text-2xl">
                          Tus mascotas
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-white/70">
                          Resumen rápido de estado, placas y reportes.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-mascotas")}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4">
                      {showLoading ? (
                        <div className="rounded-[22px] border border-white/10 bg-[#141410] p-5 text-white/65 md:rounded-[24px]">
                          Cargando mascotas...
                        </div>
                      ) : petsWithStats.length === 0 ? (
                        <div className="rounded-[22px] border border-white/10 bg-[#141410] p-5 md:rounded-[24px]">
                          <div className="text-lg font-semibold">
                            Aún no tienes mascotas registradas
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/65">
                            Registra tu primera mascota para activar una placa y
                            empezar a gestionar su información.
                          </p>

                          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap">
                            <button
                              type="button"
                              onClick={() => navigate("/mis-mascotas")}
                              className="w-full rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55] sm:w-auto"
                            >
                              Agregar mascota
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate("/pedido")}
                              className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto"
                            >
                              Obtener placa
                            </button>
                          </div>
                        </div>
                      ) : (
                        petsWithStats.slice(0, 4).map((pet) => {
                          const breedLabel = getBreedLabel(pet);

                          return (
                            <div
                              key={pet.id}
                              className="rounded-[24px] border border-white/10 bg-[#141410] p-4 transition hover:border-[#E8C547]/20 hover:bg-white/[0.045] md:rounded-[26px] md:p-5"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:h-16 md:w-16">
                                    {pet.photo_url ? (
                                      <img
                                        src={pet.photo_url}
                                        alt={pet.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                                        Sin foto
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="truncate text-lg font-semibold md:text-xl">
                                      {pet.name}
                                    </div>
                                    <div className="mt-1 text-sm text-white/50">
                                      {getSpeciesLabel(pet.species)}
                                      {breedLabel ? ` • ${breedLabel}` : ""}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <StatusPill
                                        className={getVisibilityClass(
                                          pet.visibilityStatus
                                        )}
                                      >
                                        {getVisibilityLabel(pet.visibilityStatus)}
                                      </StatusPill>

                                      {pet.medicalProfileEnabled && (
                                        <StatusPill className="border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]">
                                          Ficha médica
                                        </StatusPill>
                                      )}

                                      {pet.activeTags === 0 && (
                                        <StatusPill className="border-red-400/20 bg-red-400/10 text-red-200">
                                          Sin placa
                                        </StatusPill>
                                      )}

                                      {pet.petReports > 0 && (
                                        <StatusPill className="border-orange-400/20 bg-orange-400/10 text-orange-200">
                                          {pet.petReports} reporte
                                          {pet.petReports === 1 ? "" : "s"}
                                        </StatusPill>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white/80">
                                    {pet.activeTags} placa
                                    {pet.activeTags === 1 ? "" : "s"}
                                  </div>

                                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-white/80">
                                    {pet.petReports} reporte
                                    {pet.petReports === 1 ? "" : "s"}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/mis-mascotas/${pet.id}`)}
                                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Ver detalle
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate("/mis-placas")}
                                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Placas
                                </button>

                                {pet.petReports > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => navigate("/mis-reportes")}
                                    className="col-span-2 rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55] sm:col-span-1"
                                  >
                                    Ver reportes
                                  </button>
                                )}

                                {pet.activeTags === 0 && (
                                  <button
                                    type="button"
                                    onClick={() => navigate("/activar")}
                                    className="col-span-2 rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55] sm:col-span-1"
                                  >
                                    Activar placa
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm md:rounded-[32px] md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold md:text-2xl">
                          Actividad reciente
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-white/70">
                          Últimos reportes y pedidos asociados a tu cuenta.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {showLoading ? (
                        <div className="rounded-[22px] border border-white/10 bg-[#141410] p-5 text-sm text-white/60">
                          Cargando actividad...
                        </div>
                      ) : recentActivity.length === 0 ? (
                        <div className="rounded-[22px] border border-white/10 bg-[#141410] p-5">
                          <div className="text-base font-semibold">
                            Sin actividad reciente
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/60">
                            Cuando recibas reportes o generes pedidos, aparecerán
                            aquí.
                          </p>
                        </div>
                      ) : (
                        recentActivity.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className="group rounded-[22px] border border-white/10 bg-[#141410] p-4 text-left transition hover:border-[#E8C547]/20 hover:bg-white/[0.045]"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                                    item.tone === "report"
                                      ? "bg-orange-400/10 text-orange-200"
                                      : "bg-[#E8C547]/10 text-[#E8C547]"
                                  }`}
                                >
                                  {item.tone === "report" ? (
                                    <MapPinned className="h-5 w-5" />
                                  ) : (
                                    <ClipboardList className="h-5 w-5" />
                                  )}
                                </div>

                                <div>
                                  <div className="font-semibold text-white">
                                    {item.title}
                                  </div>
                                  <div className="mt-1 text-sm text-white/55">
                                    {item.description}
                                  </div>
                                  <div className="mt-2 text-xs text-white/35">
                                    {formatShortDate(item.date)}
                                  </div>
                                </div>
                              </div>

                              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#E8C547]" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <aside className="grid content-start gap-6">
                  <section className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 md:rounded-[32px] md:p-6">
                    <h2 className="text-xl font-semibold md:text-2xl">
                      Accesos rápidos
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Acciones principales de tu cuenta.
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-1">
                      <QuickAction
                        icon={PawPrint}
                        title="Mascotas"
                        description="Gestiona datos y perfiles."
                        onClick={() => navigate("/mis-mascotas")}
                      />

                      <QuickAction
                        icon={Tags}
                        title="Placas"
                        description="Estados, principal y activación."
                        onClick={() => navigate("/mis-placas")}
                      />

                      <QuickAction
                        icon={MapPinned}
                        title="Reportes"
                        description="Ubicaciones y avisos."
                        onClick={() => navigate("/mis-reportes")}
                      />

                      <QuickAction
                        icon={ClipboardList}
                        title="Pedidos"
                        description="Estados y detalle."
                        onClick={() => navigate("/mis-pedidos")}
                      />

                      <QuickAction
                        icon={CreditCard}
                        title="Comprar"
                        description="Crear nuevo pedido."
                        onClick={() => navigate("/pedido")}
                      />

                      <QuickAction
                        icon={UserRound}
                        title="Cuenta"
                        description="Datos y contraseña."
                        onClick={() => navigate("/my-account")}
                      />
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm md:rounded-[32px] md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold md:text-2xl">
                          Estado de tu cuenta
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-white/70">
                          Información principal de tu sesión.
                        </p>
                      </div>

                      <span className="inline-flex items-center justify-center rounded-full border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-3 py-1 text-xs font-medium text-green-200">
                        Sesión activa
                      </span>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Usuario
                        </div>
                        <div className="mt-2 text-base font-semibold">
                          {displayName}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Correo
                        </div>
                        <div className="mt-2 break-all text-sm font-medium text-white/80">
                          {displayEmail}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Fichas médicas activas
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white/80">
                          <HeartPulse className="h-4 w-4 text-[#E8C547]" />
                          {medicalEnabledPets} mascota
                          {medicalEnabledPets === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/my-account")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Actualizar mis datos
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Modifica tu información personal y de contacto.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/update-password")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Cambiar contraseña
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Mantén tu cuenta protegida.
                        </div>
                      </button>
                    </div>
                  </section>
                </aside>
              </div>
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
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 sm:rounded-[28px] sm:p-5 md:p-6 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px] sm:tracking-[0.16em]">
          {label}
        </div>
        <div
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${
            highlight ? "bg-[#E8C547]/14 text-[#E8C547]" : "bg-white/8 text-white/60"
          }`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>

      <div className="mt-4 text-3xl font-semibold text-[#F5F0E8] sm:text-4xl">
        {value}
      </div>
      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function AlertCard({
  alert,
  onClick,
}: {
  alert: AlertItem;
  onClick: () => void;
}) {
  const Icon = alert.icon;

  const toneClass =
    alert.tone === "danger"
      ? "border-orange-400/20 bg-orange-400/10 text-orange-200"
      : alert.tone === "success"
      ? "border-[#2D5A27]/25 bg-[#2D5A27]/12 text-green-200"
      : "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] hover:brightness-105 md:rounded-[28px] md:p-5 ${toneClass}`}
    >
      <div className="flex items-start gap-4">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/10 md:h-11 md:w-11">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-white md:text-lg">
            {alert.title}
          </div>
          <p className="mt-2 text-sm leading-6 text-white/68 md:leading-7">
            {alert.description}
          </p>

          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-white">
            {alert.actionLabel}
            <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] sm:tracking-[0.14em] ${className}`}
    >
      {children}
    </span>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-left transition hover:border-[#E8C547]/20 hover:bg-white/10 md:px-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#141410] text-[#E8C547]">
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
            {title}
            <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-1 group-hover:text-[#E8C547]" />
          </div>
          <div className="mt-1 hidden text-sm leading-6 text-white/62 md:block">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}
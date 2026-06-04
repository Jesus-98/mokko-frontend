import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  Eye,
  HeartPulse,
  Link2,
  MapPinned,
  Shield,
  Tags,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type EspecieMascota = "dog" | "cat" | "other";
type PlanVendido = "essential" | "custom" | "partner_batch" | "other";
type EstadoVisibilidad = "public" | "private" | "lost_mode";

type RazaMascota = {
  name: string;
  name_es?: string | null;
};

type Relacion<T> = T | T[] | null | undefined;

type Mascota = {
  id: string;
  name: string;
  species: EspecieMascota | null;
  breed_custom: string | null;
  sex: string | null;
  photo_url: string | null;
  color: string | null;
  birthdate: string | null;
  weight_kg: number | null;
  pet_breeds?: Relacion<RazaMascota>;
};

type TagResumen = {
  id: string;
  code: string;
  status: string;
};

type PlacaVinculada = {
  id: string;
  sold_plan_type: PlanVendido;
  status: string;
  is_primary: boolean;
  assigned_at: string;
  tags?: Relacion<TagResumen>;
};

type PerfilMascota = {
  visibility_status: EstadoVisibilidad;
  allow_found_reports: boolean;
  medical_profile_enabled: boolean;
};

type ReporteMascota = {
  id: string;
  status: string;
  created_at: string;
};

function primeraRelacion<T>(valor: Relacion<T>): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

function etiquetaEspecie(species: EspecieMascota | null): string {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  return "Mascota";
}

function etiquetaSexo(sex: string | null | undefined): string {
  const valor = sex?.trim().toLowerCase();

  if (!valor) return "No especificado";
  if (valor === "male" || valor === "m" || valor === "macho") return "Macho";
  if (valor === "female" || valor === "f" || valor === "hembra") return "Hembra";
  if (valor === "unknown" || valor === "desconocido") return "No especificado";

  return sex ?? "No especificado";
}

function etiquetaPlan(plan: PlanVendido | null | undefined): string {
  if (plan === "essential") return "Essential";
  if (plan === "custom") return "Custom";
  if (plan === "partner_batch") return "Lote aliado";
  if (plan === "other") return "Otro";
  return "No definido";
}

function etiquetaVisibilidad(
  visibilidad: EstadoVisibilidad | null | undefined
): string {
  if (visibilidad === "public") return "Perfil público";
  if (visibilidad === "private") return "Perfil privado";
  if (visibilidad === "lost_mode") return "Modo perdido";
  return "Sin configurar";
}

function getVisibilityClass(visibilidad: EstadoVisibilidad | null | undefined) {
  if (visibilidad === "lost_mode") {
    return "border-orange-400/20 bg-orange-400/10 text-orange-200";
  }

  if (visibilidad === "private") {
    return "border-white/10 bg-white/5 text-white/65";
  }

  return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
}

function etiquetaEstadoReporte(status: string | null | undefined) {
  const value = (status ?? "").trim().toLowerCase();

  if (value === "new") return "Nuevo";
  if (value === "viewed") return "Visto";
  if (value === "resolved") return "Resuelto";
  if (value === "closed") return "Cerrado";

  return status || "Registrado";
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "No disponible";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "No disponible";

  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function PetDetails() {
  const { id } = useParams<{ id: string }>();
  const petId = id ?? "";

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [placas, setPlacas] = useState<PlacaVinculada[]>([]);
  const [perfil, setPerfil] = useState<PerfilMascota | null>(null);
  const [reportes, setReportes] = useState<ReporteMascota[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login?next=/mis-mascotas", { replace: true });
      return;
    }

    if (!petId) {
      setMensajeError("No se encontró la mascota solicitada.");
      setCargando(false);
      return;
    }

    let montado = true;

    const cargarDetalle = async () => {
      setCargando(true);
      setMensajeError("");
      setMensajeAdvertencia("");

      try {
        const { data: petData, error: petError } = await supabase
          .from("pets")
          .select(`
            id,
            name,
            species,
            breed_custom,
            sex,
            photo_url,
            color,
            birthdate,
            weight_kg,
            pet_breeds (
              name,
              name_es
            )
          `)
          .eq("id", petId)
          .eq("owner_user_id", user.id)
          .single();

        if (petError || !petData) {
          throw new Error("No se pudo cargar la mascota.");
        }

        if (!montado) return;

        setMascota(petData as Mascota);

        const advertencias: string[] = [];

        const [placasRes, perfilRes, reportesRes] = await Promise.all([
          supabase
            .from("pet_tags")
            .select(`
              id,
              sold_plan_type,
              status,
              is_primary,
              assigned_at,
              tags (
                id,
                code,
                status
              )
            `)
            .eq("pet_id", petId)
            .order("assigned_at", { ascending: false }),

          supabase
            .from("pet_profiles")
            .select(`
              visibility_status,
              allow_found_reports,
              medical_profile_enabled
            `)
            .eq("pet_id", petId)
            .maybeSingle(),

          supabase
            .from("found_reports")
            .select("id, status, created_at")
            .eq("pet_id", petId)
            .order("created_at", { ascending: false }),
        ]);

        if (!montado) return;

        if (placasRes.error) {
          console.error("PetDetails pet_tags error:", placasRes.error);
          setPlacas([]);
          advertencias.push("No se pudieron cargar todas las placas vinculadas.");
        } else {
          setPlacas((placasRes.data ?? []) as PlacaVinculada[]);
        }

        if (perfilRes.error) {
          console.error("PetDetails pet_profiles error:", perfilRes.error);
          setPerfil(null);
          advertencias.push(
            "No se pudo cargar la configuración pública de la mascota."
          );
        } else {
          setPerfil((perfilRes.data as PerfilMascota | null) ?? null);
        }

        if (reportesRes.error) {
          console.error("PetDetails found_reports error:", reportesRes.error);
          setReportes([]);
          advertencias.push(
            "No se pudieron cargar todos los reportes de la mascota."
          );
        } else {
          setReportes((reportesRes.data ?? []) as ReporteMascota[]);
        }

        setMensajeAdvertencia(advertencias.join(" "));
      } catch (error) {
        console.error("PetDetails load error:", error);

        setMensajeError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el detalle de la mascota."
        );
      } finally {
        if (montado) setCargando(false);
      }
    };

    void cargarDetalle();

    return () => {
      montado = false;
    };
  }, [authLoading, navigate, petId, user]);

  const razaTexto = useMemo(() => {
    if (!mascota) return "No especificada";

    const raza = primeraRelacion(mascota.pet_breeds);

    if (mascota.breed_custom?.trim()) return mascota.breed_custom.trim();
    if (raza?.name_es?.trim()) return raza.name_es.trim();
    if (raza?.name?.trim()) return raza.name.trim();

    return "No especificada";
  }, [mascota]);

  const sexoTexto = useMemo(() => {
    return etiquetaSexo(mascota?.sex);
  }, [mascota?.sex]);

  const placasActivas = useMemo(() => {
    return placas.filter((placa) => placa.status === "active");
  }, [placas]);

  const placaActivaPrincipal = useMemo(() => {
    return (
      placasActivas.find((placa) => placa.is_primary) ||
      placasActivas[0] ||
      null
    );
  }, [placasActivas]);

  const codigoPublico = useMemo(() => {
    const tag = primeraRelacion(placaActivaPrincipal?.tags);
    return tag?.code || "";
  }, [placaActivaPrincipal]);

  const urlPublica = useMemo(() => {
    if (!codigoPublico) return "";
    return `${window.location.origin}/p/${codigoPublico}`;
  }, [codigoPublico]);

  const totalPlacasActivas = placasActivas.length;
  const totalReportes = reportes.length;
  const perfilMedicoHabilitado = !!perfil?.medical_profile_enabled;

  if (cargando || authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-white/70">
              Cargando detalle de la mascota...
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (mensajeError || !mascota) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-red-400/20 bg-red-400/10 px-6 py-12">
              <div className="text-2xl font-semibold">
                No se pudo cargar la mascota
              </div>
              <p className="mt-3 text-sm leading-7 text-red-200">
                {mensajeError || "No se encontró información para esta mascota."}
              </p>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => navigate("/mis-mascotas")}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
                >
                  Volver
                </button>
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Detalle de mascota
                    </span>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {mascota.photo_url ? (
                          <img
                            src={mascota.photo_url}
                            alt={mascota.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                            Sin foto
                          </div>
                        )}
                      </div>

                      <div>
                        <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                          {mascota.name}
                        </h1>

                        <p className="mt-2 text-sm leading-7 text-white/70 sm:text-base">
                          {etiquetaEspecie(mascota.species)} • {razaTexto}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPill
                            className={getVisibilityClass(
                              perfil?.visibility_status
                            )}
                          >
                            {etiquetaVisibilidad(perfil?.visibility_status)}
                          </StatusPill>

                          {totalPlacasActivas === 0 ? (
                            <StatusPill className="border-red-400/20 bg-red-400/10 text-red-200">
                              Sin placa activa
                            </StatusPill>
                          ) : (
                            <StatusPill className="border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200">
                              {totalPlacasActivas} placa
                              {totalPlacasActivas === 1 ? "" : "s"}
                            </StatusPill>
                          )}

                          {perfilMedicoHabilitado && (
                            <StatusPill className="border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]">
                              Ficha médica
                            </StatusPill>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate("/mis-mascotas")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] sm:w-auto sm:py-3.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Volver
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/mis-mascotas/${petId}/perfil-publico`)
                      }
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                    >
                      Gestionar perfil público
                    </button>
                  </div>
                </div>
              </div>

              {mensajeAdvertencia && (
                <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm leading-6 text-[#f6df8a]">
                  {mensajeAdvertencia}
                </div>
              )}

              <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  icon={Tags}
                  label="Placas"
                  value={totalPlacasActivas}
                  description="Activas."
                />

                <MetricCard
                  icon={MapPinned}
                  label="Reportes"
                  value={totalReportes}
                  description="Registrados."
                  highlight={totalReportes > 0}
                />

                <MetricCard
                  icon={Eye}
                  label="Perfil"
                  value={etiquetaVisibilidad(perfil?.visibility_status)}
                  description="Visibilidad."
                />

                <MetricCard
                  icon={HeartPulse}
                  label="Ficha médica"
                  value={perfilMedicoHabilitado ? "Sí" : "No"}
                  description="Según plan."
                  highlight={perfilMedicoHabilitado}
                />
              </section>

              <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold">
                      Información general
                    </h2>
                    <p className="text-sm leading-7 text-white/65">
                      Datos principales registrados para esta mascota.
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <InfoCard
                      label="Especie"
                      value={etiquetaEspecie(mascota.species)}
                    />
                    <InfoCard label="Raza" value={razaTexto} />
                    <InfoCard label="Sexo" value={sexoTexto} />
                    <InfoCard
                      label="Color"
                      value={mascota.color || "No especificado"}
                    />
                    <InfoCard
                      label="Fecha de nacimiento"
                      value={formatearFecha(mascota.birthdate)}
                    />
                    <InfoCard
                      label="Peso"
                      value={
                        mascota.weight_kg != null
                          ? `${mascota.weight_kg} kg`
                          : "No especificado"
                      }
                    />
                  </div>

                  <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate(`/mis-mascotas/${petId}/editar`)}
                      className="w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
                    >
                      Editar mascota
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/mis-mascotas/${petId}/perfil-publico`)
                      }
                      className="w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
                    >
                      Configurar perfil público
                    </button>
                  </div>
                </section>

                <div className="grid content-start gap-6">
                  <section className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold">
                        Accesos rápidos
                      </h2>
                      <p className="text-sm leading-7 text-white/65">
                        Gestiona lo más importante de esta mascota.
                      </p>
                    </div>

                    <div className="mt-6 grid gap-3">
                      {urlPublica ? (
                        <a
                          href={urlPublica}
                          target="_blank"
                          rel="noreferrer"
                          className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-base font-semibold">
                                Ver perfil público
                              </div>
                              <div className="mt-1 text-sm text-white/65">
                                Abrir enlace público de la placa.
                              </div>
                            </div>
                            <Link2 className="h-4 w-4 text-white/40 transition group-hover:text-white/70" />
                          </div>
                        </a>
                      ) : (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                          <div className="text-base font-semibold">
                            Sin enlace público activo
                          </div>
                          <div className="mt-1 text-sm leading-7 text-white/65">
                            Activa una placa para generar el perfil público.
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/mis-mascotas/${petId}/perfil-publico`)
                        }
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">
                              Ajustar perfil público
                            </div>
                            <div className="mt-1 text-sm text-white/65">
                              Visibilidad, modo perdido y contacto.
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-white/40" />
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          perfilMedicoHabilitado &&
                          navigate(`/mis-mascotas/${petId}/perfil-medico`)
                        }
                        disabled={!perfilMedicoHabilitado}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">
                              Ficha médica
                            </div>
                            <div className="mt-1 text-sm text-white/65">
                              {perfilMedicoHabilitado
                                ? "Datos médicos y vacunas."
                                : "Disponible con funciones Custom."}
                            </div>
                          </div>
                          <HeartPulse className="h-4 w-4 text-white/40" />
                        </div>
                      </button>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                    <div className="flex items-center gap-3">
                      <Tags className="h-5 w-5 text-[#E8C547]" />
                      <h2 className="text-2xl font-semibold">
                        Placas vinculadas
                      </h2>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {placas.length === 0 ? (
                        <div className="rounded-[24px] border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/65">
                          Esta mascota aún no tiene placas vinculadas.
                        </div>
                      ) : (
                        placas.map((placa) => {
                          const tag = primeraRelacion(placa.tags);

                          return (
                            <div
                              key={placa.id}
                              className="rounded-[24px] border border-white/10 bg-[#141410] p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <div className="text-base font-semibold">
                                    {tag?.code || "Placa sin código visible"}
                                  </div>
                                  <div className="mt-1 text-sm text-white/60">
                                    {etiquetaPlan(placa.sold_plan_type)}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {placa.is_primary && (
                                    <StatusPill className="border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]">
                                      Principal
                                    </StatusPill>
                                  )}

                                  <StatusPill
                                    className={
                                      placa.status === "active"
                                        ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200"
                                        : "border-white/10 bg-white/5 text-white/65"
                                    }
                                  >
                                    {placa.status === "active"
                                      ? "Activa"
                                      : placa.status}
                                  </StatusPill>
                                </div>
                              </div>

                              <div className="mt-3 text-sm text-white/55">
                                Vinculada el {formatearFecha(placa.assigned_at)}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                    <div className="flex items-center gap-3">
                      {perfil?.visibility_status === "private" ? (
                        <Shield className="h-5 w-5 text-white/80" />
                      ) : (
                        <Eye className="h-5 w-5 text-green-200" />
                      )}

                      <h2 className="text-2xl font-semibold">
                        Perfil público
                      </h2>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <InfoCard
                        label="Estado actual"
                        value={etiquetaVisibilidad(perfil?.visibility_status)}
                      />

                      <InfoCard
                        label="Reportes públicos"
                        value={
                          perfil?.allow_found_reports
                            ? "Permitidos"
                            : "Desactivados"
                        }
                      />
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                    <div className="flex items-center gap-3">
                      <MapPinned className="h-5 w-5 text-[#E8C547]" />
                      <h2 className="text-2xl font-semibold">
                        Reportes recientes
                      </h2>
                    </div>

                    <div className="mt-5 grid gap-3">
                      {reportes.length === 0 ? (
                        <div className="rounded-[24px] border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/65">
                          Aún no hay reportes para esta mascota.
                        </div>
                      ) : (
                        reportes.slice(0, 3).map((reporte) => (
                          <button
                            key={reporte.id}
                            type="button"
                            onClick={() =>
                              navigate(`/mis-reportes/${reporte.id}`)
                            }
                            className="rounded-[24px] border border-white/10 bg-[#141410] p-4 text-left transition hover:bg-white/[0.06]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="text-base font-semibold">
                                  {etiquetaEstadoReporte(reporte.status)}
                                </div>
                                <div className="mt-1 text-sm text-white/55">
                                  {formatearFecha(reporte.created_at)}
                                </div>
                              </div>
                              <MapPinned className="h-4 w-4 text-white/35" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    {reportes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => navigate("/mis-reportes")}
                        className="mt-4 w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:py-3.5"
                      >
                        Ver todos los reportes
                      </button>
                    )}
                  </section>
                </div>
              </div>

              {mensajeAdvertencia && (
                <section className="mt-6 rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547]/10 p-4 text-sm leading-6 text-[#f6df8a]">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                    <div>{mensajeAdvertencia}</div>
                  </div>
                </section>
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

      <div className="mt-4 text-2xl font-semibold text-[#F5F0E8] sm:text-3xl">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#141410] p-4 sm:rounded-[24px]">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
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
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  Link2,
  Shield,
  Siren,
  Sparkles,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type VisibilidadPerfil = "public" | "private" | "lost_mode";
type EspecieMascota = "dog" | "cat" | "other";
type PlanVendido = "essential" | "custom" | "partner_batch" | "other";

type RazaMascota = {
  name: string;
  name_es?: string | null;
};

type Relacion<T> = T | T[] | null | undefined;

type Mascota = {
  id: string;
  name: string;
  species: EspecieMascota | null;
  photo_url: string | null;
  breed_custom: string | null;
  sex: string | null;
  pet_breeds?: Relacion<RazaMascota>;
};

type PerfilMascota = {
  pet_id: string;
  visibility_status: VisibilidadPerfil;
  allow_found_reports: boolean;
  show_owner_name: boolean;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  show_medical_alerts: boolean;
  medical_profile_enabled: boolean;
  lost_mode_message: string | null;
  address_text: string | null;
  emergency_message: string | null;
  lost_mode_activated_at: string | null;
};

type PetTagActivo = {
  sold_plan_type: PlanVendido;
  tag_id: string;
};

type TagResumen = {
  code: string;
};

function primeraRelacion<T>(valor: Relacion<T>): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

function perfilPorDefecto(
  petId: string,
  planDetectado: PlanVendido | null
): PerfilMascota {
  const esCustom = planDetectado === "custom";

  return {
    pet_id: petId,
    visibility_status: "public",
    allow_found_reports: true,
    show_owner_name: false,
    show_phone: true,
    show_whatsapp: true,
    show_address: false,
    show_medical_alerts: esCustom,
    medical_profile_enabled: esCustom,
    lost_mode_message: "",
    address_text: "",
    emergency_message: "",
    lost_mode_activated_at: null,
  };
}

function etiquetaPlan(plan: PlanVendido): string {
  if (plan === "essential") return "Essential";
  if (plan === "custom") return "Custom";
  if (plan === "partner_batch") return "Partner batch";
  return "Otro";
}

export default function ManagePetPublicProfile() {
  const { id } = useParams<{ id: string }>();
  const petId = id ?? "";

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [perfil, setPerfil] = useState<PerfilMascota | null>(null);
  const [visibilidadOriginal, setVisibilidadOriginal] =
    useState<VisibilidadPerfil>("public");
  const [tagActivo, setTagActivo] = useState<PetTagActivo | null>(null);
  const [codigoTagActivo, setCodigoTagActivo] = useState<string>("");

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

    const cargarPantalla = async () => {
      setCargando(true);
      setMensajeError("");
      setMensajeExito("");
      setMensajeAdvertencia("");

      try {
        const { data: petData, error: petError } = await supabase
          .from("pets")
          .select(`
            id,
            name,
            species,
            photo_url,
            breed_custom,
            sex,
            pet_breeds (
              name,
              name_es
            )
          `)
          .eq("id", petId)
          .eq("owner_user_id", user.id)
          .single();

        if (petError) {
          throw new Error("No se pudo cargar la mascota.");
        }

        if (!montado) return;

        setMascota(petData as Mascota);

        const { data: profileData, error: profileError } = await supabase
          .from("pet_profiles")
          .select(`
            pet_id,
            visibility_status,
            allow_found_reports,
            show_owner_name,
            show_phone,
            show_whatsapp,
            show_address,
            show_medical_alerts,
            medical_profile_enabled,
            lost_mode_message,
            address_text,
            emergency_message,
            lost_mode_activated_at
          `)
          .eq("pet_id", petId)
          .maybeSingle();

        if (profileError) {
          throw new Error("No se pudo cargar el perfil público de la mascota.");
        }

        const { data: activePetTag, error: activeTagError } = await supabase
          .from("pet_tags")
          .select("tag_id, sold_plan_type")
          .eq("pet_id", petId)
          .eq("status", "active")
          .order("assigned_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeTagError) {
          console.error("Error cargando placa activa:", activeTagError);
          setMensajeAdvertencia(
            "No se pudo cargar la placa activa de esta mascota. El resto del formulario sí está disponible."
          );
        }

        let planDetectado: PlanVendido | null = null;
        let codigoDetectado = "";

        if (activePetTag) {
          const tagRow = activePetTag as PetTagActivo;
          planDetectado = tagRow.sold_plan_type;
          setTagActivo(tagRow);

          const { data: tagData, error: tagDataError } = await supabase
            .from("tags")
            .select("code")
            .eq("id", tagRow.tag_id)
            .maybeSingle();

          if (tagDataError) {
            console.error("Error cargando código de la placa:", tagDataError);
          } else {
            codigoDetectado = (tagData as TagResumen | null)?.code || "";
            setCodigoTagActivo(codigoDetectado);
          }
        } else {
          setTagActivo(null);
          setCodigoTagActivo("");
        }

        const perfilNormalizado: PerfilMascota =
          (profileData as PerfilMascota | null) ??
          perfilPorDefecto(petId, planDetectado);

        perfilNormalizado.allow_found_reports = true;

        if (!perfilNormalizado.medical_profile_enabled) {
          perfilNormalizado.show_medical_alerts = false;
          perfilNormalizado.emergency_message = null;
        }

        setPerfil(perfilNormalizado);
        setVisibilidadOriginal(perfilNormalizado.visibility_status);
      } catch (error) {
        console.error("Error cargando ManagePetPublicProfile:", error);
        setMensajeError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la configuración del perfil."
        );
      } finally {
        if (montado) setCargando(false);
      }
    };

    void cargarPantalla();

    return () => {
      montado = false;
    };
  }, [authLoading, navigate, petId, user]);

  const etiquetaEspecie = useMemo(() => {
    if (!mascota?.species) return "Mascota";
    if (mascota.species === "dog") return "Perro";
    if (mascota.species === "cat") return "Gato";
    return "Mascota";
  }, [mascota?.species]);

  const etiquetaRaza = useMemo(() => {
    if (!mascota) return null;
    const raza = primeraRelacion(mascota.pet_breeds);

    if (mascota.breed_custom?.trim()) return mascota.breed_custom.trim();
    if (raza?.name_es?.trim()) return raza.name_es.trim();
    if (raza?.name?.trim()) return raza.name.trim();

    return null;
  }, [mascota]);

  const urlPublica = useMemo(() => {
    if (!codigoTagActivo) return "";
    return `${window.location.origin}/p/${codigoTagActivo}`;
  }, [codigoTagActivo]);

  const esPrivado = perfil?.visibility_status === "private";
  const esLostMode = perfil?.visibility_status === "lost_mode";
  const tienePerfilMedico = !!perfil?.medical_profile_enabled;

  const actualizarPerfil = <K extends keyof PerfilMascota>(
    campo: K,
    valor: PerfilMascota[K]
  ) => {
    setPerfil((actual) => {
      if (!actual) return actual;
      return {
        ...actual,
        [campo]: valor,
      };
    });

    setMensajeError("");
    setMensajeExito("");
  };

  const guardarCambios = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!petId || !perfil) {
      setMensajeError("No hay información suficiente para guardar.");
      return;
    }

    if (
      perfil.visibility_status === "lost_mode" &&
      !perfil.lost_mode_message?.trim()
    ) {
      setMensajeError(
        "Debes ingresar un mensaje personalizado cuando activas el modo perdido."
      );
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const estabaEnLostMode = visibilidadOriginal === "lost_mode";
      const entraALostMode = perfil.visibility_status === "lost_mode";

      let lostModeActivatedAt = perfil.lost_mode_activated_at;

      if (entraALostMode && !estabaEnLostMode) {
        lostModeActivatedAt = new Date().toISOString();
      }

      if (!entraALostMode) {
        lostModeActivatedAt = null;
      }

      const payload = {
        pet_id: petId,
        visibility_status: perfil.visibility_status,
        allow_found_reports: true,
        show_owner_name: perfil.show_owner_name,
        show_phone: perfil.show_phone,
        show_whatsapp: perfil.show_whatsapp,
        show_address: perfil.show_address,
        show_medical_alerts: perfil.medical_profile_enabled
          ? perfil.show_medical_alerts
          : false,
        medical_profile_enabled: perfil.medical_profile_enabled,
        lost_mode_message: perfil.lost_mode_message?.trim() || null,
        address_text: perfil.address_text?.trim() || null,
        emergency_message: perfil.medical_profile_enabled
          ? perfil.emergency_message?.trim() || null
          : null,
        lost_mode_activated_at: lostModeActivatedAt,
      };

      const { data, error } = await supabase
        .from("pet_profiles")
        .upsert(payload, { onConflict: "pet_id" })
        .select(`
          pet_id,
          visibility_status,
          allow_found_reports,
          show_owner_name,
          show_phone,
          show_whatsapp,
          show_address,
          show_medical_alerts,
          medical_profile_enabled,
          lost_mode_message,
          address_text,
          emergency_message,
          lost_mode_activated_at
        `)
        .single();

      if (error) {
        throw new Error(error.message || "No se pudo guardar el perfil.");
      }

      const perfilGuardado = data as PerfilMascota;
      setPerfil(perfilGuardado);
      setVisibilidadOriginal(perfilGuardado.visibility_status);
      setMensajeExito("Perfil público actualizado correctamente.");
    } catch (error) {
      console.error("Error guardando perfil público:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la configuración."
      );
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-white/70">
              Cargando configuración del perfil...
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
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to="/mis-mascotas"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  Volver a mis mascotas
                </Link>

                {urlPublica && (
                  <a
                    href={urlPublica}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#f6df8a] transition hover:bg-[#E8C547]/14"
                  >
                    <Link2 className="h-4.5 w-4.5" />
                    Ver perfil público
                  </a>
                )}
              </div>

              <div className="mt-6">
                <span className="mokko-badge mokko-badge-primary w-fit">
                  Perfil público de la mascota
                </span>

                <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                  Configura cómo se mostrará{" "}
                  <span className="text-[#E8C547]">
                    {mascota?.name || "tu mascota"}
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  Define el modo del perfil y qué datos se mostrarán al escanear
                  la placa.
                </p>
              </div>

              {mensajeError && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {mensajeError}
                </div>
              )}

              {mensajeExito && (
                <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                  {mensajeExito}
                </div>
              )}

              {mensajeAdvertencia && !mensajeError && (
                <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                  {mensajeAdvertencia}
                </div>
              )}

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.96fr_1.04fr]">
                <div className="space-y-6">
                  <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {mascota?.photo_url ? (
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
                        <div className="text-2xl font-semibold">
                          {mascota?.name}
                        </div>
                        <div className="mt-1 text-sm text-white/60">
                          {etiquetaEspecie}
                          {etiquetaRaza ? ` • ${etiquetaRaza}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <ResumenItem
                        label="Placa activa"
                        value={codigoTagActivo || "Sin placa activa"}
                      />
                      <ResumenItem
                        label="Plan detectado"
                        value={
                          tagActivo
                            ? etiquetaPlan(tagActivo.sold_plan_type)
                            : "Sin detectar"
                        }
                      />
                      {tienePerfilMedico && (
                        <ResumenItem
                          label="Perfil médico"
                          value="Desbloqueado"
                        />
                      )}
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center gap-3">
                      {esPrivado ? (
                        <Shield className="h-5 w-5 text-white/70" />
                      ) : esLostMode ? (
                        <Siren className="h-5 w-5 text-[#E8C547]" />
                      ) : (
                        <Eye className="h-5 w-5 text-[#9fd598]" />
                      )}

                      <h2 className="text-2xl font-semibold">
                        Resumen del modo
                      </h2>
                    </div>

                    <div className="mt-5 rounded-[24px] border border-white/10 bg-[#141410] p-5 text-sm leading-7 text-white/72">
                      {esPrivado
                        ? "En modo privado solo se mostrará el nombre y la foto de la mascota. Aun así, se podrá compartir ubicación o enviar un reporte."
                        : esLostMode
                        ? "En modo perdido el perfil se mostrará con énfasis visual y usará el mensaje personalizado que definas más abajo."
                        : "En modo público se mostrará la información permitida por tus toggles y el mensaje global del sistema."}
                    </div>

                    <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                      <EyeOff className="h-4.5 w-4.5" />
                      Los reportes y el envío de ubicación siempre estarán
                      disponibles.
                    </div>

                    {esPrivado && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                        <EyeOff className="h-4.5 w-4.5" />
                        Los toggles visuales quedan guardados, pero no se
                        aplican mientras el perfil esté en privado.
                      </div>
                    )}
                  </section>
                </div>

                <form
                  onSubmit={guardarCambios}
                  className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]"
                >
                  <div className="space-y-8">
                    <section>
                      <h2 className="text-2xl font-semibold">Modo del perfil</h2>
                      <p className="mt-2 text-sm leading-7 text-white/65">
                        Elige cómo quieres mostrar el perfil cuando alguien
                        escanee la placa.
                      </p>

                      <div className="mt-5 grid gap-3">
                        <SelectorModo
                          activo={perfil?.visibility_status === "public"}
                          titulo="Público"
                          descripcion="Muestra el perfil normal con los datos permitidos."
                          onClick={() =>
                            actualizarPerfil("visibility_status", "public")
                          }
                        />

                        <SelectorModo
                          activo={perfil?.visibility_status === "private"}
                          titulo="Privado"
                          descripcion="Solo muestra nombre y foto. Igual permite reportes y ubicación."
                          onClick={() =>
                            actualizarPerfil("visibility_status", "private")
                          }
                        />

                        <SelectorModo
                          activo={perfil?.visibility_status === "lost_mode"}
                          titulo="Perdido"
                          descripcion="Muestra el perfil con alerta visual y usa un mensaje personalizado."
                          onClick={() =>
                            actualizarPerfil("visibility_status", "lost_mode")
                          }
                        />
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold">Datos visibles</h3>
                      <p className="mt-2 text-sm leading-7 text-white/65">
                        Define qué información mostrar cuando el perfil esté en
                        modo público o perdido.
                      </p>

                      <div className="mt-5 space-y-3">
                        <ToggleFila
                          titulo="Mostrar nombre del dueño"
                          descripcion="Permite mostrar tu nombre en el perfil público."
                          checked={!!perfil?.show_owner_name}
                          onChange={(checked) =>
                            actualizarPerfil("show_owner_name", checked)
                          }
                          disabled={esPrivado}
                        />

                        <ToggleFila
                          titulo="Mostrar teléfono"
                          descripcion="Muestra el teléfono principal en el perfil."
                          checked={!!perfil?.show_phone}
                          onChange={(checked) =>
                            actualizarPerfil("show_phone", checked)
                          }
                          disabled={esPrivado}
                        />

                        <ToggleFila
                          titulo="Mostrar WhatsApp"
                          descripcion="Muestra el botón y número de WhatsApp si existe."
                          checked={!!perfil?.show_whatsapp}
                          onChange={(checked) =>
                            actualizarPerfil("show_whatsapp", checked)
                          }
                          disabled={esPrivado}
                        />

                        <ToggleFila
                          titulo="Mostrar dirección o referencia"
                          descripcion="Comparte una dirección, referencia o punto de encuentro."
                          checked={!!perfil?.show_address}
                          onChange={(checked) =>
                            actualizarPerfil("show_address", checked)
                          }
                          disabled={esPrivado}
                        />
                      </div>

                      <div className="mt-5">
                        <label className="mb-2 block text-sm text-white/80">
                          Dirección o referencia
                        </label>
                        <textarea
                          rows={3}
                          value={perfil?.address_text ?? ""}
                          onChange={(event) =>
                            actualizarPerfil("address_text", event.target.value)
                          }
                          disabled={esPrivado}
                          placeholder="Ej. Vive por el parque central de Miraflores."
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </div>
                    </section>

                    {tienePerfilMedico && (
                      <section className="rounded-[28px] border border-[#E8C547]/25 bg-[#E8C547]/10 p-5">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">
                              Perfil médico
                            </h3>
                            <p className="mt-1 text-sm leading-7 text-white/75">
                              Estas opciones están disponibles porque esta
                              mascota ya tiene el perfil médico desbloqueado.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          <ToggleFila
                            titulo="Mostrar alertas médicas y vacunas"
                            descripcion="Permite mostrar alertas médicas, mensaje de emergencia y vacunas registradas en el perfil público."
                            checked={!!perfil?.show_medical_alerts}
                            onChange={(checked) =>
                              actualizarPerfil("show_medical_alerts", checked)
                            }
                            disabled={esPrivado}
                          />
                        </div>

                        <div className="mt-5">
                          <label className="mb-2 block text-sm text-white/80">
                            Mensaje de emergencia
                          </label>
                          <textarea
                            rows={3}
                            value={perfil?.emergency_message ?? ""}
                            onChange={(event) =>
                              actualizarPerfil(
                                "emergency_message",
                                event.target.value
                              )
                            }
                            disabled={esPrivado || !perfil?.show_medical_alerts}
                            placeholder="Ej. Si necesita medicación, comunícate lo antes posible."
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-60"
                          />
                          {!perfil?.show_medical_alerts && (
                            <p className="mt-2 text-xs leading-6 text-white/55">
                              Este mensaje solo se muestra si activas las alertas
                              médicas.
                            </p>
                          )}
                        </div>
                      </section>
                    )}

                    <section>
                      <h3 className="text-xl font-semibold">
                        Mensaje para modo perdido
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/65">
                        Este mensaje es obligatorio cuando activas el modo
                        perdido.
                      </p>

                      <div
                        className={`mt-5 rounded-[24px] border p-4 ${
                          esLostMode
                            ? "border-[#E8C547]/25 bg-[#E8C547]/10"
                            : "border-white/10 bg-[#141410]"
                        }`}
                      >
                        {esLostMode && (
                          <div className="mb-3 inline-flex items-center gap-2 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/12 px-3 py-2 text-sm text-[#f6df8a]">
                            <AlertTriangle className="h-4 w-4" />
                            Este mensaje se mostrará al público cuando la
                            mascota esté en modo perdido.
                          </div>
                        )}

                        <label className="mb-2 block text-sm text-white/80">
                          Mensaje personalizado
                        </label>
                        <textarea
                          rows={4}
                          value={perfil?.lost_mode_message ?? ""}
                          onChange={(event) =>
                            actualizarPerfil(
                              "lost_mode_message",
                              event.target.value
                            )
                          }
                          placeholder="Ej. Mi mascota está perdida. Si la ves, comparte tu ubicación o comunícate de inmediato."
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                        />
                      </div>
                    </section>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                      <div className="text-sm text-white/55">
                        Los cambios se aplicarán al perfil visible al escanear la
                        placa.
                      </div>

                      <button
                        type="submit"
                        disabled={guardando || !perfil}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <CheckCircle2 className="h-4.5 w-4.5" />
                        {guardando ? "Guardando..." : "Guardar cambios"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ResumenItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function SelectorModo({
  activo,
  titulo,
  descripcion,
  onClick,
}: {
  activo: boolean;
  titulo: string;
  descripcion: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-[22px] border p-4 text-left transition ${
        activo
          ? "border-[#E8C547]/50 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410] hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold">{titulo}</div>
          <div className="mt-1 text-sm leading-7 text-white/65">
            {descripcion}
          </div>
        </div>

        <div
          className={`mt-1 h-4 w-4 rounded-full border ${
            activo ? "border-[#E8C547] bg-[#E8C547]" : "border-white/25"
          }`}
        />
      </div>
    </button>
  );
}

function ToggleFila({
  titulo,
  descripcion,
  checked,
  onChange,
  disabled = false,
}: {
  titulo: string;
  descripcion: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 rounded-[22px] border p-4 transition ${
        disabled
          ? "cursor-not-allowed border-white/8 bg-[#141410] opacity-60"
          : "cursor-pointer border-white/10 bg-[#141410] hover:bg-white/5"
      }`}
    >
      <div>
        <div className="text-base font-semibold text-white">{titulo}</div>
        <div className="mt-1 text-sm leading-7 text-white/65">{descripcion}</div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent accent-[#E8C547]"
      />
    </label>
  );
}
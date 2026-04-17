import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  HeartPulse,
  LockKeyhole,
  ShieldAlert,
  Sparkles,
  Syringe,
  Trash2,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../components/ui/CustomSelect";
import { FieldLabel, TextInput } from "../components/ui/Field";

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
  medical_profile_enabled: boolean;
};

type PetTagActivo = {
  sold_plan_type: PlanVendido;
  tag_id: string;
};

type PerfilMedico = {
  pet_id: string;
  sterilized: boolean;
  allergies_text: string | null;
  conditions_text: string | null;
  medications_text: string | null;
  dietary_notes: string | null;
};

type TagResumen = {
  code: string;
};

type TipoVacuna = {
  id: string;
  species: EspecieMascota;
  name: string;
  code: string;
  recommended_frequency_months: number | null;
  is_core: boolean;
};

type RegistroVacuna = {
  id: string;
  pet_id: string;
  vaccine_type_id: string;
  applied_on: string | null;
  expires_on: string | null;
  dose_number: number | null;
  notes: string | null;
  vaccine_types?: Relacion<TipoVacuna>;
};

type NuevaVacuna = {
  vaccine_type_id: string;
  applied_on: string;
  expires_on: string;
  dose_number: string;
  notes: string;
};

function primeraRelacion<T>(valor: Relacion<T>): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

function etiquetaPlan(plan: PlanVendido | null | undefined): string {
  if (plan === "essential") return "Essential";
  if (plan === "custom") return "Custom";
  if (plan === "partner_batch") return "Partner batch";
  if (plan === "other") return "Otro";
  return "No definido";
}

function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "No definida";

  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) return "No definida";

  return fecha.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MedicalProfile() {
  const { id } = useParams<{ id: string }>();
  const petId = id ?? "";

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoVacuna, setGuardandoVacuna] = useState(false);
  const [eliminandoVacunaId, setEliminandoVacunaId] = useState<string | null>(
    null
  );

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");

  const [mascota, setMascota] = useState<Mascota | null>(null);
  const [perfilMascota, setPerfilMascota] = useState<PerfilMascota | null>(
    null
  );
  const [tagActivo, setTagActivo] = useState<PetTagActivo | null>(null);
  const [codigoTagActivo, setCodigoTagActivo] = useState("");

  const [perfilMedico, setPerfilMedico] = useState<PerfilMedico>({
    pet_id: petId,
    sterilized: false,
    allergies_text: "",
    conditions_text: "",
    medications_text: "",
    dietary_notes: "",
  });

  const [tiposVacuna, setTiposVacuna] = useState<TipoVacuna[]>([]);
  const [vacunas, setVacunas] = useState<RegistroVacuna[]>([]);
  const [nuevaVacuna, setNuevaVacuna] = useState<NuevaVacuna>({
    vaccine_type_id: "",
    applied_on: "",
    expires_on: "",
    dose_number: "",
    notes: "",
  });

  const claseTextArea =
    "w-full rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60";

  const opcionesTiposVacuna = useMemo<CustomSelectOption[]>(() => {
    return tiposVacuna.map((tipo) => ({
      value: tipo.id,
      label: tipo.name,
      description: tipo.is_core ? "Vacuna esencial" : "Vacuna complementaria",
    }));
  }, [tiposVacuna]);

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

        if (petError || !petData) {
          throw new Error("No se pudo cargar la mascota.");
        }

        if (!montado) return;

        const mascotaActual = petData as Mascota;
        setMascota(mascotaActual);

        const [perfilRes, activeTagRes, medicalRes, vacunasRes] =
          await Promise.all([
            supabase
              .from("pet_profiles")
              .select("medical_profile_enabled")
              .eq("pet_id", petId)
              .maybeSingle(),

            supabase
              .from("pet_tags")
              .select("tag_id, sold_plan_type")
              .eq("pet_id", petId)
              .eq("status", "active")
              .order("assigned_at", { ascending: false })
              .limit(1)
              .maybeSingle(),

            supabase
              .from("pet_medical_profiles")
              .select(`
              pet_id,
              sterilized,
              allergies_text,
              conditions_text,
              medications_text,
              dietary_notes
            `)
              .eq("pet_id", petId)
              .maybeSingle(),

            supabase
              .from("pet_vaccinations")
              .select(`
              id,
              pet_id,
              vaccine_type_id,
              applied_on,
              expires_on,
              dose_number,
              notes,
              vaccine_types (
                id,
                species,
                name,
                code,
                recommended_frequency_months,
                is_core
              )
            `)
              .eq("pet_id", petId)
              .order("applied_on", { ascending: false }),
          ]);

        if (!montado) return;

        if (perfilRes.error) {
          console.error("Error cargando pet_profiles:", perfilRes.error);
          setMensajeAdvertencia(
            "No se pudo leer completamente la configuración del perfil de la mascota."
          );
        } else {
          setPerfilMascota((perfilRes.data as PerfilMascota | null) ?? null);
        }

        if (activeTagRes.error) {
          console.error("Error cargando pet_tags:", activeTagRes.error);
          setMensajeAdvertencia(
            "No se pudo cargar la placa activa de la mascota."
          );
        } else if (activeTagRes.data) {
          const tagRow = activeTagRes.data as PetTagActivo;
          setTagActivo(tagRow);

          const { data: tagData, error: tagDataError } = await supabase
            .from("tags")
            .select("code")
            .eq("id", tagRow.tag_id)
            .maybeSingle();

          if (tagDataError) {
            console.error("Error cargando código de la placa:", tagDataError);
          } else {
            setCodigoTagActivo((tagData as TagResumen | null)?.code || "");
          }
        } else {
          setTagActivo(null);
          setCodigoTagActivo("");
        }

        if (medicalRes.error) {
          console.error(
            "Error cargando pet_medical_profiles:",
            medicalRes.error
          );
          setMensajeAdvertencia(
            "No se pudo cargar el perfil médico actual. Puedes volver a intentarlo."
          );
        } else if (medicalRes.data) {
          const data = medicalRes.data as PerfilMedico;
          setPerfilMedico({
            pet_id: data.pet_id,
            sterilized: !!data.sterilized,
            allergies_text: data.allergies_text ?? "",
            conditions_text: data.conditions_text ?? "",
            medications_text: data.medications_text ?? "",
            dietary_notes: data.dietary_notes ?? "",
          });
        } else {
          setPerfilMedico({
            pet_id: petId,
            sterilized: false,
            allergies_text: "",
            conditions_text: "",
            medications_text: "",
            dietary_notes: "",
          });
        }

        if (vacunasRes.error) {
          console.error("Error cargando vacunas:", vacunasRes.error);
          setVacunas([]);
          setMensajeAdvertencia(
            "No se pudieron cargar las vacunas registradas."
          );
        } else {
          setVacunas((vacunasRes.data ?? []) as RegistroVacuna[]);
        }

        if (mascotaActual.species) {
          const { data: tiposData, error: tiposError } = await supabase
            .from("vaccine_types")
            .select(`
              id,
              species,
              name,
              code,
              recommended_frequency_months,
              is_core
            `)
            .eq("species", mascotaActual.species)
            .order("is_core", { ascending: false })
            .order("name", { ascending: true });

          if (tiposError) {
            console.error("Error cargando tipos de vacuna:", tiposError);
            setTiposVacuna([]);
            setMensajeAdvertencia(
              "No se pudieron cargar los tipos de vacuna disponibles."
            );
          } else {
            setTiposVacuna((tiposData ?? []) as TipoVacuna[]);
          }
        } else {
          setTiposVacuna([]);
        }
      } catch (error) {
        console.error("Error cargando MedicalProfile:", error);
        setMensajeError(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el perfil médico."
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

  const tieneFuncionesCustom = useMemo(() => {
    if (tagActivo?.sold_plan_type === "custom") return true;
    if (perfilMascota?.medical_profile_enabled) return true;
    return false;
  }, [tagActivo, perfilMascota]);

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

  const actualizarCampo = <K extends keyof PerfilMedico>(
    campo: K,
    valor: PerfilMedico[K]
  ) => {
    setPerfilMedico((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setMensajeError("");
    setMensajeExito("");
  };

  const actualizarNuevaVacuna = <K extends keyof NuevaVacuna>(
    campo: K,
    valor: NuevaVacuna[K]
  ) => {
    setNuevaVacuna((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setMensajeError("");
    setMensajeExito("");
  };

  const guardarPerfilMedico = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!petId) {
      setMensajeError("No se encontró la mascota.");
      return;
    }

    if (!tieneFuncionesCustom) {
      setMensajeError(
        "Esta mascota no tiene habilitado el perfil médico porque no cuenta con una placa Custom activa."
      );
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const payload = {
        pet_id: petId,
        sterilized: perfilMedico.sterilized,
        allergies_text: perfilMedico.allergies_text?.trim() || null,
        conditions_text: perfilMedico.conditions_text?.trim() || null,
        medications_text: perfilMedico.medications_text?.trim() || null,
        dietary_notes: perfilMedico.dietary_notes?.trim() || null,
      };

      const { error } = await supabase
        .from("pet_medical_profiles")
        .upsert(payload, {
          onConflict: "pet_id",
        });

      if (error) {
        throw new Error(error.message || "No se pudo guardar el perfil médico.");
      }

      setMensajeExito("Perfil médico actualizado correctamente.");
    } catch (error) {
      console.error("Error guardando perfil médico:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el perfil médico."
      );
    } finally {
      setGuardando(false);
    }
  };

  const registrarVacuna = async () => {
    if (!petId) {
      setMensajeError("No se encontró la mascota.");
      return;
    }

    if (!tieneFuncionesCustom) {
      setMensajeError("Esta mascota no tiene funciones médicas habilitadas.");
      return;
    }

    if (!nuevaVacuna.vaccine_type_id) {
      setMensajeError("Selecciona una vacuna.");
      return;
    }

    if (!nuevaVacuna.applied_on) {
      setMensajeError("Ingresa la fecha de aplicación.");
      return;
    }

    if (nuevaVacuna.dose_number.trim()) {
      const parsedDose = Number(nuevaVacuna.dose_number);
      if (Number.isNaN(parsedDose) || parsedDose <= 0) {
        setMensajeError("La dosis debe ser un número válido mayor a 0.");
        return;
      }
    }

    setGuardandoVacuna(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const { data, error } = await supabase
        .from("pet_vaccinations")
        .insert({
          pet_id: petId,
          vaccine_type_id: nuevaVacuna.vaccine_type_id,
          applied_on: nuevaVacuna.applied_on,
          expires_on: nuevaVacuna.expires_on || null,
          dose_number: nuevaVacuna.dose_number.trim()
            ? Number(nuevaVacuna.dose_number)
            : null,
          notes: nuevaVacuna.notes.trim() || null,
        })
        .select(`
          id,
          pet_id,
          vaccine_type_id,
          applied_on,
          expires_on,
          dose_number,
          notes,
          vaccine_types (
            id,
            species,
            name,
            code,
            recommended_frequency_months,
            is_core
          )
        `)
        .single();

      if (error) {
        throw new Error(error.message || "No se pudo registrar la vacuna.");
      }

      setVacunas((actuales) => [data as RegistroVacuna, ...actuales]);
      setNuevaVacuna({
        vaccine_type_id: "",
        applied_on: "",
        expires_on: "",
        dose_number: "",
        notes: "",
      });
      setMensajeExito("Vacuna registrada correctamente.");
    } catch (error) {
      console.error("Error registrando vacuna:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la vacuna."
      );
    } finally {
      setGuardandoVacuna(false);
    }
  };

  const eliminarVacuna = async (vacunaId: string) => {
    setEliminandoVacunaId(vacunaId);
    setMensajeError("");
    setMensajeExito("");

    try {
      const { error } = await supabase
        .from("pet_vaccinations")
        .delete()
        .eq("id", vacunaId);

      if (error) {
        throw new Error(error.message || "No se pudo eliminar la vacuna.");
      }

      setVacunas((actuales) =>
        actuales.filter((vacuna) => vacuna.id !== vacunaId)
      );
      setMensajeExito("Vacuna eliminada correctamente.");
    } catch (error) {
      console.error("Error eliminando vacuna:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la vacuna."
      );
    } finally {
      setEliminandoVacunaId(null);
    }
  };

  if (cargando || authLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12 text-center text-white/70">
              Cargando perfil médico...
            </div>
          </section>
        </main>
        <Footer />
      </>
    );
  }

  if (mensajeError && !mascota) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-5xl rounded-[32px] border border-red-400/20 bg-red-400/10 px-6 py-12">
              <div className="text-2xl font-semibold">
                No se pudo cargar el perfil médico
              </div>
              <p className="mt-3 text-sm leading-7 text-red-200">
                {mensajeError}
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

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={`/mis-mascotas/${petId}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                  Volver al detalle
                </Link>
              </div>

              <div className="mt-6">
                <span className="mokko-badge mokko-badge-primary w-fit">
                  Perfil médico
                </span>

                <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                  Información médica de{" "}
                  <span className="text-[#E8C547]">
                    {mascota?.name || "tu mascota"}
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  Guarda información importante para ayudar con mayor seguridad
                  en caso de extravío.
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

              <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
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
                      <ResumenItem
                        label="Perfil médico"
                        value={
                          tieneFuncionesCustom ? "Habilitado" : "No habilitado"
                        }
                      />
                    </div>
                  </section>

                  {tieneFuncionesCustom ? (
                    <section className="rounded-[32px] border border-[#E8C547]/25 bg-[#E8C547]/10 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            Función extra Custom
                          </h2>
                          <p className="mt-1 text-sm leading-7 text-white/75">
                            Esta mascota tiene desbloqueado el perfil médico
                            porque cuenta con una placa Custom activa.
                          </p>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                      <div className="flex items-center gap-3">
                        <LockKeyhole className="h-5 w-5 text-white/70" />
                        <h2 className="text-xl font-semibold">
                          Perfil médico bloqueado
                        </h2>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-white/72">
                        El perfil médico solo está disponible para mascotas con
                        una placa Custom activa.
                      </p>
                    </section>
                  )}
                </div>

                {tieneFuncionesCustom ? (
                  <div className="space-y-6">
                    <form
                      onSubmit={guardarPerfilMedico}
                      className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]"
                    >
                      <div className="space-y-6">
                        <section>
                          <div className="flex items-center gap-3">
                            <HeartPulse className="h-5 w-5 text-[#E8C547]" />
                            <h2 className="text-2xl font-semibold">
                              Datos médicos
                            </h2>
                          </div>

                          <p className="mt-2 text-sm leading-7 text-white/65">
                            Completa solo la información realmente importante.
                          </p>
                        </section>

                        <ToggleFila
                          titulo="Esterilizado"
                          descripcion="Marca esta opción si la mascota ha sido esterilizada."
                          checked={perfilMedico.sterilized}
                          onChange={(checked) =>
                            actualizarCampo("sterilized", checked)
                          }
                        />

                        <div>
                          <FieldLabel>Alergias</FieldLabel>
                          <textarea
                            rows={4}
                            value={perfilMedico.allergies_text ?? ""}
                            onChange={(event) =>
                              actualizarCampo(
                                "allergies_text",
                                event.target.value
                              )
                            }
                            placeholder="Ej. Alérgico a cierto alimento o medicamento."
                            className={claseTextArea}
                          />
                        </div>

                        <div>
                          <FieldLabel>Condiciones médicas</FieldLabel>
                          <textarea
                            rows={4}
                            value={perfilMedico.conditions_text ?? ""}
                            onChange={(event) =>
                              actualizarCampo(
                                "conditions_text",
                                event.target.value
                              )
                            }
                            placeholder="Ej. Problemas renales, cardíacos, diabetes u otra condición."
                            className={claseTextArea}
                          />
                        </div>

                        <div>
                          <FieldLabel>Medicamentos</FieldLabel>
                          <textarea
                            rows={4}
                            value={perfilMedico.medications_text ?? ""}
                            onChange={(event) =>
                              actualizarCampo(
                                "medications_text",
                                event.target.value
                              )
                            }
                            placeholder="Ej. Medicación diaria o tratamiento actual."
                            className={claseTextArea}
                          />
                        </div>

                        <div>
                          <FieldLabel>Dieta</FieldLabel>
                          <textarea
                            rows={4}
                            value={perfilMedico.dietary_notes ?? ""}
                            onChange={(event) =>
                              actualizarCampo(
                                "dietary_notes",
                                event.target.value
                              )
                            }
                            placeholder="Ej. Sin carbohidratos, dieta renal, alimento especial."
                            className={claseTextArea}
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
                          <div className="inline-flex items-center gap-2 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-2 text-sm text-[#f6df8a]">
                            <ShieldAlert className="h-4 w-4" />
                            Se mostrará solo si el perfil público permite
                            alertas médicas.
                          </div>

                          <button
                            type="submit"
                            disabled={guardando}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <CheckCircle2 className="h-4.5 w-4.5" />
                            {guardando
                              ? "Guardando..."
                              : "Guardar perfil médico"}
                          </button>
                        </div>
                      </div>
                    </form>

                    <section className="rounded-[32px] border border-[#E8C547]/25 bg-[#E8C547]/10 p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                          <Syringe className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            Vacunas
                          </h2>
                          <p className="mt-1 text-sm leading-7 text-white/75">
                            Registra las vacunas aplicadas para esta mascota.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div>
                          <FieldLabel>Tipo de vacuna</FieldLabel>
                          <CustomSelect
                            value={nuevaVacuna.vaccine_type_id}
                            onChange={(value) =>
                              actualizarNuevaVacuna("vaccine_type_id", value)
                            }
                            options={opcionesTiposVacuna}
                            placeholder="Selecciona una vacuna"
                            emptyText="No hay vacunas disponibles"
                          />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <FieldLabel>Fecha de aplicación</FieldLabel>
                            <TextInput
                              type="date"
                              value={nuevaVacuna.applied_on}
                              onChange={(event) =>
                                actualizarNuevaVacuna(
                                  "applied_on",
                                  event.target.value
                                )
                              }
                            />
                          </div>

                          <div>
                            <FieldLabel>Fecha de vencimiento</FieldLabel>
                            <TextInput
                              type="date"
                              value={nuevaVacuna.expires_on}
                              onChange={(event) =>
                                actualizarNuevaVacuna(
                                  "expires_on",
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        </div>

                        <div>
                          <FieldLabel>Número de dosis</FieldLabel>
                          <TextInput
                            type="number"
                            min="1"
                            step="1"
                            value={nuevaVacuna.dose_number}
                            onChange={(event) =>
                              actualizarNuevaVacuna(
                                "dose_number",
                                event.target.value
                              )
                            }
                            placeholder="Ej. 1"
                          />
                        </div>

                        <div>
                          <FieldLabel>Notas</FieldLabel>
                          <textarea
                            rows={3}
                            value={nuevaVacuna.notes}
                            onChange={(event) =>
                              actualizarNuevaVacuna("notes", event.target.value)
                            }
                            placeholder="Ej. Aplicada en veterinaria, reacción leve o comentario relevante."
                            className={claseTextArea}
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={registrarVacuna}
                            disabled={guardandoVacuna}
                            className="inline-flex items-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <Syringe className="h-4.5 w-4.5" />
                            {guardandoVacuna
                              ? "Guardando vacuna..."
                              : "Agregar vacuna"}
                          </button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        {vacunas.length === 0 ? (
                          <div className="rounded-[24px] border border-white/10 bg-[#141410] p-4 text-sm text-white/70">
                            Aún no hay vacunas registradas.
                          </div>
                        ) : (
                          vacunas.map((vacuna) => {
                            const tipo = primeraRelacion(vacuna.vaccine_types);

                            return (
                              <div
                                key={vacuna.id}
                                className="rounded-[24px] border border-white/10 bg-[#141410] p-4"
                              >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-base font-semibold text-white">
                                      {tipo?.name || "Vacuna"}
                                    </div>
                                    <div className="mt-1 text-sm text-white/60">
                                      {tipo?.is_core
                                        ? "Esencial"
                                        : "Complementaria"}
                                      {vacuna.dose_number != null
                                        ? ` • Dosis ${vacuna.dose_number}`
                                        : ""}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => eliminarVacuna(vacuna.id)}
                                    disabled={eliminandoVacunaId === vacuna.id}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {eliminandoVacunaId === vacuna.id
                                      ? "Eliminando..."
                                      : "Eliminar"}
                                  </button>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                  <MiniDato
                                    label="Aplicada"
                                    value={formatearFecha(vacuna.applied_on)}
                                  />
                                  <MiniDato
                                    label="Vence"
                                    value={formatearFecha(vacuna.expires_on)}
                                  />
                                </div>

                                {vacuna.notes?.trim() && (
                                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
                                    {vacuna.notes}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  </div>
                ) : (
                  <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.28)]">
                    <div className="flex items-center gap-3">
                      <LockKeyhole className="h-5 w-5 text-white/70" />
                      <h2 className="text-2xl font-semibold">
                        Acceso restringido
                      </h2>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-white/72">
                      Para habilitar el perfil médico, esta mascota debe tener
                      una placa Custom activa.
                    </p>

                    <div className="mt-6">
                      <button
                        type="button"
                        onClick={() => navigate("/pedido")}
                        className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                      >
                        Obtener placa Custom
                      </button>
                    </div>
                  </section>
                )}
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

function MiniDato({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function ToggleFila({
  titulo,
  descripcion,
  checked,
  onChange,
}: {
  titulo: string;
  descripcion: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[22px] border border-white/10 bg-[#141410] p-4 transition hover:bg-white/5">
      <div>
        <div className="text-base font-semibold text-white">{titulo}</div>
        <div className="mt-1 text-sm leading-7 text-white/65">
          {descripcion}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-white/20 bg-transparent accent-[#E8C547]"
      />
    </label>
  );
}
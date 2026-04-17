import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  PawPrint,
  Plus,
  SearchCheck,
  ShieldCheck,
  Tags,
  UserRound,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../components/ui/CustomSelect";
import { FieldLabel, TextInput } from "../components/ui/Field";

type PasoActivacion = "acceso" | "mascota" | "placa" | "listo";
type EspecieMascota = "dog" | "cat";
type ModoMascota = "existente" | "nueva";
type PlanVendido = "essential" | "custom" | "partner_batch" | "other";
type SexoMascota = "male" | "female" | "unknown";

type MascotaOpcion = {
  id: string;
  name: string;
  species?: string | null;
};

type BreedRow = {
  id: string;
  species: "dog" | "cat";
  name: string | null;
  name_es: string | null;
  is_active?: boolean | null;
};

type RespuestaActivacion = {
  success?: boolean;
  message?: string;
  sold_plan_type?: PlanVendido;
};

type RespuestaValidacionCodigo = {
  valid?: boolean;
  message?: string;
  status?: string;
  tag_id?: string;
  sold_plan_type?: PlanVendido;
};

const VALOR_RAZA_CUSTOM = "__custom__";

function etiquetaEspecieTexto(species?: string | null) {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  return "Mascota";
}

function etiquetaSexoTexto(sex?: string | null) {
  if (sex === "male") return "Macho";
  if (sex === "female") return "Hembra";
  return "No especificado";
}

function etiquetaPlan(plan?: PlanVendido | null) {
  if (plan === "essential") return "Essential";
  if (plan === "custom") return "Custom";
  if (plan === "partner_batch") return "Lote aliado";
  if (plan === "other") return "Otro";
  return "No detectado";
}

function etiquetaEstadoTag(status?: string | null) {
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
    case "active":
      return "Activa";
    case "inactive":
      return "Inactiva";
    default:
      return "No disponible";
  }
}

function normalizarCodigo(valor: string) {
  return valor.replace(/\s+/g, "").trim().toUpperCase();
}

export default function ActivateTag() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [paso, setPaso] = useState<PasoActivacion>("acceso");
  const [cargando, setCargando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validandoCodigo, setValidandoCodigo] = useState(false);

  const [mascotas, setMascotas] = useState<MascotaOpcion[]>([]);
  const [razas, setRazas] = useState<BreedRow[]>([]);

  const [mascotaSeleccionadaId, setMascotaSeleccionadaId] = useState("");
  const [modoMascota, setModoMascota] = useState<ModoMascota>("existente");

  const [nombreMascota, setNombreMascota] = useState("");
  const [especieMascota, setEspecieMascota] = useState<EspecieMascota>("dog");
  const [razaSeleccionada, setRazaSeleccionada] = useState("");
  const [razaCustom, setRazaCustom] = useState("");
  const [sexoMascota, setSexoMascota] = useState<SexoMascota>("unknown");
  const [colorMascota, setColorMascota] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [pesoMascota, setPesoMascota] = useState("");

  const [codigoPlaca, setCodigoPlaca] = useState("");
  const [codigoVerificado, setCodigoVerificado] = useState("");
  const [tagIdVerificado, setTagIdVerificado] = useState<string | null>(null);
  const [tipoDetectado, setTipoDetectado] = useState<PlanVendido | null>(null);
  const [tipoActivado, setTipoActivado] = useState<PlanVendido | null>(null);
  const [estadoDetectado, setEstadoDetectado] = useState<string | null>(null);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [mensajeAviso, setMensajeAviso] = useState("");

  const mascotaSeleccionada = useMemo(
    () => mascotas.find((mascota) => mascota.id === mascotaSeleccionadaId) ?? null,
    [mascotas, mascotaSeleccionadaId]
  );

  const numeroPaso = useMemo(() => {
    if (paso === "acceso") return 1;
    if (paso === "mascota") return 2;
    if (paso === "placa") return 3;
    return 4;
  }, [paso]);

  const opcionesEspecie = useMemo<CustomSelectOption[]>(
    () => [
      { value: "dog", label: "Perro" },
      { value: "cat", label: "Gato" },
    ],
    []
  );

  const opcionesSexo = useMemo<CustomSelectOption[]>(
    () => [
      { value: "unknown", label: "No especificado" },
      { value: "male", label: "Macho" },
      { value: "female", label: "Hembra" },
    ],
    []
  );

  const opcionesMascotas = useMemo<CustomSelectOption[]>(() => {
    return mascotas.map((mascota) => ({
      value: mascota.id,
      label: mascota.name,
      description: etiquetaEspecieTexto(mascota.species),
    }));
  }, [mascotas]);

  const opcionesRaza = useMemo<CustomSelectOption[]>(() => {
    const base = razas
      .filter((raza) => raza.species === especieMascota)
      .map((raza) => ({
        value: raza.id,
        label: raza.name_es?.trim() || raza.name?.trim() || "Raza",
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return [
      ...base,
      { value: VALOR_RAZA_CUSTOM, label: "No encuentro la raza" },
    ];
  }, [razas, especieMascota]);

  const limpiarEstadoCodigo = () => {
    setCodigoVerificado("");
    setTagIdVerificado(null);
    setTipoDetectado(null);
    setEstadoDetectado(null);
  };

  const limpiarFormularioMascota = () => {
    setNombreMascota("");
    setEspecieMascota("dog");
    setRazaSeleccionada("");
    setRazaCustom("");
    setSexoMascota("unknown");
    setColorMascota("");
    setFechaNacimiento("");
    setPesoMascota("");
  };

  useEffect(() => {
    if (authLoading) return;

    let montado = true;

    const cargarDatos = async () => {
      if (!montado) return;

      setCargando(true);
      setMensajeError("");
      setMensajeExito("");
      setMensajeAviso("");

      try {
        if (!user) {
          setMascotas([]);
          setMascotaSeleccionadaId("");
          setPaso("acceso");
          return;
        }

        const warnings: string[] = [];

        const { data: petsData, error: petsError } = await supabase
          .from("pets")
          .select("id, name, species")
          .eq("owner_user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (petsError) {
          throw new Error(`No se pudieron cargar tus mascotas: ${petsError.message}`);
        }

        const { data: breedsData, error: breedsError } = await supabase
          .from("pet_breeds")
          .select("id, species, name, name_es, is_active")
          .eq("is_active", true)
          .in("species", ["dog", "cat"])
          .order("is_popular", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("name_es", { ascending: true });

        if (breedsError) {
          warnings.push(`No se pudieron cargar las razas: ${breedsError.message}`);
        }

        if (!montado) return;

        const mascotasNormalizadas = (petsData ?? []) as MascotaOpcion[];
        const razasNormalizadas = (breedsData ?? []) as BreedRow[];

        setMascotas(mascotasNormalizadas);
        setRazas(razasNormalizadas);

        if (mascotasNormalizadas.length > 0) {
          setMascotaSeleccionadaId((actual) => {
            if (
              actual &&
              mascotasNormalizadas.some((mascota) => mascota.id === actual)
            ) {
              return actual;
            }
            return mascotasNormalizadas[0].id;
          });
          setModoMascota("existente");
        } else {
          setMascotaSeleccionadaId("");
          setModoMascota("nueva");
        }

        setPaso((previo) => (previo === "listo" ? "listo" : "mascota"));
        setMensajeAviso(warnings.join(" "));
      } catch (error) {
        console.error("Error cargando ActivateTag:", error);

        if (!montado) return;

        setMensajeError(
          error instanceof Error
            ? error.message
            : "Ocurrió un error cargando la activación."
        );
      } finally {
        if (montado) setCargando(false);
      }
    };

    void cargarDatos();

    return () => {
      montado = false;
    };
  }, [authLoading, user]);

  const irAPasoMascota = () => {
    setMensajeError("");
    setMensajeExito("");
    setPaso("mascota");
  };

  const continuarConMascota = () => {
    if (!mascotaSeleccionadaId) {
      setMensajeError("Selecciona una mascota para continuar.");
      return;
    }

    setMensajeError("");
    setMensajeExito("");
    setPaso("placa");
  };

  const crearMascota = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setMensajeError("No hay una sesión activa.");
      return;
    }

    if (!nombreMascota.trim()) {
      setMensajeError("Ingresa el nombre de tu mascota.");
      return;
    }

    if (!razaSeleccionada) {
      setMensajeError("Selecciona una raza.");
      return;
    }

    if (razaSeleccionada === VALOR_RAZA_CUSTOM && !razaCustom.trim()) {
      setMensajeError("Ingresa la raza personalizada.");
      return;
    }

    let pesoNumerico: number | null = null;

    if (pesoMascota.trim()) {
      const textoPeso = pesoMascota.replace(",", ".");
      const valor = Number(textoPeso);

      if (!Number.isFinite(valor) || valor <= 0) {
        setMensajeError("Ingresa un peso válido.");
        return;
      }

      pesoNumerico = valor;
    }

    setSubmitting(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const { data, error } = await supabase
        .from("pets")
        .insert({
          owner_user_id: user.id,
          name: nombreMascota.trim(),
          species: especieMascota,
          breed_id: razaSeleccionada === VALOR_RAZA_CUSTOM ? null : razaSeleccionada,
          breed_custom:
            razaSeleccionada === VALOR_RAZA_CUSTOM ? razaCustom.trim() : null,
          sex: sexoMascota,
          color: colorMascota.trim() || null,
          birthdate: fechaNacimiento || null,
          weight_kg: pesoNumerico,
        })
        .select("id, name, species")
        .single();

      if (error) throw new Error(error.message);

      const nuevaMascota = data as MascotaOpcion;

      setMascotas((previas) => [nuevaMascota, ...previas]);
      setMascotaSeleccionadaId(nuevaMascota.id);
      limpiarFormularioMascota();
      setModoMascota("existente");
      setPaso("placa");
    } catch (error) {
      console.error("Error creando mascota:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo registrar la mascota."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const verificarCodigo = async () => {
    const codigoNormalizado = normalizarCodigo(codigoPlaca);

    if (!codigoNormalizado) {
      setMensajeError("Ingresa el código de tu placa.");
      return false;
    }

    if (!/^[A-Z0-9]{6}$/.test(codigoNormalizado)) {
      setMensajeError("El código debe tener 6 caracteres alfanuméricos.");
      return false;
    }

    setValidandoCodigo(true);
    setMensajeError("");
    setMensajeExito("");
    limpiarEstadoCodigo();

    try {
      const { data, error } = await supabase.rpc("check_tag_code", {
        p_tag_code: codigoNormalizado,
      });

      if (error) throw new Error(error.message);

      const respuesta = data as RespuestaValidacionCodigo | null;

      if (!respuesta?.valid) {
        const estado = respuesta?.status || null;

        let mensaje = respuesta?.message || "La placa no está disponible.";

        if (estado === "activated") {
          mensaje = "Esta placa ya fue activada.";
        } else if (estado === "reserved") {
          mensaje = "Esta placa está reservada.";
        } else if (estado === "suspended") {
          mensaje = "Esta placa está suspendida.";
        } else if (estado === "lost") {
          mensaje = "Esta placa figura como extraviada.";
        } else if (estado === "retired") {
          mensaje = "Esta placa fue retirada.";
        }

        setMensajeError(mensaje);
        setEstadoDetectado(estado);
        setTipoDetectado(respuesta?.sold_plan_type || null);
        return false;
      }

      setCodigoVerificado(codigoNormalizado);
      setTagIdVerificado(respuesta.tag_id || null);
      setTipoDetectado(respuesta.sold_plan_type || null);
      setEstadoDetectado(respuesta.status || null);
      setMensajeExito("Código verificado correctamente.");
      return true;
    } catch (error) {
      console.error("Error verificando código:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo verificar el código."
      );
      return false;
    } finally {
      setValidandoCodigo(false);
    }
  };

  const activarPlaca = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mascotaSeleccionadaId) {
      setMensajeError("Selecciona una mascota.");
      return;
    }

    const codigoNormalizado = normalizarCodigo(codigoPlaca);

    if (!codigoNormalizado) {
      setMensajeError("Ingresa el código de tu placa.");
      return;
    }

    let codigoListo = codigoVerificado === codigoNormalizado && !!tagIdVerificado;

    if (!codigoListo) {
      const verificado = await verificarCodigo();
      if (!verificado) return;
      codigoListo = true;
    }

    if (!codigoListo) {
      setMensajeError("Primero verifica el código de la placa.");
      return;
    }

    setSubmitting(true);
    setMensajeError("");
    setMensajeExito("");

    try {
      const { data, error } = await supabase.rpc("activate_tag_for_pet", {
        p_tag_code: codigoNormalizado,
        p_pet_id: mascotaSeleccionadaId,
      });

      if (error) throw new Error(error.message);

      const respuesta = data as RespuestaActivacion | null;

      if (respuesta?.success === false) {
        setMensajeError(respuesta.message || "No se pudo activar la placa.");
        return;
      }

      const planFinal = respuesta?.sold_plan_type || tipoDetectado || null;

      setTipoActivado(planFinal);
      setCodigoPlaca("");
      setMensajeExito(respuesta?.message || "Placa activada correctamente.");
      setPaso("listo");
    } catch (error) {
      console.error("Error activando placa:", error);
      setMensajeError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error activando la placa."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const activarOtra = () => {
    setCodigoPlaca("");
    limpiarEstadoCodigo();
    setTipoActivado(null);
    setMensajeExito("");
    setMensajeError("");
    setPaso("placa");
  };

  const cargandoGeneral = authLoading || cargando;
  const puedeRegistrarNueva = razas.length > 0;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.16),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-5xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Activación de placa Mokko
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                Activa tu placa <span className="text-[#E8C547]">paso a paso</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                Elige o registra una mascota, verifica el código de la placa y
                termina la activación en pocos pasos.
              </p>
            </div>

            <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-4">
              {[
                { n: 1, label: "Acceso", icon: UserRound },
                { n: 2, label: "Mascota", icon: PawPrint },
                { n: 3, label: "Placa", icon: KeyRound },
                { n: 4, label: "Listo", icon: CheckCircle2 },
              ].map((item) => {
                const activo = numeroPaso === item.n;
                const completado = numeroPaso > item.n;
                const Icon = item.icon;

                return (
                  <div
                    key={item.n}
                    className={`rounded-[22px] border px-4 py-4 transition ${
                      activo
                        ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                        : completado
                        ? "border-[#2D5A27]/60 bg-[#12311c]"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          activo
                            ? "bg-[#E8C547] text-[#1A1A14]"
                            : completado
                            ? "bg-[#2D5A27] text-white"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                          Paso {item.n}
                        </div>
                        <div className="text-sm font-medium">{item.label}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-8 max-w-5xl rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_25px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:p-6">
              {cargandoGeneral && (
                <div className="py-16 text-center text-white/70">Cargando...</div>
              )}

              {!cargandoGeneral && mensajeError && (
                <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {mensajeError}
                </div>
              )}

              {!cargandoGeneral && mensajeAviso && !mensajeError && (
                <div className="mb-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                  {mensajeAviso}
                </div>
              )}

              {!cargandoGeneral && mensajeExito && paso !== "listo" && (
                <div className="mb-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                  {mensajeExito}
                </div>
              )}

              {!cargandoGeneral && paso === "acceso" && (
                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                      <ShieldCheck className="h-5 w-5" />
                    </div>

                    <h2 className="mt-5 text-2xl font-semibold">
                      Antes de activar tu placa
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-white/70">
                      Necesitas una cuenta Mokko para vincular la placa a tu
                      mascota y gestionar todo desde tu panel.
                    </p>

                    <div className="mt-6 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm font-medium text-white">
                          ¿Ya tienes cuenta?
                        </div>
                        <div className="mt-2 text-sm leading-7 text-white/65">
                          Inicia sesión y continúa con la activación.
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-sm font-medium text-white">
                          ¿Eres nuevo?
                        </div>
                        <div className="mt-2 text-sm leading-7 text-white/65">
                          Crea tu cuenta primero y vuelve para activar la placa.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-[#141410] p-6">
                    <h3 className="text-2xl font-semibold">Continúa con tu activación</h3>
                    <p className="mt-2 text-sm leading-7 text-white/65">
                      Elige la opción que corresponda para seguir con el flujo.
                    </p>

                    <div className="mt-8 grid gap-4">
                      <Link
                        to="/login?next=/activar"
                        className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">Ya tengo cuenta</div>
                            <div className="mt-1 text-sm text-white/65">
                              Ir a iniciar sesión
                            </div>
                          </div>
                          <ChevronRight className="h-4.5 w-4.5 text-white/40 transition group-hover:text-white/70" />
                        </div>
                      </Link>

                      <Link
                        to="/register?next=/activar"
                        className="group rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold">Soy nuevo</div>
                            <div className="mt-1 text-sm text-white/65">
                              Crear cuenta Mokko
                            </div>
                          </div>
                          <ChevronRight className="h-4.5 w-4.5 text-white/40 transition group-hover:text-white/70" />
                        </div>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {!cargandoGeneral && paso === "mascota" && (
                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2D5A27] text-white">
                      <PawPrint className="h-5 w-5" />
                    </div>

                    <h2 className="mt-5 text-2xl font-semibold">
                      Elige o registra tu mascota
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-white/70">
                      Antes de activar la placa, necesitamos saber a qué mascota
                      estará vinculada.
                    </p>

                    {(profile || user) && (
                      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Cuenta activa
                        </div>
                        <div className="mt-2 text-base font-semibold">
                          {profile?.full_name ||
                            profile?.email ||
                            user?.email ||
                            "Usuario autenticado"}
                        </div>
                      </div>
                    )}

                    {mascotaSeleccionada && modoMascota === "existente" && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Selección actual
                        </div>
                        <div className="mt-2 text-base font-semibold">
                          {mascotaSeleccionada.name}
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          {etiquetaEspecieTexto(mascotaSeleccionada.species)}
                        </div>
                      </div>
                    )}

                    {modoMascota === "nueva" && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Resumen rápido
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-white/75">
                          <div>
                            <span className="text-white/45">Especie:</span>{" "}
                            {etiquetaEspecieTexto(especieMascota)}
                          </div>
                          <div>
                            <span className="text-white/45">Sexo:</span>{" "}
                            {etiquetaSexoTexto(sexoMascota)}
                          </div>
                          <div>
                            <span className="text-white/45">Raza:</span>{" "}
                            {razaSeleccionada === VALOR_RAZA_CUSTOM
                              ? razaCustom || "Pendiente"
                              : opcionesRaza.find((item) => item.value === razaSeleccionada)
                                  ?.label || "Pendiente"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-[#141410] p-6">
                    <div className="flex flex-wrap gap-3">
                      {mascotas.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setModoMascota("existente");
                            setMensajeError("");
                          }}
                          className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                            modoMascota === "existente"
                              ? "bg-[#E8C547] text-[#1A1A14]"
                              : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                          }`}
                        >
                          Elegir una existente
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setModoMascota("nueva");
                          setMensajeError("");
                        }}
                        disabled={!puedeRegistrarNueva}
                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                          modoMascota === "nueva"
                            ? "bg-[#E8C547] text-[#1A1A14]"
                            : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        <Plus className="h-4 w-4" />
                        Registrar nueva
                      </button>
                    </div>

                    {mascotas.length > 0 && modoMascota === "existente" && (
                      <div className="mt-6 space-y-4">
                        <div>
                          <h3 className="text-2xl font-semibold">Tus mascotas</h3>
                          <p className="mt-2 text-sm leading-7 text-white/65">
                            Selecciona la mascota a la que quieres vincular esta placa.
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {mascotas.map((mascota) => {
                            const seleccionada = mascotaSeleccionadaId === mascota.id;

                            return (
                              <button
                                key={mascota.id}
                                type="button"
                                onClick={() => setMascotaSeleccionadaId(mascota.id)}
                                className={`rounded-[22px] border p-4 text-left transition ${
                                  seleccionada
                                    ? "border-[#E8C547]/50 bg-[#E8C547]/10"
                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-base font-semibold">
                                      {mascota.name}
                                    </div>
                                    <div className="mt-1 text-sm text-white/60">
                                      {etiquetaEspecieTexto(mascota.species)}
                                    </div>
                                  </div>

                                  <div
                                    className={`h-4 w-4 rounded-full border ${
                                      seleccionada
                                        ? "border-[#E8C547] bg-[#E8C547]"
                                        : "border-white/25"
                                    }`}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={continuarConMascota}
                          className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                        >
                          Continuar con esta mascota
                        </button>
                      </div>
                    )}

                    {modoMascota === "nueva" && (
                      <form onSubmit={crearMascota} className="mt-6 space-y-5">
                        <div>
                          <h3 className="text-2xl font-semibold">Datos de tu mascota</h3>
                          <p className="mt-2 text-sm leading-7 text-white/65">
                            Completa lo básico ahora. Luego podrás editar más detalles
                            desde tu dashboard.
                          </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <FieldLabel>Nombre</FieldLabel>
                            <TextInput
                              type="text"
                              value={nombreMascota}
                              onChange={(e) => {
                                setNombreMascota(e.target.value);
                                setMensajeError("");
                              }}
                              placeholder="Max"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <FieldLabel>Especie</FieldLabel>
                            <CustomSelect
                              value={especieMascota}
                              onChange={(value) => {
                                setEspecieMascota(value as EspecieMascota);
                                setRazaSeleccionada("");
                                setRazaCustom("");
                                setMensajeError("");
                              }}
                              options={opcionesEspecie}
                              placeholder="Selecciona una especie"
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <FieldLabel>Sexo</FieldLabel>
                            <CustomSelect
                              value={sexoMascota}
                              onChange={(value) => {
                                setSexoMascota(value as SexoMascota);
                                setMensajeError("");
                              }}
                              options={opcionesSexo}
                              placeholder="Selecciona una opción"
                              disabled={submitting}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <FieldLabel>Raza</FieldLabel>
                            <CustomSelect
                              value={razaSeleccionada}
                              onChange={(value) => {
                                setRazaSeleccionada(value);
                                if (value !== VALOR_RAZA_CUSTOM) {
                                  setRazaCustom("");
                                }
                                setMensajeError("");
                              }}
                              options={opcionesRaza}
                              placeholder="Selecciona una raza"
                              disabled={submitting || opcionesRaza.length === 0}
                            />
                          </div>

                          {razaSeleccionada === VALOR_RAZA_CUSTOM && (
                            <div className="md:col-span-2">
                              <FieldLabel>Raza personalizada</FieldLabel>
                              <TextInput
                                type="text"
                                value={razaCustom}
                                onChange={(e) => {
                                  setRazaCustom(e.target.value);
                                  setMensajeError("");
                                }}
                                placeholder="Escribe la raza"
                                disabled={submitting}
                              />
                            </div>
                          )}

                          <div>
                            <FieldLabel>Color</FieldLabel>
                            <TextInput
                              type="text"
                              value={colorMascota}
                              onChange={(e) => {
                                setColorMascota(e.target.value);
                                setMensajeError("");
                              }}
                              placeholder="Blanco, marrón, negro..."
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <FieldLabel>Fecha de nacimiento</FieldLabel>
                            <TextInput
                              type="date"
                              value={fechaNacimiento}
                              onChange={(e) => {
                                setFechaNacimiento(e.target.value);
                                setMensajeError("");
                              }}
                              disabled={submitting}
                            />
                          </div>

                          <div>
                            <FieldLabel>Peso (kg)</FieldLabel>
                            <TextInput
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="0.1"
                              value={pesoMascota}
                              onChange={(e) => {
                                setPesoMascota(e.target.value);
                                setMensajeError("");
                              }}
                              placeholder="12.5"
                              disabled={submitting}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {mascotas.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setModoMascota("existente");
                                setMensajeError("");
                              }}
                              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                            >
                              Volver
                            </button>
                          )}

                          <button
                            type="submit"
                            disabled={submitting || !puedeRegistrarNueva}
                            className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {submitting ? "Guardando..." : "Guardar mascota y continuar"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}

              {!cargandoGeneral && paso === "placa" && (
                <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                      <Tags className="h-5 w-5" />
                    </div>

                    <h2 className="mt-5 text-2xl font-semibold">Activa tu placa</h2>

                    <p className="mt-3 text-sm leading-7 text-white/70">
                      Ingresa el código único de tu placa Mokko. El sistema detectará
                      automáticamente el tipo de placa.
                    </p>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Mascota seleccionada
                        </div>
                        <div className="mt-2 text-lg font-semibold">
                          {mascotaSeleccionada?.name || "Sin seleccionar"}
                        </div>
                        {mascotaSeleccionada?.species && (
                          <div className="mt-1 text-sm text-white/65">
                            {etiquetaEspecieTexto(mascotaSeleccionada.species)}
                          </div>
                        )}
                      </div>

                      {(profile || user) && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                            Sesión activa
                          </div>
                          <div className="mt-2 text-sm font-medium text-white/80">
                            {profile?.full_name ||
                              profile?.email ||
                              user?.email ||
                              "Usuario autenticado"}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Tipo detectado
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-base font-semibold">
                          {tipoDetectado ? (
                            <>
                              <BadgeCheck className="h-4.5 w-4.5 text-[#E8C547]" />
                              {etiquetaPlan(tipoDetectado)}
                            </>
                          ) : (
                            <span className="text-white/50">Aún no verificado</span>
                          )}
                        </div>

                        {estadoDetectado && (
                          <div className="mt-2 text-sm text-white/60">
                            Estado detectado: {etiquetaEstadoTag(estadoDetectado)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-[#141410] p-6">
                    <form onSubmit={activarPlaca} className="space-y-4">
                      <div>
                        <h3 className="text-2xl font-semibold">Código de activación</h3>
                        <p className="mt-2 text-sm leading-7 text-white/65">
                          El código debe coincidir con el impreso en tu placa o en su
                          empaque.
                        </p>
                      </div>

                      {mascotas.length > 0 && (
                        <div>
                          <FieldLabel>Mascota</FieldLabel>
                          <CustomSelect
                            value={mascotaSeleccionadaId}
                            onChange={setMascotaSeleccionadaId}
                            options={opcionesMascotas}
                            placeholder="Selecciona una mascota"
                            disabled={submitting}
                          />
                        </div>
                      )}

                      <div>
                        <FieldLabel>Código de placa</FieldLabel>
                        <TextInput
                          type="text"
                          value={codigoPlaca}
                          onChange={(e) => {
                            setCodigoPlaca(normalizarCodigo(e.target.value));
                            setMensajeError("");
                            setMensajeExito("");
                            limpiarEstadoCodigo();
                          }}
                          className="uppercase tracking-[0.18em]"
                          placeholder="ABC123"
                          maxLength={6}
                          disabled={submitting || validandoCodigo}
                        />
                        <p className="mt-2 text-xs text-white/45">
                          Usa los 6 caracteres del código de tu placa.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={verificarCodigo}
                          disabled={validandoCodigo || submitting}
                          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <SearchCheck className="h-4.5 w-4.5" />
                          {validandoCodigo ? "Verificando..." : "Verificar código"}
                        </button>
                      </div>

                      {tipoDetectado && (
                        <div className="rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-4 text-sm text-[#f6df8a]">
                          Tipo detectado automáticamente:{" "}
                          <span className="font-semibold text-white">
                            {etiquetaPlan(tipoDetectado)}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={irAPasoMascota}
                          className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                        >
                          Volver
                        </button>

                        <button
                          type="submit"
                          disabled={
                            submitting ||
                            !mascotaSeleccionadaId ||
                            !codigoVerificado ||
                            codigoVerificado !== normalizarCodigo(codigoPlaca)
                          }
                          className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {submitting ? "Activando..." : "Activar placa"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {!cargandoGeneral && paso === "listo" && (
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#2D5A27] text-white">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>

                  <h2 className="mt-6 text-3xl font-semibold">
                    Tu placa fue activada
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    La placa quedó vinculada a{" "}
                    <span className="font-semibold text-white">
                      {mascotaSeleccionada?.name || "tu mascota"}
                    </span>
                    .
                  </p>

                  {mensajeExito && (
                    <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                      {mensajeExito}
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/75">
                    Tipo activado:{" "}
                    <span className="font-semibold text-white">
                      {etiquetaPlan(tipoActivado)}
                    </span>
                  </div>

                  <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={activarOtra}
                      className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                    >
                      Activar otra placa
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                    >
                      Ir a mi dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
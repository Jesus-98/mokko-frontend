import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  HeartPulse,
  LockKeyhole,
  MapPinned,
  Shield,
  TriangleAlert,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import FoundReportPanel from "../components/public/FoundReportPanel";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import PhoneIcon from "../components/icons/PhoneIcon";
import { supabase } from "../lib/supabase";

type FuenteEscaneo = "qr" | "nfc" | "manual" | "unknown";
type VisibilidadPerfil = "public" | "private" | "lost_mode";

type RespuestaPerfilPublico = {
  success: boolean;
  message?: string | null;
  not_found?: boolean;
  tag_id?: string | null;
  tag_code?: string | null;
  tag_status?: string | null;
  tag_lost_message?: string | null;
  is_assigned?: boolean;
  visibility_status?: VisibilidadPerfil | null;
  sold_plan_type?: string | null;
  pet?: {
    id: string;
    name: string;
    species: string | null;
    breed: string | null;
    sex: string | null;
    color: string | null;
    photo_url: string | null;
  } | null;
  profile?: {
    message: string | null;
    lost_mode_message: string | null;
    emergency_message: string | null;
    allow_found_reports: boolean;
    lost_mode_activated_at: string | null;
  } | null;
  owner?: {
    full_name: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
    address_text: string | null;
  } | null;
  medical?: {
    enabled: boolean;
    sterilized: boolean | null;
    allergies_text: string | null;
    conditions_text: string | null;
    medications_text: string | null;
    dietary_notes: string | null;
    vaccinations?: {
      id: string;
      vaccine_name: string | null;
      applied_at: string | null;
      next_due_at: string | null;
      dose_number: number | null;
      notes: string | null;
    }[] | null;
  } | null;
};

function isTagUnavailable(status?: string | null) {
  return status === "lost" || status === "suspended" || status === "retired";
}

function getUnavailableTitle(status?: string | null, fallback?: string | null) {
  switch (status) {
    case "lost":
      return "Esta placa fue reportada como extraviada.";
    case "suspended":
      return "Esta placa está suspendida temporalmente.";
    case "retired":
      return "Esta placa fue retirada.";
    default:
      return fallback?.trim() || "Esta placa no está disponible.";
  }
}

function getUnavailableAccent(status?: string | null) {
  switch (status) {
    case "lost":
      return {
        badge: "border-orange-400/20 bg-orange-400/10 text-orange-200",
        panel: "border-orange-400/20 bg-orange-400/10 text-orange-100",
        title: "text-orange-100",
        dot: "bg-orange-300",
      };

    case "suspended":
      return {
        badge: "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]",
        panel: "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]",
        title: "text-[#F5F0E8]",
        dot: "bg-[#E8C547]",
      };

    case "retired":
      return {
        badge: "border-red-400/20 bg-red-400/10 text-red-200",
        panel: "border-red-400/20 bg-red-400/10 text-red-100",
        title: "text-red-100",
        dot: "bg-red-300",
      };

    default:
      return {
        badge: "border-white/10 bg-white/[0.05] text-white/70",
        panel: "border-white/10 bg-white/[0.04] text-white/80",
        title: "text-white",
        dot: "bg-white/40",
      };
  }
}

function getUnavailableStateLabel(status?: string | null) {
  switch (status) {
    case "lost":
      return "Placa extraviada";
    case "suspended":
      return "Placa suspendida";
    case "retired":
      return "Placa retirada";
    default:
      return "Placa no disponible";
  }
}

function getEtiquetaSexo(sex?: string | null) {
  const valor = sex?.trim().toLowerCase();

  if (!valor) return null;
  if (valor === "male" || valor === "m" || valor === "macho") return "Macho";
  if (valor === "female" || valor === "f" || valor === "hembra") {
    return "Hembra";
  }
  if (valor === "unknown" || valor === "desconocido") return "No especificado";

  return sex;
}

function formatearFecha(fecha?: string | null) {
  if (!fecha) return "No registrada";

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) return fecha;

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function tieneTexto(value?: string | null) {
  return !!value?.trim();
}

function limpiarTelefonoParaWhatsapp(value: string) {
  return value.replace(/\D/g, "");
}

function limpiarTelefonoParaLlamada(value: string) {
  return value.replace(/\s+/g, "");
}

export default function PublicProfile() {
  const { code } = useParams<{ code: string }>();

  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeAdvertencia, setMensajeAdvertencia] = useState("");
  const [datos, setDatos] = useState<RespuestaPerfilPublico | null>(null);

  const escaneoInicialRegistradoRef = useRef(false);

  const fuenteEscaneo: FuenteEscaneo = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");

    if (source === "qr") return "qr";
    if (source === "nfc") return "nfc";
    if (source === "manual") return "manual";

    return "unknown";
  }, []);

  useEffect(() => {
    if (!code) return;
    void cargarPerfil(code);
  }, [code, fuenteEscaneo]);

  const cargarPerfil = async (codigoCrudo: string) => {
    setCargando(true);
    setMensajeError("");
    setMensajeAdvertencia("");

    try {
      const codigoNormalizado = codigoCrudo.trim().toUpperCase();

      const { data: rpcData, error } = await supabase.rpc(
        "get_public_pet_profile_by_tag_code",
        {
          p_tag_code: codigoNormalizado,
        }
      );

      if (error) throw error;

      const perfilData = rpcData as RespuestaPerfilPublico | null;

      if (!perfilData) {
        throw new Error("No se recibió respuesta del perfil público.");
      }

      setDatos(perfilData);

      const placaNoDisponiblePorEstado = isTagUnavailable(
        perfilData.tag_status
      );
      const esPlacaSinActivar = perfilData.is_assigned === false;

      if (
        !perfilData.success &&
        !esPlacaSinActivar &&
        !placaNoDisponiblePorEstado
      ) {
        setMensajeError(
          perfilData.message?.trim() || "No se pudo cargar el perfil público."
        );
        return;
      }

      if (
        !escaneoInicialRegistradoRef.current &&
        perfilData.is_assigned &&
        perfilData.tag_id &&
        perfilData.pet?.id
      ) {
        try {
          await supabase.from("scan_events").insert({
            tag_id: perfilData.tag_id,
            pet_id: perfilData.pet.id,
            source: fuenteEscaneo,
            shared_location: false,
          });

          escaneoInicialRegistradoRef.current = true;
        } catch (scanError) {
          console.error("Error registrando visita inicial:", scanError);
          setMensajeAdvertencia(
            "El perfil cargó correctamente, pero no se pudo registrar la visita inicial."
          );
        }
      }
    } catch (error) {
      console.error("Error cargando perfil público:", error);

      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el perfil público."
      );
      setDatos(null);
    } finally {
      setCargando(false);
    }
  };

  const visibilidad = datos?.visibility_status ?? "public";
  const esPrivado = visibilidad === "private";
  const esLostMode = visibilidad === "lost_mode";

  const mascota = datos?.pet ?? null;
  const perfil = datos?.profile ?? null;
  const dueno = datos?.owner ?? null;
  const medico = datos?.medical ?? null;

  const vacunas = Array.isArray(medico?.vaccinations)
    ? medico.vaccinations
    : [];

  const estadoPlaca = datos?.tag_status ?? null;
  const placaNoDisponible = isTagUnavailable(estadoPlaca);
  const placaSinActivar = datos?.is_assigned === false;

  const tituloPlacaNoDisponible = getUnavailableTitle(
    estadoPlaca,
    datos?.message
  );
  const mensajePlacaNoDisponible =
    estadoPlaca === "lost" ? datos?.tag_lost_message?.trim() || null : null;
  const unavailableAccent = getUnavailableAccent(estadoPlaca);
  const unavailableStateLabel = getUnavailableStateLabel(estadoPlaca);

  const numeroWhatsapp = dueno?.whatsapp_phone || dueno?.phone || "";
  const numeroLlamada = dueno?.phone || dueno?.whatsapp_phone || "";

  const mensajeWhatsapp = encodeURIComponent(
    esLostMode
      ? "Hola, vi a tu mascota y te escribo desde su placa Mokko para ayudarte a ubicarla."
      : "Hola, encontré a tu mascota y te escribo desde su placa Mokko."
  );

  const whatsappUrl = numeroWhatsapp
    ? `https://wa.me/${limpiarTelefonoParaWhatsapp(
        numeroWhatsapp
      )}?text=${mensajeWhatsapp}`
    : "";

  const callUrl = numeroLlamada
    ? `tel:${limpiarTelefonoParaLlamada(numeroLlamada)}`
    : "";

  const mostrarWhatsapp = !esPrivado && !!whatsappUrl;
  const mostrarLlamada = !esPrivado && !!callUrl;

  const etiquetaEspecie = useMemo(() => {
    if (mascota?.species === "dog") return "Perro";
    if (mascota?.species === "cat") return "Gato";
    if (mascota?.species === "other") return "Mascota";

    return null;
  }, [mascota?.species]);

  const etiquetaSexo = useMemo(() => {
    return getEtiquetaSexo(mascota?.sex);
  }, [mascota?.sex]);

  const itemsInfoPublica = useMemo(() => {
    if (!mascota || esPrivado) return [];

    const items = [
      { label: "Especie", value: etiquetaEspecie },
      { label: "Raza", value: mascota.breed || null },
      { label: "Sexo", value: etiquetaSexo },
      { label: "Color", value: mascota.color || null },
      { label: "Dueño", value: dueno?.full_name || null },
      { label: "Teléfono", value: dueno?.phone || null },
      { label: "WhatsApp", value: dueno?.whatsapp_phone || null },
      { label: "Dirección / referencia", value: dueno?.address_text || null },
    ];

    return items.filter(
      (item): item is { label: string; value: string } =>
        !!item.value && item.value.trim().length > 0
    );
  }, [mascota, dueno, etiquetaEspecie, etiquetaSexo, esPrivado]);

  const mensajePrincipal = esLostMode
    ? perfil?.lost_mode_message?.trim() ||
      perfil?.message?.trim() ||
      "Si viste a esta mascota, por favor contacta a su familia lo antes posible."
    : esPrivado
    ? "Este perfil protege la información de la familia. Puedes ayudar enviando tu ubicación o un reporte."
    : perfil?.message?.trim() ||
      "Si encontraste a esta mascota, por favor contacta a su dueño.";

  const mostrarVacunas =
    !esPrivado &&
    !!medico?.enabled &&
    Array.isArray(vacunas) &&
    vacunas.length > 0;

  const mostrarSeccionMedica =
    !esPrivado &&
    !!medico?.enabled &&
    !!(
      tieneTexto(medico?.allergies_text) ||
      tieneTexto(medico?.conditions_text) ||
      tieneTexto(medico?.medications_text) ||
      tieneTexto(medico?.dietary_notes) ||
      medico?.sterilized !== null ||
      mostrarVacunas
    );

  const hayContenidoMostrable =
    !!datos &&
    !datos.not_found &&
    (placaNoDisponible ||
      placaSinActivar ||
      !!mascota ||
      !!datos.message?.trim());

  const mostrarAccionesFijas =
    !!datos &&
    !cargando &&
    !placaNoDisponible &&
    !placaSinActivar &&
    !!mascota;

  return (
    <>
      <Header />

      <main
        className={`min-h-screen bg-[#1A1A14] text-white ${
          mostrarAccionesFijas ? "pb-24 lg:pb-0" : ""
        }`}
      >
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.16),transparent_36%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-12">
            <div className="mx-auto max-w-5xl">
              {mensajeError && (
                <div className="mb-6 rounded-[24px] border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm leading-6 text-red-200">
                  {mensajeError}
                </div>
              )}

              {mensajeAdvertencia && (
                <div className="mb-6 rounded-[24px] border border-[#E8C547]/20 bg-[#E8C547]/10 px-5 py-4 text-sm leading-6 text-[#f6df8a]">
                  {mensajeAdvertencia}
                </div>
              )}

              {cargando ? (
                <div className="rounded-[30px] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-white/65 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:rounded-[34px]">
                  Cargando perfil...
                </div>
              ) : !hayContenidoMostrable ? (
                <div className="rounded-[30px] border border-red-400/20 bg-red-400/10 px-6 py-10 md:rounded-[34px]">
                  <div className="text-xl font-semibold">
                    No se pudo cargar el perfil
                  </div>
                  <p className="mt-2 text-sm leading-7 text-red-200">
                    {mensajeError ||
                      "La placa no está disponible o no está vinculada."}
                  </p>
                </div>
              ) : placaNoDisponible ? (
                <UnavailableProfileCard
                  stateLabel={unavailableStateLabel}
                  title={tituloPlacaNoDisponible}
                  message={mensajePlacaNoDisponible}
                  tagCode={datos?.tag_code}
                  accent={unavailableAccent}
                />
              ) : placaSinActivar ? (
                <UnassignedProfileCard
                  tagCode={datos?.tag_code || code || ""}
                  message={
                    datos?.message?.trim() ||
                    "Esta placa aún no ha sido activada."
                  }
                />
              ) : (
                <div className="space-y-6">
                  <section
                    className={`overflow-hidden rounded-[30px] border p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:rounded-[34px] md:p-7 ${
                      esLostMode
                        ? "border-[#E8C547]/30 bg-[#E8C547]/10"
                        : "border-white/10 bg-white/[0.04]"
                    }`}
                  >
                    <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                                esLostMode
                                  ? "border border-[#E8C547]/20 bg-[#E8C547]/15 text-[#f6df8a]"
                                  : esPrivado
                                  ? "border border-white/10 bg-white/[0.08] text-white/70"
                                  : "border border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200"
                              }`}
                            >
                              {esLostMode && (
                                <TriangleAlert className="h-3.5 w-3.5" />
                              )}
                              {esLostMode
                                ? "Mascota perdida"
                                : esPrivado
                                ? "Perfil privado"
                                : "Perfil público"}
                            </span>

                            {esPrivado && (
                              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
                                <Shield className="h-3.5 w-3.5" />
                                Protegido
                              </span>
                            )}
                          </div>

                          {datos?.tag_code && (
                            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80">
                              Código: {datos.tag_code}
                            </div>
                          )}
                        </div>

                        <h1 className="mt-5 break-words text-4xl font-semibold tracking-tight sm:text-5xl">
                          {mascota?.name || "Mascota"}
                        </h1>

                        {!esPrivado && (etiquetaEspecie || mascota?.breed) && (
                          <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                            {[etiquetaEspecie, mascota?.breed]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        )}

                        <div
                          className={`mt-5 rounded-[24px] border px-5 py-5 text-sm leading-7 ${
                            esLostMode
                              ? "border-[#E8C547]/25 bg-[#E8C547]/10 text-[#f6df8a]"
                              : "border-white/10 bg-white/[0.05] text-white/82"
                          }`}
                        >
                          {mensajePrincipal}
                        </div>

                        {perfil?.emergency_message?.trim() && !esPrivado && (
                          <div className="mt-4 rounded-[24px] border border-[#E8C547]/25 bg-[#E8C547]/10 px-5 py-5 text-sm leading-7 text-[#f6df8a]">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#E8C547]">
                              Mensaje de emergencia
                            </div>
                            <div className="text-white">
                              {perfil.emergency_message}
                            </div>
                          </div>
                        )}

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          {mostrarWhatsapp && (
                            <PublicActionLink
                              href={whatsappUrl}
                              icon={WhatsAppIcon}
                              variant="whatsapp"
                              external
                            >
                              Escribir por WhatsApp
                            </PublicActionLink>
                          )}

                          {mostrarLlamada && (
                            <PublicActionLink
                              href={callUrl}
                              icon={PhoneIcon}
                              variant="neutral"
                            >
                              Llamar al dueño
                            </PublicActionLink>
                          )}

                          <div className="sm:col-span-2">
                            <PublicActionLink
                              href="#panel-reporte"
                              icon={MapPinned}
                              variant="yellow"
                            >
                              Enviar ubicación al dueño
                            </PublicActionLink>
                          </div>
                        </div>

                        {esPrivado && (
                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/65">
                            La información de contacto está oculta, pero tu
                            reporte y ubicación sí llegarán al dueño.
                          </div>
                        )}
                      </div>

                      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05]">
                        {mascota?.photo_url ? (
                          <img
                            src={mascota.photo_url}
                            alt={mascota.name || "Mascota"}
                            className="h-full min-h-[280px] w-full object-cover sm:min-h-[360px]"
                          />
                        ) : (
                          <div className="flex min-h-[280px] items-center justify-center bg-white/[0.03] px-6 text-center text-sm text-white/45 sm:min-h-[360px]">
                            Sin foto disponible
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {esPrivado && (
                    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:rounded-[34px] md:p-6">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.08] text-white/80">
                          <LockKeyhole className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            Perfil protegido
                          </h2>
                          <p className="mt-1 text-sm leading-7 text-white/60">
                            La familia ocultó información sensible por
                            privacidad. Aun así, puedes ayudar enviando una
                            ubicación o un reporte.
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {itemsInfoPublica.length > 0 && (
                    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:rounded-[34px] md:p-6">
                      <h2 className="text-2xl font-semibold text-white">
                        Información visible
                      </h2>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {itemsInfoPublica.map((item) => (
                          <InfoCard
                            key={`${item.label}-${item.value}`}
                            label={item.label}
                            value={item.value}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  <section id="panel-reporte">
                    <FoundReportPanel
                      modo={visibilidad}
                      permiteReportes={perfil?.allow_found_reports ?? true}
                      nombreMascota={mascota?.name || "Mascota"}
                      tagId={datos?.tag_id || null}
                      petId={mascota?.id || null}
                      fuenteEscaneo={fuenteEscaneo}
                    />
                  </section>

                  {mostrarSeccionMedica && (
                    <section className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] md:rounded-[34px] md:p-6">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547]/12 text-[#E8C547]">
                          <HeartPulse className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            Alertas médicas
                          </h2>
                          <p className="mt-1 text-sm leading-7 text-white/55">
                            Información importante para ayudar con seguridad.
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3">
                        <CajaMedica
                          label="Alergias"
                          value={medico?.allergies_text}
                        />
                        <CajaMedica
                          label="Condiciones"
                          value={medico?.conditions_text}
                        />
                        <CajaMedica
                          label="Medicamentos"
                          value={medico?.medications_text}
                        />
                        <CajaMedica label="Dieta" value={medico?.dietary_notes} />
                        <CajaMedica
                          label="Esterilizado"
                          value={
                            medico?.sterilized == null
                              ? null
                              : medico.sterilized
                              ? "Sí"
                              : "No"
                          }
                        />

                        {mostrarVacunas && (
                          <div className="mt-3">
                            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                              Vacunas registradas
                            </div>

                            <div className="space-y-3">
                              {vacunas.map((vacuna) => (
                                <CajaVacuna
                                  key={vacuna.id}
                                  nombre={vacuna.vaccine_name}
                                  aplicada={vacuna.applied_at}
                                  proximaDosis={vacuna.next_due_at}
                                  dosis={vacuna.dose_number}
                                  notas={vacuna.notes}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {mostrarAccionesFijas && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#141410]/95 px-3 py-3 shadow-[0_-18px_50px_rgba(0,0,0,0.35)] backdrop-blur lg:hidden">
          <div
            className={`mx-auto grid max-w-md gap-2 ${
              mostrarWhatsapp ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {mostrarWhatsapp && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" />
                WhatsApp
              </a>
            )}

            <a
              href="#panel-reporte"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14]"
            >
              <MapPinned className="h-4 w-4" />
              Ubicación
            </a>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

function UnavailableProfileCard({
  stateLabel,
  title,
  message,
  tagCode,
  accent,
}: {
  stateLabel: string;
  title: string;
  message?: string | null;
  tagCode?: string | null;
  accent: {
    badge: string;
    panel: string;
    title: string;
    dot: string;
  };
}) {
  return (
    <section
      className={`overflow-hidden rounded-[30px] border p-6 shadow-[0_20px_80px_rgba(0,0,0,0.24)] md:rounded-[34px] md:p-7 ${accent.panel}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${accent.badge}`}
          >
            <span className={`h-2 w-2 rounded-full ${accent.dot}`} />
            {stateLabel}
          </span>

          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
            Perfil no disponible
          </span>
        </div>

        {tagCode && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80">
            Código: {tagCode}
          </div>
        )}
      </div>

      <div className="mt-8 max-w-3xl">
        <h1
          className={`text-3xl font-semibold leading-tight sm:text-4xl ${accent.title}`}
        >
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-white/70">
          Si encontraste esta placa físicamente, lo mejor es contactar a Mokko o
          entregarla a su dueño si ya lo conoces.
        </p>
      </div>

      {message && (
        <div className="mt-6 max-w-3xl rounded-[24px] border border-orange-400/20 bg-orange-400/10 px-5 py-5 text-sm leading-7 text-orange-100">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-200/80">
            Mensaje registrado
          </div>
          <div>{message}</div>
        </div>
      )}
    </section>
  );
}

function UnassignedProfileCard({
  tagCode,
  message,
}: {
  tagCode: string;
  message: string;
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[#E8C547]/20 bg-[#E8C547]/10 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.24)] md:rounded-[34px] md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f6df8a]">
          Placa sin activar
        </span>

        {tagCode && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/80">
            Código: {tagCode}
          </div>
        )}
      </div>

      <h1 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-4xl">
        {message}
      </h1>

      <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">
        Esta placa todavía no está vinculada a una mascota. Cuando el dueño la
        active, aquí aparecerá el perfil público correspondiente.
      </p>

      <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
        <Link
          to="/login"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
        >
          Iniciar sesión
        </Link>

        <Link
          to="/register"
          className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
        >
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}

function PublicActionLink({
  children,
  href,
  icon: Icon,
  variant,
  external = false,
}: {
  children: React.ReactNode;
  href: string;
  icon: ComponentType<{ className?: string }>;
  variant: "yellow" | "whatsapp" | "neutral";
  external?: boolean;
}) {
  const variantClass =
    variant === "yellow"
      ? "bg-[#E8C547] text-[#1A1A14] hover:brightness-105"
      : variant === "whatsapp"
      ? "bg-[#25D366] text-white hover:brightness-105"
      : "border border-white/12 bg-white/[0.04] text-white/90 hover:bg-white/[0.08]";

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-[20px] px-5 py-4 text-sm font-semibold transition ${variantClass}`}
    >
      <Icon className="h-[18px] w-[18px]" />
      {children}
    </a>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-white/86">
        {value}
      </div>
    </div>
  );
}

function CajaMedica({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/82">
        {value?.trim() || "No especificado"}
      </div>
    </div>
  );
}

function CajaVacuna({
  nombre,
  aplicada,
  proximaDosis,
  dosis,
  notas,
}: {
  nombre?: string | null;
  aplicada?: string | null;
  proximaDosis?: string | null;
  dosis?: number | null;
  notas?: string | null;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white/88">
            {nombre?.trim() || "Vacuna registrada"}
          </div>

          {typeof dosis === "number" && dosis > 0 && (
            <div className="mt-1 text-sm text-white/60">Dosis {dosis}</div>
          )}

          {notas?.trim() && (
            <div className="mt-2 text-sm leading-7 text-white/62">{notas}</div>
          )}
        </div>

        <span className="inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f6df8a]">
          Vacuna
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[18px] border border-white/10 bg-[#141410] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            Aplicada
          </div>
          <div className="mt-1 text-sm font-medium text-white/82">
            {formatearFecha(aplicada)}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-[#141410] px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">
            Vence / próxima referencia
          </div>
          <div className="mt-1 text-sm font-medium text-white/82">
            {formatearFecha(proximaDosis)}
          </div>
        </div>
      </div>
    </div>
  );
}
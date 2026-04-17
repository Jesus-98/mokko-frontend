import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { HeartPulse, MapPinned, Shield, TriangleAlert } from "lucide-react";
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
        badge:
          "bg-orange-400/12 text-orange-200 border border-orange-400/20",
        panel:
          "border-orange-400/20 bg-orange-400/10 text-orange-100",
        title: "text-orange-100",
        dot: "bg-orange-300",
      };

    case "suspended":
      return {
        badge:
          "bg-[#E8C547]/12 text-[#f6df8a] border border-[#E8C547]/20",
        panel:
          "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]",
        title: "text-[#F5F0E8]",
        dot: "bg-[#E8C547]",
      };

    case "retired":
      return {
        badge: "bg-red-400/12 text-red-200 border border-red-400/20",
        panel: "border-red-400/20 bg-red-400/10 text-red-100",
        title: "text-red-100",
        dot: "bg-red-300",
      };

    default:
      return {
        badge: "bg-white/8 text-white/70 border border-white/10",
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

      if (!perfilData.success) {
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

  const estadoPlaca = datos?.tag_status ?? null;
  const placaNoDisponible = isTagUnavailable(estadoPlaca);
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
    ? `https://wa.me/${numeroWhatsapp.replace(/\D/g, "")}?text=${mensajeWhatsapp}`
    : "";

  const callUrl = numeroLlamada ? `tel:${numeroLlamada}` : "";

  const mostrarWhatsapp = !esPrivado && !!whatsappUrl;
  const mostrarLlamada = !esPrivado && !!callUrl;

  const etiquetaEspecie = useMemo(() => {
    if (mascota?.species === "dog") return "Perro";
    if (mascota?.species === "cat") return "Gato";
    if (mascota?.species === "other") return "Mascota";
    return null;
  }, [mascota?.species]);

  const itemsInfoPublica = useMemo(() => {
    if (!mascota || esPrivado) return [];

    const items = [
      { label: "Especie", value: etiquetaEspecie },
      { label: "Raza", value: mascota.breed || null },
      { label: "Sexo", value: mascota.sex || null },
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
  }, [mascota, dueno, etiquetaEspecie, esPrivado]);

  const mensajePrincipal =
    perfil?.message?.trim() ||
    "Si encontraste a esta mascota, por favor contacta a su dueño.";

  const mostrarSeccionMedica =
    !esPrivado &&
    !!medico?.enabled &&
    !!(
      medico?.allergies_text ||
      medico?.conditions_text ||
      medico?.medications_text ||
      medico?.dietary_notes ||
      medico?.sterilized
    );

  const hayContenidoMostrable =
    !!datos?.success &&
    (placaNoDisponible ||
      !!mascota ||
      datos?.is_assigned === false ||
      !!datos?.message);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="mokko-container py-8 md:py-12">
          <div className="mx-auto max-w-5xl">
            {mensajeError && (
              <div className="mb-6 rounded-[28px] border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">
                {mensajeError}
              </div>
            )}

            {mensajeAdvertencia && (
              <div className="mb-6 rounded-[28px] border border-[#E8C547]/20 bg-[#E8C547]/10 px-5 py-4 text-sm text-[#f6df8a]">
                {mensajeAdvertencia}
              </div>
            )}

            {cargando ? (
              <div className="rounded-[34px] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-white/65 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                Cargando perfil...
              </div>
            ) : !hayContenidoMostrable ? (
              <div className="rounded-[34px] border border-red-400/20 bg-red-400/10 px-6 py-10">
                <div className="text-xl font-semibold">
                  No se pudo cargar el perfil
                </div>
                <p className="mt-2 text-sm leading-7 text-red-200">
                  {mensajeError || "La placa no está disponible o no está vinculada."}
                </p>
              </div>
            ) : placaNoDisponible ? (
              <section
                className={`overflow-hidden rounded-[34px] border p-6 md:p-7 shadow-[0_20px_80px_rgba(0,0,0,0.24)] ${unavailableAccent.panel}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${unavailableAccent.badge}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${unavailableAccent.dot}`} />
                      {unavailableStateLabel}
                    </span>

                    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                      Escaneo bloqueado
                    </span>
                  </div>

                  {datos?.tag_code && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      Código: {datos.tag_code}
                    </div>
                  )}
                </div>

                <div className="mt-8 max-w-3xl">
                  <h1
                    className={`text-3xl font-semibold leading-tight sm:text-4xl ${unavailableAccent.title}`}
                  >
                    {tituloPlacaNoDisponible}
                  </h1>
                </div>

                {mensajePlacaNoDisponible && (
                  <div className="mt-6 max-w-3xl rounded-[24px] border border-orange-400/20 bg-orange-400/10 px-5 py-5 text-sm leading-7 text-orange-100">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-200/80">
                      Mensaje del dueño
                    </div>
                    <div>{mensajePlacaNoDisponible}</div>
                  </div>
                )}
              </section>
            ) : datos?.is_assigned === false ? (
              <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Placa no disponible
                  </span>

                  {datos.tag_code && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                      Código: {datos.tag_code}
                    </div>
                  )}
                </div>

                <h1 className="mt-5 text-3xl font-semibold sm:text-4xl">
                  {datos.message?.trim() || "Esta placa no está activa"}
                </h1>
              </div>
            ) : (
              <div className="space-y-6">
                <section
                  className={`overflow-hidden rounded-[34px] border p-5 md:p-7 shadow-[0_20px_80px_rgba(0,0,0,0.28)] ${
                    esLostMode
                      ? "border-[#E8C547]/30 bg-[#E8C547]/10"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                              esLostMode
                                ? "bg-[#E8C547]/18 text-[#E8C547]"
                                : esPrivado
                                ? "bg-white/8 text-white/70"
                                : "bg-[#2D5A27]/18 text-[#9fd598]"
                            }`}
                          >
                            {esLostMode && <TriangleAlert className="h-3.5 w-3.5" />}
                            {esLostMode
                              ? "Mascota perdida"
                              : esPrivado
                              ? "Perfil privado"
                              : "Perfil público"}
                          </span>

                          {esPrivado && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                              <Shield className="h-3.5 w-3.5" />
                              Protegido
                            </span>
                          )}
                        </div>

                        {datos.tag_code && (
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                            Código: {datos.tag_code}
                          </div>
                        )}
                      </div>

                      <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
                        {mascota?.name || "Mascota"}
                      </h1>

                      {!esPrivado && (etiquetaEspecie || mascota?.breed) && (
                        <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                          {[etiquetaEspecie, mascota?.breed].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.05] px-5 py-5 text-sm leading-7 text-white/82">
                        {mensajePrincipal}
                      </div>

                      {perfil?.emergency_message?.trim() && !esPrivado && (
                        <div className="mt-4 rounded-[24px] border border-[#E8C547]/25 bg-[#E8C547]/10 px-5 py-5 text-sm leading-7 text-[#f6df8a]">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E8C547]">
                            Mensaje de emergencia
                          </div>
                          <div className="text-white">{perfil.emergency_message}</div>
                        </div>
                      )}

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        {mostrarWhatsapp && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-105"
                          >
                            <WhatsAppIcon className="h-[18px] w-[18px]" />
                            WhatsApp
                          </a>
                        )}

                        {mostrarLlamada && (
                          <a
                            href={callUrl}
                            className="inline-flex items-center justify-center gap-2 rounded-[20px] border border-white/12 bg-white/[0.04] px-5 py-3.5 text-sm font-semibold text-white/90 transition hover:bg-white/[0.08]"
                          >
                            <PhoneIcon className="h-[18px] w-[18px]" />
                            Llamar
                          </a>
                        )}

                        <div className="sm:col-span-2">
                          <a
                            href="#panel-reporte"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#E8C547] px-5 py-3.5 text-sm font-semibold text-[#1A1A14] transition hover:brightness-105"
                          >
                            <MapPinned className="h-4.5 w-4.5" />
                            Enviar ubicación al dueño
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
                      {mascota?.photo_url ? (
                        <img
                          src={mascota.photo_url}
                          alt={mascota.name || "Mascota"}
                          className="h-full min-h-[300px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex min-h-[300px] items-center justify-center bg-white/[0.03] px-6 text-center text-sm text-white/45">
                          Sin foto disponible
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {itemsInfoPublica.length > 0 && (
                  <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                    <h2 className="text-2xl font-semibold text-white">Información</h2>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {itemsInfoPublica.map((item) => (
                        <div
                          key={`${item.label}-${item.value}`}
                          className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4"
                        >
                          <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
                            {item.label}
                          </div>
                          <div className="mt-2 text-sm font-medium text-white/86">
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section id="panel-reporte">
                  <FoundReportPanel
                    modo={visibilidad}
                    permiteReportes={true}
                    nombreMascota={mascota?.name || "Mascota"}
                    tagId={datos?.tag_id || null}
                    petId={mascota?.id || null}
                    fuenteEscaneo={fuenteEscaneo}
                  />
                </section>

                <div className="grid gap-6 lg:grid-cols-2">
                  {mostrarSeccionMedica && (
                    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8C547]/12 text-[#E8C547]">
                          <HeartPulse className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-white">
                            Alertas médicas
                          </h2>
                          <p className="text-sm text-white/55">
                            Información importante para ayudar con seguridad
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        <CajaMedica label="Alergias" value={medico?.allergies_text} />
                        <CajaMedica label="Condiciones" value={medico?.conditions_text} />
                        <CajaMedica label="Medicamentos" value={medico?.medications_text} />
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
                      </div>
                    </section>
                  )}
                </div>

                {esPrivado && (
                  <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-5 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)]">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-white/80">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-white">
                          Perfil protegido
                        </h2>
                        <p className="text-sm text-white/55">
                          La familia ocultó información sensible por privacidad
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-7 text-white/72">
                      Puedes seguir ayudando compartiendo tu ubicación o enviando
                      un reporte con más detalles.
                    </p>
                  </section>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
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
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/82">
        {value?.trim() || "No especificado"}
      </div>
    </div>
  );
}
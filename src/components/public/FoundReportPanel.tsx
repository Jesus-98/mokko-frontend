import { useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPinned,
  MessageSquareText,
  Shield,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import PhoneIcon from "../icons/PhoneIcon";

type FuenteEscaneo = "qr" | "nfc" | "manual" | "unknown";
type ModoPerfil = "public" | "private" | "lost_mode";

type EstadoEnvio =
  | "idle"
  | "obteniendo_ubicacion"
  | "registrando_escaneo"
  | "enviando_reporte";

type Props = {
  modo: ModoPerfil;
  permiteReportes: boolean;
  nombreMascota: string;
  tagId: string | null;
  petId: string | null;
  fuenteEscaneo: FuenteEscaneo;
  className?: string;
};

type DatosUbicacion = {
  lat: number;
  lng: number;
  textoUbicacion: string;
};

const esErrorUbicacion = (
  error: unknown
): error is GeolocationPositionError => {
  return typeof error === "object" && error !== null && "code" in error;
};

const obtenerMensajeErrorUbicacion = (error: unknown) => {
  if (esErrorUbicacion(error)) {
    if (error.code === 1) {
      return "No diste permiso para compartir tu ubicación. Activa el permiso de ubicación en tu navegador e inténtalo nuevamente.";
    }

    if (error.code === 2) {
      return "No se pudo determinar tu ubicación. Activa el GPS, revisa tu conexión e inténtalo nuevamente.";
    }

    if (error.code === 3) {
      return "La ubicación tardó demasiado. Intenta nuevamente con mejor señal o abre la página en Chrome/Safari.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "No se pudo obtener tu ubicación.";
};

const obtenerMensajeErrorGeneral = (error: unknown, mensajeFallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const mensaje = String((error as { message?: unknown }).message ?? "").trim();

    if (mensaje) return mensaje;
  }

  return mensajeFallback;
};

const obtenerTextoBotonProceso = (
  estado: EstadoEnvio,
  textoIdle: string,
  textoEnvio: string
) => {
  if (estado === "obteniendo_ubicacion") return "Obteniendo ubicación...";
  if (estado === "registrando_escaneo") return "Preparando reporte...";
  if (estado === "enviando_reporte") return textoEnvio;

  return textoIdle;
};

const obtenerTextoAyudaProceso = (estado: EstadoEnvio) => {
  if (estado === "obteniendo_ubicacion") {
    return "Esto puede tardar unos segundos. Mantén activado el GPS y permite el acceso a tu ubicación.";
  }

  if (estado === "registrando_escaneo") {
    return "Estamos preparando el reporte. No cierres esta página.";
  }

  if (estado === "enviando_reporte") {
    return "Estamos enviando la información al dueño.";
  }

  return "";
};

export default function FoundReportPanel({
  modo,
  permiteReportes,
  nombreMascota,
  tagId,
  petId,
  fuenteEscaneo,
  className = "",
}: Props) {
  const [expandido, setExpandido] = useState(modo !== "public");
  const [nombreReportante, setNombreReportante] = useState("");
  const [telefonoReportante, setTelefonoReportante] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [compartirUbicacion, setCompartirUbicacion] = useState(modo !== "public");

  const [estadoUbicacionRapida, setEstadoUbicacionRapida] =
    useState<EstadoEnvio>("idle");
  const [estadoFormulario, setEstadoFormulario] = useState<EstadoEnvio>("idle");

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const deshabilitado = !permiteReportes || !tagId || !petId;
  const enviandoUbicacionRapida = estadoUbicacionRapida !== "idle";
  const enviandoFormulario = estadoFormulario !== "idle";
  const procesando = enviandoUbicacionRapida || enviandoFormulario;

  const nombreLimpio = nombreReportante.trim();
  const telefonoLimpio = telefonoReportante.trim();
  const mensajeLimpio = mensaje.trim();

  const tieneTelefonoOMensaje =
    telefonoLimpio.length > 0 || mensajeLimpio.length > 0;

  const tituloPanel = useMemo(() => {
    if (modo === "lost_mode") return "Reportar avistamiento";
    if (modo === "private") return "Ayuda a contactar al dueño";
    return "¿Viste a esta mascota?";
  }, [modo]);

  const descripcionPanel = useMemo(() => {
    if (modo === "lost_mode") {
      return "Si la encontraste o la viste, comparte tu ubicación y deja un mensaje para ayudar a su familia a ubicarla más rápido.";
    }

    if (modo === "private") {
      return "Este perfil protege la información del dueño. Puedes enviar tu ubicación o dejar un mensaje para ayudar.";
    }

    return "Puedes enviar tu ubicación rápidamente o dejar un mensaje con más detalles.";
  }, [modo]);

  const textoBotonUbicacion =
    modo === "lost_mode" ? "Enviar ubicación ahora" : "Enviar ubicación al dueño";

  const puedeEnviarFormulario =
    !!tagId &&
    !!petId &&
    permiteReportes &&
    (compartirUbicacion || tieneTelefonoOMensaje);

  const textoProcesoUbicacionRapida = obtenerTextoAyudaProceso(
    estadoUbicacionRapida
  );

  const textoProcesoFormulario = obtenerTextoAyudaProceso(estadoFormulario);

  const limpiarMensajes = () => {
    setMensajeError("");
    setMensajeExito("");
  };

  const mostrarError = (texto: string) => {
    setMensajeError(texto);
    setMensajeExito("");
  };

  const mostrarExito = (texto: string) => {
    setMensajeExito(texto);
    setMensajeError("");
  };

  const obtenerUbicacionConOpciones = (
    opciones: PositionOptions,
    tipo: "precisa" | "aproximada"
  ) =>
    new Promise<DatosUbicacion>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Tu navegador no permite compartir ubicación."));
        return;
      }

      if (typeof window !== "undefined" && !window.isSecureContext) {
        reject(
          new Error(
            "Por seguridad, la ubicación solo funciona en una conexión segura HTTPS."
          )
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const precision = position.coords.accuracy;

          resolve({
            lat,
            lng,
            textoUbicacion: `Ubicación ${tipo}. Precisión aproximada: ${Math.round(
              precision
            )} m`,
          });
        },
        (errorUbicacion) => {
          reject(errorUbicacion);
        },
        opciones
      );
    });

  const obtenerUbicacion = async () => {
    try {
      return await obtenerUbicacionConOpciones(
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        },
        "precisa"
      );
    } catch (primerError) {
      if (esErrorUbicacion(primerError) && primerError.code === 1) {
        throw new Error(obtenerMensajeErrorUbicacion(primerError));
      }

      if (primerError instanceof Error && !esErrorUbicacion(primerError)) {
        throw primerError;
      }

      console.warn(
        "Falló la ubicación precisa. Intentando ubicación aproximada.",
        primerError
      );

      try {
        return await obtenerUbicacionConOpciones(
          {
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 60000,
          },
          "aproximada"
        );
      } catch (segundoError) {
        throw new Error(obtenerMensajeErrorUbicacion(segundoError));
      }
    }
  };

  const crearEventoEscaneo = async (ubicacion?: DatosUbicacion | null) => {
    if (!tagId || !petId) {
      throw new Error("Falta información de la placa para registrar el evento.");
    }

    const { error } = await supabase.from("scan_events").insert({
      tag_id: tagId,
      pet_id: petId,
      source: fuenteEscaneo,
      location_lat: ubicacion?.lat ?? null,
      location_lng: ubicacion?.lng ?? null,
      location_text: ubicacion?.textoUbicacion ?? null,
      shared_location: !!ubicacion,
    });

    if (error) throw error;
  };

  const crearReporte = async ({
    ubicacion,
    scanEventId,
    notaPorDefecto,
  }: {
    ubicacion?: DatosUbicacion | null;
    scanEventId?: string | null;
    notaPorDefecto?: string;
  }) => {
    if (!tagId || !petId) {
      throw new Error("Falta información de la placa para registrar el reporte.");
    }

    const { error } = await supabase.from("found_reports").insert({
      tag_id: tagId,
      pet_id: petId,
      reporter_name: nombreLimpio || null,
      reporter_phone: telefonoLimpio || null,
      note: mensajeLimpio || notaPorDefecto || null,
      location_lat: ubicacion?.lat ?? null,
      location_lng: ubicacion?.lng ?? null,
      location_text: ubicacion?.textoUbicacion ?? null,
      source: fuenteEscaneo,
      status: "new",
      scan_event_id: scanEventId ?? null,
    });

    if (error) throw error;
  };

  const enviarUbicacionRapida = async () => {
    if (deshabilitado) {
      mostrarError("Este perfil no permite reportes públicos en este momento.");
      return;
    }

    limpiarMensajes();
    setEstadoUbicacionRapida("obteniendo_ubicacion");

    try {
      const ubicacion = await obtenerUbicacion();

      setEstadoUbicacionRapida("registrando_escaneo");

      try {
        await crearEventoEscaneo(ubicacion);
      } catch (errorScan) {
        console.warn(
          "No se pudo registrar el evento de escaneo, pero se enviará el reporte.",
          errorScan
        );
      }

      setEstadoUbicacionRapida("enviando_reporte");

      await crearReporte({
        ubicacion,
        scanEventId: null,
        notaPorDefecto: "Ubicación enviada desde el perfil público.",
      });

      mostrarExito("Ubicación enviada correctamente al dueño.");
    } catch (error) {
      console.error("Error enviando ubicación rápida:", error);

      mostrarError(
        obtenerMensajeErrorGeneral(error, "No se pudo enviar la ubicación.")
      );
    } finally {
      setEstadoUbicacionRapida("idle");
    }
  };

  const enviarFormulario = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!permiteReportes) {
      mostrarError("Este perfil no permite reportes públicos.");
      return;
    }

    if (!tagId || !petId) {
      mostrarError("Falta información de la placa para enviar el reporte.");
      return;
    }

    if (!puedeEnviarFormulario) {
      mostrarError(
        "Comparte tu ubicación o deja al menos un teléfono o mensaje para enviar el reporte."
      );
      return;
    }

    limpiarMensajes();
    setEstadoFormulario(
      compartirUbicacion ? "obteniendo_ubicacion" : "enviando_reporte"
    );

    try {
      let ubicacion: DatosUbicacion | null = null;
      let avisoUbicacion = "";

      if (compartirUbicacion) {
        try {
          ubicacion = await obtenerUbicacion();
        } catch (errorUbicacion) {
          console.warn(
            "No se pudo obtener la ubicación para el formulario.",
            errorUbicacion
          );

          if (!tieneTelefonoOMensaje) {
            throw errorUbicacion;
          }

          avisoUbicacion = obtenerMensajeErrorGeneral(
            errorUbicacion,
            "No pudimos adjuntar tu ubicación."
          );
        }

        if (ubicacion) {
          setEstadoFormulario("registrando_escaneo");

          try {
            await crearEventoEscaneo(ubicacion);
          } catch (errorScan) {
            console.warn(
              "No se pudo registrar el evento de escaneo, pero se enviará el reporte.",
              errorScan
            );
          }
        }
      }

      setEstadoFormulario("enviando_reporte");

      await crearReporte({
        ubicacion,
        scanEventId: null,
        notaPorDefecto: ubicacion
          ? "Reporte enviado desde el perfil público."
          : undefined,
      });

      setNombreReportante("");
      setTelefonoReportante("");
      setMensaje("");
      setCompartirUbicacion(modo !== "public");

      mostrarExito(
        avisoUbicacion
          ? "Reporte enviado correctamente, pero no pudimos adjuntar la ubicación. El dueño recibirá tu mensaje o teléfono."
          : "Reporte enviado correctamente."
      );
    } catch (error) {
      console.error("Error enviando reporte:", error);

      mostrarError(
        obtenerMensajeErrorGeneral(error, "No se pudo enviar el reporte.")
      );
    } finally {
      setEstadoFormulario("idle");
    }
  };

  const clasesTarjeta =
    modo === "lost_mode"
      ? "border-[#E8C547]/30 bg-[#E8C547]/10"
      : modo === "private"
      ? "border-white/10 bg-white/[0.05]"
      : "border-white/10 bg-white/[0.04]";

  const clasesBadge =
    modo === "lost_mode"
      ? "border border-[#E8C547]/20 bg-[#E8C547]/15 text-[#f6df8a]"
      : modo === "private"
      ? "border border-white/10 bg-white/[0.08] text-white/70"
      : "border border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";

  const clasesBotonUbicacion =
    "bg-[#E8C547] text-[#1A1A14] hover:bg-[#f0cf55]";

  const clasesBotonEnviar =
    modo === "lost_mode"
      ? "bg-[#E8C547] text-[#1A1A14] hover:bg-[#f0cf55]"
      : "bg-white text-[#1A1A14] hover:brightness-95";

  return (
    <section
      className={`scroll-mt-24 rounded-[30px] border p-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:rounded-[34px] md:p-6 ${clasesTarjeta} ${className}`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${clasesBadge}`}
          >
            {modo === "lost_mode" ? (
              <TriangleAlert className="h-3.5 w-3.5" />
            ) : modo === "private" ? (
              <Shield className="h-3.5 w-3.5" />
            ) : null}

            {modo === "lost_mode"
              ? "Alerta de extravío"
              : modo === "private"
              ? "Perfil privado"
              : "Ayuda"}
          </span>

          <h2 className="mt-4 text-2xl font-semibold text-white">
            {tituloPanel}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
            {descripcionPanel}
          </p>
        </div>

      </div>

      {!permiteReportes && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-4 text-sm leading-7 text-white/70">
          Este perfil no permite reportes públicos por el momento.
        </div>
      )}

      {mensajeError && (
        <div
          aria-live="polite"
          className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm leading-7 text-red-200"
        >
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div
          aria-live="polite"
          className="mt-5 rounded-2xl border border-[#2D5A27]/25 bg-[#2D5A27]/15 px-4 py-4 text-sm leading-7 text-green-200"
        >
          {mensajeExito}
        </div>
      )}

      <div className="mt-6 rounded-[24px] border border-white/10 bg-[#141410] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold text-white">
              <MapPinned className="h-5 w-5 text-[#E8C547]" />
              Enviar ubicación rápida
            </div>

            <p className="mt-2 text-sm leading-7 text-white/60">
              Esta es la forma más útil de ayudar. El dueño recibirá una
              referencia de dónde viste a {nombreMascota}.
            </p>
          </div>

          <button
            type="button"
            disabled={deshabilitado || procesando}
            onClick={enviarUbicacionRapida}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-4 text-sm font-semibold shadow-lg shadow-[#E8C547]/15 transition disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto ${clasesBotonUbicacion}`}
          >
            <MapPinned className="h-[18px] w-[18px]" />
            {obtenerTextoBotonProceso(
              estadoUbicacionRapida,
              textoBotonUbicacion,
              "Enviando ubicación..."
            )}
          </button>
        </div>

        {textoProcesoUbicacionRapida && (
          <p className="mt-3 text-xs leading-6 text-white/50">
            {textoProcesoUbicacionRapida}
          </p>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          disabled={procesando}
          onClick={() => setExpandido((valor) => !valor)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {expandido ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {modo === "public" ? "Ocultar detalles" : "Ocultar formulario"}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Agregar más detalles
            </>
          )}
        </button>
      </div>

      {expandido && (
        <form onSubmit={enviarFormulario} className="mt-6 space-y-4">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <MessageSquareText className="mt-1 h-5 w-5 shrink-0 text-[#E8C547]" />
              <div>
                <h3 className="text-base font-semibold text-white">
                  Agregar información adicional
                </h3>
                <p className="mt-1 text-sm leading-7 text-white/60">
                  Puedes dejar tu teléfono o un mensaje para que el dueño tenga
                  más contexto.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Tu nombre
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={nombreReportante}
                    disabled={procesando}
                    maxLength={80}
                    autoComplete="name"
                    onChange={(event) => setNombreReportante(event.target.value)}
                    placeholder="Ej. Alan"
                    className="w-full rounded-[18px] border border-white/10 bg-[#141410] px-4 py-4 pr-11 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/40 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
                  />

                  <MessageSquareText className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Tu teléfono / WhatsApp
                </label>

                <div className="relative">
                  <input
                    type="tel"
                    inputMode="tel"
                    value={telefonoReportante}
                    disabled={procesando}
                    maxLength={30}
                    autoComplete="tel"
                    onChange={(event) =>
                      setTelefonoReportante(event.target.value)
                    }
                    placeholder="Ej. 900000000"
                    className="w-full rounded-[18px] border border-white/10 bg-[#141410] px-4 py-4 pr-11 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/40 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
                  />

                  <PhoneIcon className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-white/80">
                Mensaje
              </label>

              <textarea
                rows={4}
                value={mensaje}
                disabled={procesando}
                maxLength={600}
                onChange={(event) => setMensaje(event.target.value)}
                placeholder={`Ej. Vi a ${nombreMascota} cerca del parque, parecía tranquilo y caminaba hacia la avenida.`}
                className="w-full rounded-[18px] border border-white/10 bg-[#141410] px-4 py-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/40 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
              />

              <p className="mt-2 text-right text-[11px] text-white/35">
                {mensaje.length}/600
              </p>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-[18px] border border-white/10 bg-[#141410] px-4 py-4 text-sm leading-6 text-white/78">
              <input
                type="checkbox"
                checked={compartirUbicacion}
                disabled={procesando}
                onChange={(event) =>
                  setCompartirUbicacion(event.target.checked)
                }
                className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#E8C547] disabled:cursor-not-allowed disabled:opacity-60"
              />

              <span>
                Compartir también mi ubicación al enviar este reporte.
              </span>
            </label>

            {textoProcesoFormulario && (
              <p className="mt-3 text-xs leading-6 text-white/50">
                {textoProcesoFormulario}
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:flex sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs leading-6 text-white/45">
                Puedes enviar solo ubicación, o dejar además un teléfono o
                mensaje para ayudar a contactar al dueño.
              </p>

              <button
                type="submit"
                disabled={!puedeEnviarFormulario || procesando}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-5 py-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-3.5 ${clasesBotonEnviar}`}
              >
                <MessageSquareText className="h-4 w-4" />
                {obtenerTextoBotonProceso(
                  estadoFormulario,
                  "Enviar reporte",
                  "Enviando reporte..."
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}

import { useMemo, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronUp,
  MapPinned,
  MessageSquareText,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import PhoneIcon from "../icons/PhoneIcon";

type FuenteEscaneo = "qr" | "nfc" | "manual" | "unknown";
type ModoPerfil = "public" | "private" | "lost_mode";

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

  const [enviandoUbicacionRapida, setEnviandoUbicacionRapida] = useState(false);
  const [enviandoFormulario, setEnviandoFormulario] = useState(false);

  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const deshabilitado = !permiteReportes || !tagId || !petId;

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
    (compartirUbicacion ||
      telefonoReportante.trim().length > 0 ||
      mensaje.trim().length > 0);

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

  const obtenerUbicacion = () =>
    new Promise<DatosUbicacion>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Tu navegador no permite compartir ubicación."));
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
            textoUbicacion: `Precisión aproximada: ${Math.round(precision)} m`,
          });
        },
        (errorUbicacion) => {
          if (errorUbicacion.code === 1) {
            reject(new Error("No diste permiso para compartir tu ubicación."));
            return;
          }

          if (errorUbicacion.code === 2) {
            reject(new Error("No se pudo determinar tu ubicación."));
            return;
          }

          if (errorUbicacion.code === 3) {
            reject(new Error("La solicitud de ubicación tardó demasiado."));
            return;
          }

          reject(new Error("No se pudo obtener tu ubicación."));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });

  const crearEventoEscaneo = async (ubicacion?: DatosUbicacion | null) => {
    if (!tagId || !petId) {
      throw new Error("Falta información de la placa para registrar el evento.");
    }

    const { data, error } = await supabase
      .from("scan_events")
      .insert({
        tag_id: tagId,
        pet_id: petId,
        source: fuenteEscaneo,
        location_lat: ubicacion?.lat ?? null,
        location_lng: ubicacion?.lng ?? null,
        location_text: ubicacion?.textoUbicacion ?? null,
        shared_location: !!ubicacion,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id as string;
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

    const nombreLimpio = nombreReportante.trim();
    const telefonoLimpio = telefonoReportante.trim();
    const mensajeLimpio = mensaje.trim();

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
    setEnviandoUbicacionRapida(true);

    try {
      const ubicacion = await obtenerUbicacion();
      const scanEventId = await crearEventoEscaneo(ubicacion);

      await crearReporte({
        ubicacion,
        scanEventId,
        notaPorDefecto: "Ubicación enviada desde el perfil público.",
      });

      mostrarExito("Ubicación enviada correctamente al dueño.");
    } catch (error) {
      console.error("Error enviando ubicación rápida:", error);
      mostrarError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la ubicación."
      );
    } finally {
      setEnviandoUbicacionRapida(false);
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
    setEnviandoFormulario(true);

    try {
      let ubicacion: DatosUbicacion | null = null;
      let scanEventId: string | null = null;

      if (compartirUbicacion) {
        ubicacion = await obtenerUbicacion();
        scanEventId = await crearEventoEscaneo(ubicacion);
      }

      await crearReporte({
        ubicacion,
        scanEventId,
      });

      setNombreReportante("");
      setTelefonoReportante("");
      setMensaje("");
      setCompartirUbicacion(modo !== "public");

      mostrarExito("Reporte enviado correctamente.");
    } catch (error) {
      console.error("Error enviando reporte:", error);
      mostrarError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar el reporte."
      );
    } finally {
      setEnviandoFormulario(false);
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
      ? "bg-[#E8C547]/18 text-[#E8C547]"
      : modo === "private"
      ? "bg-white/8 text-white/70"
      : "bg-[#2D5A27]/18 text-[#9fd598]";

  const clasesBotonUbicacion =
    modo === "lost_mode"
      ? "bg-[#E8C547] text-[#1A1A14] hover:brightness-105"
      : "border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]";

  const clasesBotonEnviar =
    modo === "lost_mode"
      ? "bg-[#E8C547] text-[#1A1A14] hover:brightness-105"
      : "bg-white text-[#1A1A14] hover:brightness-95";

  return (
    <section
      className={`rounded-[30px] border p-5 md:p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] ${clasesTarjeta} ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${clasesBadge}`}
          >
            {modo === "lost_mode" && <TriangleAlert className="h-3.5 w-3.5" />}
            {modo === "lost_mode"
              ? "Alerta"
              : modo === "private"
              ? "Privado"
              : "Ayuda"}
          </span>

          <h2 className="mt-4 text-2xl font-semibold text-white">{tituloPanel}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
            {descripcionPanel}
          </p>
        </div>

        {modo === "public" && (
          <button
            type="button"
            onClick={() => setExpandido((valor) => !valor)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
          >
            {expandido ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar formulario
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Agregar más detalles
              </>
            )}
          </button>
        )}
      </div>

      {!permiteReportes && (
        <div className="mt-5 rounded-2xl border border-white/8 bg-[#141410] px-4 py-4 text-sm text-white/70">
          Este perfil no permite reportes públicos por el momento.
        </div>
      )}

      {mensajeError && (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-4 text-sm text-red-200">
          {mensajeError}
        </div>
      )}

      {mensajeExito && (
        <div className="mt-5 rounded-2xl border border-[#2D5A27]/25 bg-[#2D5A27]/12 px-4 py-4 text-sm text-[#b8ebb3]">
          {mensajeExito}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={deshabilitado || enviandoUbicacionRapida}
          onClick={enviarUbicacionRapida}
          className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${clasesBotonUbicacion}`}
        >
          <MapPinned className="h-4.5 w-4.5" />
          {enviandoUbicacionRapida ? "Enviando ubicación..." : textoBotonUbicacion}
        </button>

        {modo !== "public" && (
          <button
            type="button"
            onClick={() => setExpandido((valor) => !valor)}
            className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.08]"
          >
            {expandido ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Ocultar detalles
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Agregar más detalles
              </>
            )}
          </button>
        )}
      </div>

      {expandido && (
        <form onSubmit={enviarFormulario} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Tu nombre
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={nombreReportante}
                  onChange={(event) => setNombreReportante(event.target.value)}
                  placeholder="Ej. Ana"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-11 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#E8C547]/40"
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
                  type="text"
                  value={telefonoReportante}
                  onChange={(event) => setTelefonoReportante(event.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-11 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#E8C547]/40"
                />
                <PhoneIcon className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35" />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Mensaje
            </label>
            <textarea
              rows={4}
              value={mensaje}
              onChange={(event) => setMensaje(event.target.value)}
              placeholder={`Ej. Vi a ${nombreMascota} cerca del parque, parecía tranquilo y caminaba hacia la avenida.`}
              className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#E8C547]/40"
            />
          </div>

          <label className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-white/78">
            <input
              type="checkbox"
              checked={compartirUbicacion}
              onChange={(event) => setCompartirUbicacion(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#E8C547]"
            />
            <span>
              Compartir también mi ubicación al enviar este reporte.
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs leading-6 text-white/45">
              Puedes enviar solo ubicación, o dejar además un teléfono o mensaje
              para ayudar a contactar al dueño.
            </p>

            <button
              type="submit"
              disabled={!puedeEnviarFormulario || enviandoFormulario}
              className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-5 py-3.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${clasesBotonEnviar}`}
            >
              <MessageSquareText className="h-4 w-4" />
              {enviandoFormulario ? "Enviando reporte..." : "Enviar reporte"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
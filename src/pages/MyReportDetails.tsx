import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  Eye,
  MapPinned,
  MessageSquareText,
  PawPrint,
  Phone,
  XCircle,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type MaybeRelation<T> = T | T[] | null | undefined;

type ReportPetRow = {
  id: string;
  name: string;
  photo_url: string | null;
};

type ReportTagRow = {
  id: string;
  code: string;
};

type ReportSource = "qr" | "nfc" | "manual" | "unknown";
type ReportStatus = "new" | "viewed" | "resolved" | "dismissed";

type FoundReportDetailRow = {
  id: string;
  pet_id: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  note: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_text: string | null;
  source: ReportSource;
  status: ReportStatus;
  created_at: string;
  viewed_at: string | null;
  resolved_at: string | null;
  pets?: MaybeRelation<ReportPetRow>;
  tags?: MaybeRelation<ReportTagRow>;
};

type PetIdRow = {
  id: string;
};

function firstRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getStatusLabel(status: ReportStatus) {
  switch (status) {
    case "new":
      return "Nuevo";
    case "viewed":
      return "Revisado";
    case "resolved":
      return "Resuelto";
    case "dismissed":
      return "Ignorado";
    default:
      return "No disponible";
  }
}

function getStatusClass(status: ReportStatus) {
  switch (status) {
    case "new":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "viewed":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "resolved":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "dismissed":
      return "border-white/10 bg-white/5 text-white/60";
    default:
      return "border-white/10 bg-white/5 text-white/70";
  }
}

function getSourceLabel(source: ReportSource | null | undefined) {
  switch (source) {
    case "qr":
      return "Escaneo QR";
    case "nfc":
      return "Escaneo NFC";
    case "manual":
      return "Ingreso manual";
    default:
      return "No identificado";
  }
}

function getSourceClass(source: ReportSource | null | undefined) {
  switch (source) {
    case "qr":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "nfc":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "manual":
      return "border-white/10 bg-white/5 text-white/75";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function formatDate(value: string | null) {
  if (!value) return "No disponible";

  try {
    return new Date(value).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function hasLocation(report: FoundReportDetailRow | null) {
  if (!report) return false;

  return (
    report.location_lat != null ||
    report.location_lng != null ||
    !!report.location_text?.trim()
  );
}

function getMapsUrl(report: FoundReportDetailRow | null) {
  if (!report?.location_lat || !report?.location_lng) return "";
  return `https://www.google.com/maps?q=${report.location_lat},${report.location_lng}`;
}

function getPhoneUrl(phone: string | null) {
  if (!phone?.trim()) return "";
  return `tel:${phone.replace(/\s+/g, "")}`;
}

function getWhatsAppUrl(phone: string | null) {
  if (!phone?.trim()) return "";

  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";

  return `https://wa.me/${digits}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }

  return fallback;
}

export default function MyReportDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FoundReportDetailRow | null>(null);
  const [ownedPetIds, setOwnedPetIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadReport = useCallback(async () => {
    if (!user?.id || !id) return;

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select("id")
        .eq("owner_user_id", user.id);

      if (petsError) {
        throw new Error(
          `No se pudieron validar tus mascotas: ${petsError.message}`
        );
      }

      const petIds = ((petsData ?? []) as PetIdRow[])
        .map((pet) => pet.id)
        .filter(Boolean);

      setOwnedPetIds(petIds);

      if (petIds.length === 0) {
        setReport(null);
        return;
      }

      const { data, error } = await supabase
        .from("found_reports")
        .select(`
          id,
          pet_id,
          reporter_name,
          reporter_phone,
          note,
          location_lat,
          location_lng,
          location_text,
          source,
          status,
          created_at,
          viewed_at,
          resolved_at,
          pets (
            id,
            name,
            photo_url
          ),
          tags (
            id,
            code
          )
        `)
        .eq("id", id)
        .in("pet_id", petIds)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setReport(null);
        return;
      }

      const reportData = data as FoundReportDetailRow;

      if (!reportData.pet_id || !petIds.includes(reportData.pet_id)) {
        setReport(null);
        throw new Error("No tienes permisos para ver este reporte.");
      }

      if (reportData.status === "new") {
        const viewedAt = new Date().toISOString();

        const { data: updatedData, error: updateError } = await supabase
          .from("found_reports")
          .update({
            status: "viewed",
            viewed_at: viewedAt,
          })
          .eq("id", reportData.id)
          .eq("pet_id", reportData.pet_id)
          .select("id")
          .maybeSingle();

        if (updateError) {
          console.error("MyReportDetails mark viewed error:", updateError);
        } else if (updatedData) {
          reportData.status = "viewed";
          reportData.viewed_at = viewedAt;
        }
      }

      setReport(reportData);
    } catch (error) {
      console.error("MyReportDetails load error:", error);

      setErrorMsg(getErrorMessage(error, "No se pudo cargar el reporte."));
      setReport(null);
      setOwnedPetIds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, id]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id || !id) {
      setReport(null);
      setOwnedPetIds([]);
      setErrorMsg("");
      setSuccessMsg("");
      setActionLoading(false);
      setLoading(false);
      return;
    }

    void loadReport();
  }, [authLoading, user?.id, id, loadReport]);

  const pet = useMemo(() => firstRelation(report?.pets), [report]);
  const tag = useMemo(() => firstRelation(report?.tags), [report]);
  const ubicacionEnviada = useMemo(() => hasLocation(report), [report]);
  const mapUrl = useMemo(() => getMapsUrl(report), [report]);
  const phoneUrl = useMemo(
    () => getPhoneUrl(report?.reporter_phone ?? null),
    [report?.reporter_phone]
  );
  const whatsappUrl = useMemo(
    () => getWhatsAppUrl(report?.reporter_phone ?? null),
    [report?.reporter_phone]
  );

  const isActiveReport =
    report?.status === "new" || report?.status === "viewed";

  const getOwnedReportOrThrow = () => {
    if (!report?.pet_id || !ownedPetIds.includes(report.pet_id)) {
      throw new Error("No tienes permisos para modificar este reporte.");
    }

    return report;
  };

  const markAsResolved = async () => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const currentReport = getOwnedReportOrThrow();
      const resolvedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("found_reports")
        .update({
          status: "resolved",
          resolved_at: resolvedAt,
        })
        .eq("id", currentReport.id)
        .eq("pet_id", currentReport.pet_id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No se encontró un reporte válido para actualizar.");
      }

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: "resolved",
              resolved_at: resolvedAt,
            }
          : prev
      );

      setSuccessMsg("Reporte marcado como resuelto.");
    } catch (error) {
      console.error("MyReportDetails markAsResolved error:", error);

      setErrorMsg(getErrorMessage(error, "No se pudo marcar como resuelto."));
    } finally {
      setActionLoading(false);
    }
  };

  const dismissReport = async () => {
    setActionLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const currentReport = getOwnedReportOrThrow();

      const { data, error } = await supabase
        .from("found_reports")
        .update({
          status: "dismissed",
        })
        .eq("id", currentReport.id)
        .eq("pet_id", currentReport.pet_id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No se encontró un reporte válido para actualizar.");
      }

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: "dismissed",
            }
          : prev
      );

      setSuccessMsg("Reporte ignorado correctamente.");
    } catch (error) {
      console.error("MyReportDetails dismissReport error:", error);

      setErrorMsg(getErrorMessage(error, "No se pudo ignorar el reporte."));
    } finally {
      setActionLoading(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-12">
            <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-white/[0.04] px-6 py-12">
              <div className="text-2xl font-semibold">
                Inicia sesión para ver este reporte
              </div>

              <p className="mt-3 text-sm leading-7 text-white/70">
                Necesitas una cuenta Mokko para revisar el detalle de tus
                reportes.
              </p>

              <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  to="/login?next=/mis-reportes"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                >
                  Iniciar sesión
                </Link>

                <Link
                  to="/register?next=/mis-reportes"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.12),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Detalle de reporte
                    </span>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {pet?.photo_url ? (
                          <img
                            src={pet.photo_url}
                            alt={`Foto de ${pet.name}`}
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
                          {pet?.name || "Reporte"}
                        </h1>

                        <p className="mt-2 text-sm leading-7 text-white/70 sm:text-base">
                          Revisa la información enviada desde el perfil público.
                        </p>

                        {report && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <StatusPill className={getStatusClass(report.status)}>
                              {getStatusLabel(report.status)}
                            </StatusPill>

                            <StatusPill className={getSourceClass(report.source)}>
                              {getSourceLabel(report.source)}
                            </StatusPill>

                            {tag?.code && (
                              <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                Código {tag.code}
                              </StatusPill>
                            )}

                            {ubicacionEnviada && (
                              <StatusPill className="border-blue-400/20 bg-blue-400/10 text-blue-200">
                                Ubicación enviada
                              </StatusPill>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <Link
                      to="/mis-reportes"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] sm:w-auto sm:py-3.5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Volver
                    </Link>

                    {report && isActiveReport && (
                      <button
                        type="button"
                        onClick={() => void markAsResolved()}
                        disabled={actionLoading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {actionLoading ? "Actualizando..." : "Marcar resuelto"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm leading-6 text-green-200">
                  {successMsg}
                </div>
              )}

              {loading || authLoading ? (
                <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/65 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                  Cargando reporte...
                </div>
              ) : !report ? (
                <div className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                  <div className="text-xl font-semibold">
                    No se encontró el reporte
                  </div>

                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Puede que no exista o que no tengas permiso para verlo.
                  </p>
                </div>
              ) : (
                <>
                  <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                    <MetricCard
                      icon={Clock3}
                      label="Creado"
                      value={formatDate(report.created_at)}
                      description="Fecha del reporte."
                    />

                    <MetricCard
                      icon={Eye}
                      label="Revisado"
                      value={formatDate(report.viewed_at)}
                      description="Última revisión."
                    />

                    <MetricCard
                      icon={CheckCircle2}
                      label="Resuelto"
                      value={formatDate(report.resolved_at)}
                      description="Cierre."
                      highlight={report.status === "resolved"}
                    />

                    <MetricCard
                      icon={MapPinned}
                      label="Ubicación"
                      value={ubicacionEnviada ? "Sí" : "No"}
                      description="Dato recibido."
                      highlight={ubicacionEnviada}
                    />
                  </section>

                  <div className="mt-7 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                      <div className="space-y-2">
                        <h2 className="text-2xl font-semibold">
                          Información del reporte
                        </h2>
                        <p className="text-sm leading-7 text-white/65">
                          Detalle enviado desde el perfil público.
                        </p>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <InfoCard
                          label="Mascota"
                          value={pet?.name || "No disponible"}
                        />

                        <InfoCard
                          label="Código"
                          value={tag?.code || "No disponible"}
                        />

                        <InfoCard
                          label="Estado"
                          value={getStatusLabel(report.status)}
                        />

                        <InfoCard
                          label="Origen"
                          value={getSourceLabel(report.source)}
                        />
                      </div>

                      <div className="mt-6 grid gap-4">
                        <InfoArea
                          label="Referencia de ubicación"
                          value={report.location_text || "No especificada"}
                        />

                        <InfoArea label="Nota" value={report.note || "Sin nota"} />
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <InfoCard
                          label="Nombre del reportante"
                          value={report.reporter_name || "No especificado"}
                        />

                        <InfoCard
                          label="Teléfono del reportante"
                          value={report.reporter_phone || "No especificado"}
                        />
                      </div>
                    </section>

                    <div className="grid content-start gap-6">
                      <section className="rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">Acciones</h2>
                          <p className="text-sm leading-7 text-white/65">
                            Gestiona este reporte o contacta al reportante si
                            dejó información.
                          </p>
                        </div>

                        <div className="mt-6 grid gap-3">
                          {mapUrl ? (
                            <a
                              href={mapUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-400/15"
                            >
                              <MapPinned className="h-4 w-4" />
                              Abrir ubicación
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/35"
                            >
                              <MapPinned className="h-4 w-4" />
                              Sin ubicación exacta
                            </button>
                          )}

                          {phoneUrl && (
                            <a
                              href={phoneUrl}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                            >
                              <Phone className="h-4 w-4" />
                              Llamar
                            </a>
                          )}

                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20"
                            >
                              <MessageSquareText className="h-4 w-4" />
                              Escribir por WhatsApp
                            </a>
                          )}

                          {pet?.id && (
                            <Link
                              to={`/mis-mascotas/${pet.id}`}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                            >
                              <PawPrint className="h-4 w-4" />
                              Ver mascota
                            </Link>
                          )}

                          {isActiveReport && (
                            <>
                              <ActionButton
                                icon={XCircle}
                                variant="neutral"
                                disabled={actionLoading}
                                onClick={() => void dismissReport()}
                              >
                                {actionLoading ? "Actualizando..." : "Ignorar"}
                              </ActionButton>

                              <ActionButton
                                icon={CheckCircle2}
                                variant="yellow"
                                disabled={actionLoading}
                                onClick={() => void markAsResolved()}
                              >
                                {actionLoading
                                  ? "Actualizando..."
                                  : "Marcar como resuelto"}
                              </ActionButton>
                            </>
                          )}
                        </div>
                      </section>

                      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">Ubicación</h2>
                          <p className="text-sm leading-7 text-white/65">
                            Datos recibidos desde el dispositivo de quien envió
                            el reporte.
                          </p>
                        </div>

                        <div className="mt-5 grid gap-3">
                          <InfoCard
                            label="Latitud"
                            value={
                              report.location_lat != null
                                ? String(report.location_lat)
                                : "No disponible"
                            }
                          />

                          <InfoCard
                            label="Longitud"
                            value={
                              report.location_lng != null
                                ? String(report.location_lng)
                                : "No disponible"
                            }
                          />

                          <InfoArea
                            label="Referencia"
                            value={report.location_text || "No especificada"}
                          />
                        </div>
                      </section>

                      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-6 md:rounded-[32px]">
                        <div className="space-y-2">
                          <h2 className="text-2xl font-semibold">Mascota</h2>
                          <p className="text-sm leading-7 text-white/65">
                            Mascota asociada al reporte.
                          </p>
                        </div>

                        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-[#141410] p-4">
                          {pet?.photo_url ? (
                            <img
                              src={pet.photo_url}
                              alt={`Foto de ${pet.name}`}
                              className="h-64 w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="rounded-[20px] border border-dashed border-white/10 p-6 text-center text-sm text-white/50">
                              Aún no hay foto registrada.
                            </div>
                          )}

                          <div className="mt-4 text-lg font-semibold text-white">
                            {pet?.name || "Mascota"}
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
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

      <div className="mt-4 break-words text-base font-semibold text-[#F5F0E8] sm:text-lg">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
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

function InfoArea({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/80">{value}</div>
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
  variant: "yellow" | "neutral";
  disabled?: boolean;
  onClick: () => void;
}) {
  const variantClass =
    variant === "yellow"
      ? "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#F5F0E8] hover:bg-[#E8C547]/15"
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
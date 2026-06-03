import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  MapPinned,
  MessageSquareText,
  PawPrint,
  RefreshCw,
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

type ReportStatus = "new" | "viewed" | "resolved" | "dismissed";
type ReportSource = "qr" | "nfc" | "manual" | "unknown";
type ReportTab = "active" | "history";

type FoundReportRow = {
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

function hasLocation(report: FoundReportRow) {
  return (
    report.location_lat != null ||
    report.location_lng != null ||
    !!report.location_text?.trim()
  );
}

function getMapsUrl(report: FoundReportRow) {
  if (report.location_lat == null || report.location_lng == null) return "";

  return `https://www.google.com/maps?q=${report.location_lat},${report.location_lng}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message) return message;
  }

  return fallback;
}

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("active");
  const [reports, setReports] = useState<FoundReportRow[]>([]);
  const [ownedPetIds, setOwnedPetIds] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!user?.id) return;

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
        setReports([]);
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
        .in("pet_id", petIds)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports((data ?? []) as FoundReportRow[]);
    } catch (error) {
      console.error("MyReports load error:", error);

      setErrorMsg(
        getErrorMessage(error, "No se pudieron cargar tus reportes.")
      );
      setReports([]);
      setOwnedPetIds([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setReports([]);
      setOwnedPetIds([]);
      setErrorMsg("");
      setSuccessMsg("");
      setActionLoadingId(null);
      setLoading(false);
      return;
    }

    void loadReports();
  }, [authLoading, user?.id, loadReports]);

  const newReports = useMemo(
    () => reports.filter((report) => report.status === "new"),
    [reports]
  );

  const activeReports = useMemo(
    () =>
      reports.filter(
        (report) => report.status === "new" || report.status === "viewed"
      ),
    [reports]
  );

  const historyReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          report.status === "resolved" || report.status === "dismissed"
      ),
    [reports]
  );

  const reportsWithLocation = useMemo(
    () => reports.filter((report) => hasLocation(report)),
    [reports]
  );

  const visibleReports = tab === "active" ? activeReports : historyReports;

  const getOwnedReportOrThrow = (reportId: string) => {
    const report = reports.find((item) => item.id === reportId);

    if (!report?.pet_id || !ownedPetIds.includes(report.pet_id)) {
      throw new Error("No tienes permisos para modificar este reporte.");
    }

    return report;
  };

  const markAsResolved = async (reportId: string) => {
    setActionLoadingId(reportId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const report = getOwnedReportOrThrow(reportId);
      const resolvedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("found_reports")
        .update({
          status: "resolved",
          resolved_at: resolvedAt,
        })
        .eq("id", reportId)
        .eq("pet_id", report.pet_id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No se encontró un reporte válido para actualizar.");
      }

      setReports((prev) =>
        prev.map((item) =>
          item.id === reportId
            ? {
                ...item,
                status: "resolved",
                resolved_at: resolvedAt,
              }
            : item
        )
      );

      setSuccessMsg("Reporte marcado como resuelto.");
    } catch (error) {
      console.error("MyReports markAsResolved error:", error);

      setErrorMsg(
        getErrorMessage(error, "No se pudo marcar el reporte como resuelto.")
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const dismissReport = async (reportId: string) => {
    setActionLoadingId(reportId);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const report = getOwnedReportOrThrow(reportId);

      const { data, error } = await supabase
        .from("found_reports")
        .update({
          status: "dismissed",
        })
        .eq("id", reportId)
        .eq("pet_id", report.pet_id)
        .select("id")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error("No se encontró un reporte válido para actualizar.");
      }

      setReports((prev) =>
        prev.map((item) =>
          item.id === reportId
            ? {
                ...item,
                status: "dismissed",
              }
            : item
        )
      );

      setSuccessMsg("Reporte ignorado correctamente.");
    } catch (error) {
      console.error("MyReports dismissReport error:", error);

      setErrorMsg(getErrorMessage(error, "No se pudo ignorar el reporte."));
    } finally {
      setActionLoadingId(null);
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
                Inicia sesión para ver tus reportes
              </div>

              <p className="mt-3 text-sm leading-7 text-white/70">
                Necesitas una cuenta Mokko para revisar reportes, ubicaciones y
                mensajes recibidos desde el perfil público.
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
                      Mis reportes
                    </span>

                    <div className="space-y-4">
                      <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                        Reportes de{" "}
                        <span className="text-[#E8C547]">mascotas</span>
                      </h1>

                      <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Revisa reportes activos, historial y ubicaciones
                        recibidas desde el perfil público.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadReports()}
                    disabled={loading || authLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {loading ? "Actualizando..." : "Recargar reportes"}
                  </button>
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

              <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  icon={Clock3}
                  label="Nuevos"
                  value={newReports.length}
                  description="Pendientes."
                  highlight={newReports.length > 0}
                />

                <MetricCard
                  icon={AlertTriangle}
                  label="Activos"
                  value={activeReports.length}
                  description="Por revisar."
                  highlight={activeReports.length > 0}
                />

                <MetricCard
                  icon={CheckCircle2}
                  label="Historial"
                  value={historyReports.length}
                  description="Cerrados."
                />

                <MetricCard
                  icon={MapPinned}
                  label="Ubicación"
                  value={reportsWithLocation.length}
                  description="Con datos."
                />
              </section>

              <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur-sm sm:p-5 md:rounded-[32px]">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTab("active")}
                    className={`rounded-2xl px-4 py-4 text-sm font-semibold transition sm:py-3.5 ${
                      tab === "active"
                        ? "bg-[#E8C547] text-[#1A1A14]"
                        : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Activos ({activeReports.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab("history")}
                    className={`rounded-2xl px-4 py-4 text-sm font-semibold transition sm:py-3.5 ${
                      tab === "history"
                        ? "bg-[#E8C547] text-[#1A1A14]"
                        : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Historial ({historyReports.length})
                  </button>
                </div>
              </section>

              <section className="mt-7 grid gap-4">
                {loading || authLoading ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/65 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                    Cargando reportes...
                  </div>
                ) : visibleReports.length === 0 ? (
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm md:rounded-[32px]">
                    <div className="text-xl font-semibold">
                      {tab === "active"
                        ? "No tienes reportes activos"
                        : "Aún no tienes historial de reportes"}
                    </div>

                    <p className="mt-2 text-sm leading-7 text-white/65">
                      {tab === "active"
                        ? "Cuando alguien envíe una ubicación o genere un reporte desde el perfil público, aparecerá aquí."
                        : "Los reportes resueltos o ignorados aparecerán en esta sección."}
                    </p>
                  </div>
                ) : (
                  visibleReports.map((report) => {
                    const pet = firstRelation(report.pets);
                    const tag = firstRelation(report.tags);
                    const ubicacionEnviada = hasLocation(report);
                    const mapsUrl = getMapsUrl(report);
                    const isBusy = actionLoadingId === report.id;
                    const isActive =
                      report.status === "new" || report.status === "viewed";

                    return (
                      <article
                        key={report.id}
                        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm transition hover:border-[#E8C547]/20 hover:bg-white/[0.055] md:rounded-[32px] md:p-6"
                      >
                        <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
                          <div className="min-w-0">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141410]">
                                {pet?.photo_url ? (
                                  <img
                                    src={pet.photo_url}
                                    alt={`Foto de ${pet?.name || "Mascota"}`}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs text-white/38">
                                    Sin foto
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="text-2xl font-semibold text-[#F5F0E8]">
                                    {pet?.name || "Mascota"}
                                  </h2>

                                  <StatusPill
                                    className={getStatusClass(report.status)}
                                  >
                                    {getStatusLabel(report.status)}
                                  </StatusPill>
                                </div>

                                <div className="mt-2 text-sm leading-6 text-white/60">
                                  Reportado: {formatDate(report.created_at)}
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {tag?.code && (
                                    <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                      Código {tag.code}
                                    </StatusPill>
                                  )}

                                  <StatusPill
                                    className={getSourceClass(report.source)}
                                  >
                                    {getSourceLabel(report.source)}
                                  </StatusPill>

                                  {ubicacionEnviada && (
                                    <StatusPill className="border-blue-400/20 bg-blue-400/10 text-blue-200">
                                      Ubicación enviada
                                    </StatusPill>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                              <InfoItem
                                label="Estado"
                                value={getStatusLabel(report.status)}
                              />

                              <InfoItem
                                label="Origen"
                                value={getSourceLabel(report.source)}
                              />

                              <InfoItem
                                label="Contacto"
                                value={
                                  report.reporter_phone?.trim() ||
                                  report.reporter_name?.trim() ||
                                  "No especificado"
                                }
                              />

                              <InfoItem
                                label="Ubicación"
                                value={
                                  report.location_text?.trim() ||
                                  (ubicacionEnviada
                                    ? "Coordenadas recibidas"
                                    : "No enviada")
                                }
                              />
                            </div>

                            {(report.note || report.location_text) && (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                <InfoBox
                                  label="Referencia"
                                  value={
                                    report.location_text || "No especificada"
                                  }
                                />

                                <InfoBox
                                  label="Nota"
                                  value={report.note || "Sin nota"}
                                />
                              </div>
                            )}
                          </div>

                          <div className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                              Acciones
                            </div>

                            <div className="mt-4 grid gap-3">
                              <Link
                                to={`/mis-reportes/${report.id}`}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                              >
                                <Eye className="h-4 w-4" />
                                Ver detalle
                              </Link>

                              {pet?.id && (
                                <Link
                                  to={`/mis-mascotas/${pet.id}`}
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  <PawPrint className="h-4 w-4" />
                                  Ver mascota
                                </Link>
                              )}

                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-sm font-medium text-blue-100 transition hover:bg-blue-400/15"
                                >
                                  <MapPinned className="h-4 w-4" />
                                  Ver ubicación
                                </a>
                              )}

                              {isActive && (
                                <>
                                  <ActionButton
                                    icon={XCircle}
                                    variant="neutral"
                                    disabled={isBusy}
                                    onClick={() => void dismissReport(report.id)}
                                  >
                                    {isBusy ? "Actualizando..." : "Ignorar"}
                                  </ActionButton>

                                  <ActionButton
                                    icon={CheckCircle2}
                                    variant="yellow"
                                    disabled={isBusy}
                                    onClick={() =>
                                      void markAsResolved(report.id)
                                    }
                                  >
                                    {isBusy
                                      ? "Actualizando..."
                                      : "Marcar como resuelto"}
                                  </ActionButton>
                                </>
                              )}
                            </div>

                            {report.reporter_phone && (
                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/70">
                                <div className="flex items-start gap-2">
                                  <MessageSquareText className="mt-1 h-4 w-4 shrink-0 text-[#E8C547]" />
                                  <span>
                                    Puedes usar el detalle del reporte para ver
                                    mejor la información recibida.
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </section>
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

      <div className="mt-4 text-3xl font-semibold text-[#F5F0E8]">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
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

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import SectionTitle from "../components/ui/SectionTitle";
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

type BadgeVariant =
  | "neutral"
  | "warm"
  | "green"
  | "success"
  | "info"
  | "danger"
  | "muted";

type FoundReportRow = {
  id: string;
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

function getStatusVariant(status: ReportStatus): BadgeVariant {
  switch (status) {
    case "new":
      return "warm";
    case "viewed":
      return "info";
    case "resolved":
      return "success";
    case "dismissed":
      return "muted";
    default:
      return "neutral";
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

function getSourceVariant(source: ReportSource | null | undefined): BadgeVariant {
  switch (source) {
    case "qr":
      return "warm";
    case "nfc":
      return "green";
    case "manual":
      return "neutral";
    default:
      return "muted";
  }
}

function formatDate(value: string | null) {
  if (!value) return "No disponible";

  try {
    return new Date(value).toLocaleString("es-PE", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
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

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ReportTab>("active");
  const [reports, setReports] = useState<FoundReportRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadReports = async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("found_reports")
        .select(`
          id,
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
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReports((data ?? []) as FoundReportRow[]);
    } catch (error: any) {
      console.error("MyReports load error:", error);
      setErrorMsg(error?.message ?? "No se pudieron cargar tus reportes.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user?.id) return;
    void loadReports();
  }, [authLoading, user?.id]);

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

  const visibleReports = tab === "active" ? activeReports : historyReports;

  const markAsResolved = async (reportId: string) => {
    setActionLoadingId(reportId);
    setErrorMsg("");

    try {
      const resolvedAt = new Date().toISOString();

      const { error } = await supabase
        .from("found_reports")
        .update({
          status: "resolved",
          resolved_at: resolvedAt,
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: "resolved",
                resolved_at: resolvedAt,
              }
            : report
        )
      );
    } catch (error: any) {
      console.error("MyReports markAsResolved error:", error);
      setErrorMsg(
        error?.message ?? "No se pudo marcar el reporte como resuelto."
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const dismissReport = async (reportId: string) => {
    setActionLoadingId(reportId);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("found_reports")
        .update({
          status: "dismissed",
        })
        .eq("id", reportId);

      if (error) throw error;

      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: "dismissed",
              }
            : report
        )
      );
    } catch (error: any) {
      console.error("MyReports dismissReport error:", error);
      setErrorMsg(error?.message ?? "No se pudo ignorar el reporte.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.12),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Mis reportes
              </span>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold sm:text-5xl">
                    Reportes de <span className="text-[#E8C547]">mascotas</span>
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                    Revisa reportes activos, historial y ubicaciones recibidas
                    desde el perfil público.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={tab === "active" ? "primary" : "ghost"}
                    onClick={() => setTab("active")}
                  >
                    Activos ({activeReports.length})
                  </Button>

                  <Button
                    variant={tab === "history" ? "primary" : "ghost"}
                    onClick={() => setTab("history")}
                  >
                    Historial ({historyReports.length})
                  </Button>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <Card variant="panelWarm" className="mt-8 p-6">
                <SectionTitle title="Resumen de reportes" />

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <MiniStat label="Nuevos" value={String(newReports.length)} />
                  <MiniStat label="Activos" value={String(activeReports.length)} />
                  <MiniStat label="Historial" value={String(historyReports.length)} />
                </div>
              </Card>

              <div className="mt-8 grid gap-4">
                {loading || authLoading ? (
                  <Card variant="dark" className="p-8 text-center text-white/65">
                    Cargando reportes...
                  </Card>
                ) : visibleReports.length === 0 ? (
                  <Card variant="dark" className="p-8">
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
                  </Card>
                ) : (
                  visibleReports.map((report) => {
                    const pet = firstRelation(report.pets);
                    const tag = firstRelation(report.tags);
                    const ubicacionEnviada = hasLocation(report);

                    return (
                      <Card key={report.id} variant="subtle" className="p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex gap-4">
                            <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#E8C547]/8 bg-white/5">
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

                            <div>
                              <div className="text-xl font-semibold text-[#F5F0E8]">
                                {pet?.name || "Mascota"}
                              </div>

                              <div className="mt-1 text-sm text-white/55">
                                Reportado: {formatDate(report.created_at)}
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant={getStatusVariant(report.status)}>
                                  {getStatusLabel(report.status)}
                                </Badge>

                                {tag?.code && <Badge>Código: {tag.code}</Badge>}

                                <Badge variant={getSourceVariant(report.source)}>
                                  {getSourceLabel(report.source)}
                                </Badge>

                                {ubicacionEnviada && (
                                  <Badge variant="info">Ubicación enviada</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link to={`/mis-reportes/${report.id}`} className="contents">
                              <Button variant="ghost">Ver detalle</Button>
                            </Link>

                            {(report.status === "new" ||
                              report.status === "viewed") && (
                              <>
                                <Button
                                  variant="ghost"
                                  onClick={() => void dismissReport(report.id)}
                                  disabled={actionLoadingId === report.id}
                                >
                                  Ignorar
                                </Button>

                                <Button
                                  variant="primary"
                                  onClick={() => void markAsResolved(report.id)}
                                  disabled={actionLoadingId === report.id}
                                >
                                  Marcar como resuelto
                                </Button>
                              </>
                            )}
                          </div>
                        </div>

                        {(report.note || report.location_text) && (
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <InfoBox
                              label="Referencia"
                              value={report.location_text || "No especificada"}
                            />
                            <InfoBox
                              label="Nota"
                              value={report.note || "Sin nota"}
                            />
                          </div>
                        )}
                      </Card>
                    );
                  })
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card
      variant="dark"
      className="rounded-2xl p-4 shadow-none backdrop-blur-none"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[#F5F0E8]">
        {value}
      </div>
    </Card>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card
      variant="dark"
      className="rounded-2xl p-4 shadow-none backdrop-blur-none"
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/80">{value}</div>
    </Card>
  );
}
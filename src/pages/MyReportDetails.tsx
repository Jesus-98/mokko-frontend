import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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

type ReportSource = "qr" | "nfc" | "manual" | "unknown";
type ReportStatus = "new" | "viewed" | "resolved" | "dismissed";

type BadgeVariant =
  | "neutral"
  | "warm"
  | "green"
  | "success"
  | "info"
  | "danger"
  | "muted";

type FoundReportDetailRow = {
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

function hasLocation(report: FoundReportDetailRow | null) {
  if (!report) return false;

  return (
    report.location_lat != null ||
    report.location_lng != null ||
    !!report.location_text?.trim()
  );
}

export default function MyReportDetails() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<FoundReportDetailRow | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadReport = async () => {
    if (!user?.id || !id) return;

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
        .eq("id", id)
        .single();

      if (error) throw error;

      const reportData = data as FoundReportDetailRow;

      if (reportData.status === "new") {
        const viewedAt = new Date().toISOString();

        const { error: updateError } = await supabase
          .from("found_reports")
          .update({
            status: "viewed",
            viewed_at: viewedAt,
          })
          .eq("id", reportData.id);

        if (!updateError) {
          reportData.status = "viewed";
          reportData.viewed_at = viewedAt;
        } else {
          console.error("MyReportDetails mark viewed error:", updateError);
        }
      }

      setReport(reportData);
    } catch (error: any) {
      console.error("MyReportDetails load error:", error);
      setErrorMsg(error?.message ?? "No se pudo cargar el reporte.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user?.id || !id) return;
    void loadReport();
  }, [authLoading, user?.id, id]);

  const pet = useMemo(() => firstRelation(report?.pets), [report]);
  const tag = useMemo(() => firstRelation(report?.tags), [report]);
  const ubicacionEnviada = useMemo(() => hasLocation(report), [report]);

  const mapUrl = useMemo(() => {
    if (report?.location_lat == null || report?.location_lng == null) return "";
    return `https://www.google.com/maps?q=${report.location_lat},${report.location_lng}`;
  }, [report?.location_lat, report?.location_lng]);

  const markAsResolved = async () => {
    if (!report) return;

    setActionLoading(true);
    setErrorMsg("");

    try {
      const resolvedAt = new Date().toISOString();

      const { error } = await supabase
        .from("found_reports")
        .update({
          status: "resolved",
          resolved_at: resolvedAt,
        })
        .eq("id", report.id);

      if (error) throw error;

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: "resolved",
              resolved_at: resolvedAt,
            }
          : prev
      );
    } catch (error: any) {
      console.error("MyReportDetails markAsResolved error:", error);
      setErrorMsg(error?.message ?? "No se pudo marcar como resuelto.");
    } finally {
      setActionLoading(false);
    }
  };

  const dismissReport = async () => {
    if (!report) return;

    setActionLoading(true);
    setErrorMsg("");

    try {
      const { error } = await supabase
        .from("found_reports")
        .update({
          status: "dismissed",
        })
        .eq("id", report.id);

      if (error) throw error;

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: "dismissed",
            }
          : prev
      );
    } catch (error: any) {
      console.error("MyReportDetails dismissReport error:", error);
      setErrorMsg(error?.message ?? "No se pudo ignorar el reporte.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.12),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    Detalle de reporte
                  </span>

                  <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
                    {pet?.name || "Reporte"}
                  </h1>

                  <p className="mt-3 text-sm leading-7 text-white/70 sm:text-base">
                    Revisa la información enviada desde el perfil público.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link to="/mis-reportes" className="contents">
                    <Button variant="ghost">Volver</Button>
                  </Link>

                  {report && (report.status === "new" || report.status === "viewed") && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => void dismissReport()}
                        disabled={actionLoading}
                      >
                        Ignorar
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => void markAsResolved()}
                        disabled={actionLoading}
                      >
                        Marcar como resuelto
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              {loading || authLoading ? (
                <Card variant="dark" className="mt-8 p-8 text-center text-white/65">
                  Cargando reporte...
                </Card>
              ) : !report ? (
                <Card variant="dark" className="mt-8 p-8">
                  <div className="text-xl font-semibold">
                    No se encontró el reporte
                  </div>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Puede que no exista o que no tengas permiso para verlo.
                  </p>
                </Card>
              ) : (
                <div className="mt-8 grid gap-6">
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <Card variant="panel" className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <SectionTitle
                          title="Información del reporte"
                          description="Detalle enviado desde el perfil público."
                        />

                        <div className="flex flex-wrap gap-2">
                          <Badge variant={getStatusVariant(report.status)}>
                            {getStatusLabel(report.status)}
                          </Badge>

                          <Badge variant={getSourceVariant(report.source)}>
                            {getSourceLabel(report.source)}
                          </Badge>

                          {ubicacionEnviada && (
                            <Badge variant="info">Ubicación enviada</Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <InfoCard label="Mascota" value={pet?.name || "No disponible"} />
                        <InfoCard label="Código" value={tag?.code || "No disponible"} />
                        <InfoCard label="Creado" value={formatDate(report.created_at)} />
                        <InfoCard label="Revisado" value={formatDate(report.viewed_at)} />
                        <InfoCard label="Resuelto" value={formatDate(report.resolved_at)} />
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
                        <InfoArea
                          label="Nota"
                          value={report.note || "Sin nota"}
                        />
                      </div>

                      {(report.reporter_name || report.reporter_phone) && (
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
                      )}
                    </Card>

                    <div className="space-y-6">
                      <Card variant="panelGreen" className="p-6">
                        <SectionTitle title="Ubicación" />

                        <Card
                          variant="dark"
                          className="mt-4 rounded-[24px] p-5 shadow-none backdrop-blur-none"
                        >
                          <div className="flex flex-col gap-4">
                            <div>
                              <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                Coordenadas
                              </div>
                              <div className="mt-2 text-sm leading-7 text-white/80">
                                {report.location_lat != null && report.location_lng != null
                                  ? `${report.location_lat}, ${report.location_lng}`
                                  : "No disponibles"}
                              </div>
                            </div>

                            {mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="contents"
                              >
                                <Button variant="primary">Abrir en mapa</Button>
                              </a>
                            ) : (
                              <Button variant="ghost" disabled>
                                Sin ubicación exacta
                              </Button>
                            )}
                          </div>
                        </Card>
                      </Card>

                      <Card variant="panel" className="p-6">
                        <SectionTitle title="Mascota" />

                        <Card
                          variant="dark"
                          className="mt-4 rounded-[24px] p-4 shadow-none backdrop-blur-none"
                        >
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
                        </Card>
                      </Card>
                    </div>
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

function InfoCard({
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
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-white/85">{value}</div>
    </Card>
  );
}

function InfoArea({
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
      <div className="text-[11px] uppercase tracking-[0.16em] text-white/42">
        {label}
      </div>
      <div className="mt-2 text-sm leading-7 text-white/80">{value}</div>
    </Card>
  );
}
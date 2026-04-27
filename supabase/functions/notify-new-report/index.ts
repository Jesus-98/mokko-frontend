import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const GMAIL_SMTP_USER = Deno.env.get("GMAIL_SMTP_USER");
const GMAIL_SMTP_APP_PASSWORD = Deno.env.get("GMAIL_SMTP_APP_PASSWORD");
const PUBLIC_SITE_URL =
  Deno.env.get("PUBLIC_SITE_URL") || "https://www.mokkopet.com";

if (!SUPABASE_URL) throw new Error("Falta SUPABASE_URL");
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
}
if (!GMAIL_SMTP_USER) throw new Error("Falta GMAIL_SMTP_USER");
if (!GMAIL_SMTP_APP_PASSWORD) {
  throw new Error("Falta GMAIL_SMTP_APP_PASSWORD");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  },
});

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_SMTP_USER,
    pass: GMAIL_SMTP_APP_PASSWORD,
  },
});

type FoundReportWebhookPayload = {
  record?: {
    id?: string;
    pet_id?: string | null;
    status?: string | null;
  };
};

type ReportRow = {
  id: string;
  pet_id: string | null;
  status: string | null;
  created_at: string | null;
  location_text: string | null;
  note: string | null;
};

type PetRow = {
  id: string;
  name: string | null;
  owner_user_id: string;
};

type OwnerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function ok(body: unknown, status = 200) {
  return jsonResponse({ ok: true, ...((body as object) || {}) }, status);
}

function fail(error: string, status = 500, extra?: Record<string, unknown>) {
  return jsonResponse(
    {
      ok: false,
      error,
      ...(extra || {}),
    },
    status
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function buildReportUrl(reportId: string) {
  return `${PUBLIC_SITE_URL}/login?next=/mis-reportes/${reportId}`;
}

function buildEmailHtml(params: {
  ownerName: string;
  petName: string;
  locationText: string;
  noteText: string;
  reportUrl: string;
  subject: string;
}) {
  const safeOwnerName = escapeHtml(params.ownerName);
  const safePetName = escapeHtml(params.petName);
  const safeLocationText = escapeHtml(params.locationText);
  const safeNoteText = escapeHtml(params.noteText);
  const safeReportUrl = escapeHtml(params.reportUrl);
  const safeSubject = escapeHtml(params.subject);

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeSubject}</title>
      </head>
      <body style="margin:0;padding:0;background:#0f110d;font-family:Arial,Helvetica,sans-serif;color:#f5f0e8;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f110d;padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:linear-gradient(180deg,#171912 0%,#11130f 100%);border:1px solid rgba(232,197,71,0.18);border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="padding:32px 32px 12px 32px;">
                    <div style="display:inline-block;padding:8px 14px;border:1px solid rgba(232,197,71,0.22);border-radius:999px;background:rgba(232,197,71,0.08);color:#e8c547;font-size:12px;font-weight:700;letter-spacing:.04em;">
                      Mokko
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 32px 8px 32px;">
                    <h1 style="margin:0;font-size:32px;line-height:1.2;color:#f5f0e8;font-weight:800;">
                      Tienes un nuevo reporte
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 32px;">
                    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.8;color:#d7d2c8;">
                      Hola ${safeOwnerName},
                    </p>

                    <p style="margin:0 0 14px 0;font-size:16px;line-height:1.8;color:#d7d2c8;">
                      Se registró un nuevo reporte para <strong style="color:#f5f0e8;">${safePetName}</strong>.
                    </p>

                    ${
                      safeLocationText
                        ? `
                          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.8;color:#d7d2c8;">
                            <strong>Ubicación reportada:</strong> ${safeLocationText}
                          </p>
                        `
                        : ""
                    }

                    ${
                      safeNoteText
                        ? `
                          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.8;color:#d7d2c8;">
                            <strong>Detalle:</strong> ${safeNoteText}
                          </p>
                        `
                        : ""
                    }

                    <p style="margin:0 0 14px 0;font-size:15px;line-height:1.8;color:#d7d2c8;">
                      Ingresa a tu cuenta para revisar el detalle completo del reporte.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:16px 32px 8px 32px;">
                    <a
                      href="${safeReportUrl}"
                      style="display:inline-block;background:#e8c547;color:#1a1a14;text-decoration:none;font-size:16px;font-weight:700;padding:14px 24px;border-radius:14px;"
                    >
                      Ver detalle del reporte
                    </a>
                  </td>
                </tr>

                <tr>
                  <td style="padding:12px 32px 0 32px;">
                    <p style="margin:0;font-size:13px;line-height:1.8;color:#a9a49a;">
                      Si el botón no funciona, copia y pega este enlace:
                    </p>
                    <p style="margin:8px 0 0 0;font-size:13px;line-height:1.7;word-break:break-all;color:#e8c547;">
                      ${safeReportUrl}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px 0 32px;">
                    <div style="height:1px;background:rgba(255,255,255,0.08);"></div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:20px 32px 32px 32px;">
                    <p style="margin:0;font-size:14px;line-height:1.8;color:#a9a49a;">
                      — Equipo Mokko
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function getReport(reportId: string) {
  const { data, error } = await supabase
    .from("found_reports")
    .select("id, pet_id, status, created_at, location_text, note")
    .eq("id", reportId)
    .maybeSingle<ReportRow>();

  if (error) {
    throw new Error(`Error cargando found_reports: ${error.message}`);
  }

  return data;
}

async function getPet(petId: string) {
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, owner_user_id")
    .eq("id", petId)
    .maybeSingle<PetRow>();

  if (error) {
    throw new Error(`Error cargando pets: ${error.message}`);
  }

  return data;
}

async function getOwner(ownerUserId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", ownerUserId)
    .maybeSingle<OwnerRow>();

  if (error) {
    throw new Error(`Error cargando profiles: ${error.message}`);
  }

  return data;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return fail("Método no permitido", 405);
    }

    const payload = (await req.json()) as FoundReportWebhookPayload;

    const reportId = payload?.record?.id;
    const petId = payload?.record?.pet_id;
    const incomingStatus = normalizeStatus(payload?.record?.status);

    if (!reportId || !petId) {
      return fail("Falta reportId o petId en el payload.", 400);
    }

    if (incomingStatus && incomingStatus !== "new") {
      return ok({
        skipped: true,
        message: "Se omitió el envío porque el reporte no está en estado new.",
      });
    }

    const reportRow = await getReport(reportId);

    if (!reportRow) {
      return fail("No se encontró el reporte.", 404);
    }

    const reportStatus = normalizeStatus(reportRow.status);
    if (reportStatus !== "new") {
      return ok({
        skipped: true,
        message: "Se omitió el envío porque el reporte ya no está en estado new.",
      });
    }

    if (!reportRow.pet_id) {
      return fail("El reporte no tiene pet_id asociado.", 400);
    }

    const petRow = await getPet(reportRow.pet_id);

    if (!petRow) {
      return fail("No se encontró la mascota asociada al reporte.", 404);
    }

    const ownerRow = await getOwner(petRow.owner_user_id);

    if (!ownerRow?.email) {
      return ok({
        skipped: true,
        message: "El dueño no tiene correo registrado.",
      });
    }

    const ownerName = ownerRow.full_name?.trim() || "Hola";
    const petName = petRow.name?.trim() || "tu mascota";
    const locationText = reportRow.location_text?.trim() || "";
    const noteText = reportRow.note?.trim() || "";
    const reportUrl = buildReportUrl(reportId);
    const subject = `Nuevo reporte para ${petName}`;

    const html = buildEmailHtml({
      ownerName,
      petName,
      locationText,
      noteText,
      reportUrl,
      subject,
    });

    const info = await transporter.sendMail({
      from: `Mokko <${GMAIL_SMTP_USER}>`,
      to: ownerRow.email,
      subject,
      html,
    });

    return ok({
      message: "Correo enviado correctamente.",
      data: {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      },
    });
  } catch (error) {
    const err = error as Error & {
      code?: string;
      responseCode?: number;
      command?: string;
      stack?: string;
    };

    console.error("notify-new-report error:", {
      message: err?.message,
      code: err?.code,
      responseCode: err?.responseCode,
      command: err?.command,
      stack: err?.stack,
    });

    return fail(err?.message || "Error inesperado", 500, {
      code: err?.code || null,
      responseCode: err?.responseCode || null,
      command: err?.command || null,
    });
  }
});
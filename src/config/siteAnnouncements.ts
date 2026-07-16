import { supabase } from "../lib/supabase";

export type SiteAnnouncement = {
  id: string;
  code: string;
  campaignCode: string | null;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  startsAt: string;
  endsAt: string | null;
};

export type SiteAnnouncementState = {
  announcement: SiteAnnouncement | null;
  nextChangeAt: string | null;
};

type AnnouncementRpcRow = {
  id: string | null;
  code: string | null;
  campaign_code: string | null;
  message: string | null;
  link_url: string | null;
  link_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  next_change_at: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeLinkUrl(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) return null;

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("#") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("http://")
  ) {
    return normalized;
  }

  console.warn("Se ignoró un enlace de anuncio no permitido:", normalized);
  return null;
}

export async function loadSiteAnnouncementState(): Promise<SiteAnnouncementState> {
  const { data, error } = await supabase.rpc("get_site_announcement_state");

  if (error) {
    throw new Error(error.message || "No se pudo cargar el anuncio del sitio.");
  }

  const row = ((data ?? [])[0] ?? null) as AnnouncementRpcRow | null;

  if (!row) {
    return { announcement: null, nextChangeAt: null };
  }

  const message = normalizeOptionalText(row.message);
  const hasAnnouncement = Boolean(
    row.id && row.code && message && row.starts_at
  );

  return {
    announcement: hasAnnouncement
      ? {
          id: row.id as string,
          code: row.code as string,
          campaignCode: normalizeOptionalText(row.campaign_code),
          message: message as string,
          linkUrl: normalizeLinkUrl(row.link_url),
          linkLabel: normalizeOptionalText(row.link_label),
          startsAt: row.starts_at as string,
          endsAt: row.ends_at,
        }
      : null,
    nextChangeAt: row.next_change_at,
  };
}

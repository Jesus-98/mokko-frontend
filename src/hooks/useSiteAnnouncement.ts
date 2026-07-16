import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadSiteAnnouncementState,
  type SiteAnnouncement,
} from "../config/siteAnnouncements";

const FALLBACK_REFRESH_MS = 10 * 60 * 1000;
const MIN_REFRESH_DELAY_MS = 1_000;

export function useSiteAnnouncement() {
  const [announcement, setAnnouncement] =
    useState<SiteAnnouncement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    clearRefreshTimer();

    try {
      const state = await loadSiteAnnouncementState();

      if (!isMountedRef.current) return;

      setAnnouncement(state.announcement);

      const nextChangeTimestamp = state.nextChangeAt
        ? new Date(state.nextChangeAt).getTime()
        : Number.NaN;

      const delay = Number.isFinite(nextChangeTimestamp)
        ? Math.max(
            nextChangeTimestamp - Date.now() + MIN_REFRESH_DELAY_MS,
            MIN_REFRESH_DELAY_MS
          )
        : FALLBACK_REFRESH_MS;

      refreshTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, Math.min(delay, FALLBACK_REFRESH_MS));
    } catch (error) {
      if (!isMountedRef.current) return;

      setAnnouncement(null);
      console.warn(
        "No se pudo cargar el anuncio activo. La franja permanecerá oculta.",
        error
      );

      refreshTimerRef.current = window.setTimeout(() => {
        void refresh();
      }, FALLBACK_REFRESH_MS);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [clearRefreshTimer]);

  useEffect(() => {
    isMountedRef.current = true;
    void refresh();

    return () => {
      isMountedRef.current = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, refresh]);

  return { announcement, isLoading, refresh };
}

import { supabase } from "../../lib/supabase";
import type { AdminReportRow } from "../../types/admin";

export async function getAdminReports() {
  const { data, error } = await supabase
    .from("found_reports")
    .select(`
      id,
      status,
      reporter_name,
      reporter_phone,
      location_text,
      created_at,
      viewed_at,
      resolved_at,
      pet_id,
      tag_id
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as AdminReportRow[] | null) ?? [];
}
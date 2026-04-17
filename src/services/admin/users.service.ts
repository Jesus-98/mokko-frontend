import { supabase } from "../../lib/supabase";
import type { AdminUserRow } from "../../types/admin";

export async function getAdminUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, whatsapp_phone, city, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as AdminUserRow[] | null) ?? [];
}
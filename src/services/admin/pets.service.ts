import { supabase } from "../../lib/supabase";
import type { AdminPetRow } from "../../types/admin";

export async function getAdminPets() {
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, species, color, is_active, created_at, owner_user_id")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as AdminPetRow[] | null) ?? [];
}
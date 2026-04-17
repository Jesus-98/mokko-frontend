import { supabase } from "../../lib/supabase";
import type { AdminOrderRow } from "../../types/admin";

export async function getAdminOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      currency,
      sales_channel,
      guest_name,
      guest_phone,
      notes,
      whatsapp_thread,
      created_at,
      customer_user_id
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as AdminOrderRow[] | null) ?? [];
}
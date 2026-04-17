export type AdminModuleKey =
  | "orders"
  | "inventory_tags"
  | "users"
  | "pets"
  | "reports";

export type AdminModuleItem = {
  key: AdminModuleKey;
  title: string;
  description: string;
  href: string;
};

export type AdminMetrics = {
  totalOrders: number;
  pendingPaymentOrders: number;
  inProductionOrders: number;
  deliveredOrders: number;
  newReports: number;
  activePets: number;
  totalUsers: number;
  verifiedRevenueMonth: number;
  verifiedRevenueTotal: number;
};

export type ChartItem = {
  label: string;
  value: number;
};

export type RecentOrder = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  sales_channel: string;
  created_at: string;
  guest_name: string | null;
  guest_phone: string | null;
};

export type AdminOrderRow = {
  id: string;
  order_number: string;
  status: string;
  total: number;
  currency: string;
  sales_channel: string;
  guest_name: string | null;
  guest_phone: string | null;
  notes: string | null;
  whatsapp_thread: string | null;
  created_at: string;
  customer_user_id: string | null;
  customer_name?: string | null;
  customer_city?: string | null;
};

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  city: string | null;
  created_at: string;
  role_codes?: string[];
  pets_count?: number;
  orders_count?: number;
};

export type AdminPetRow = {
  id: string;
  name: string;
  species: string;
  color: string | null;
  is_active: boolean;
  created_at: string;
  owner_user_id: string;
  owner_name?: string | null;
  owner_city?: string | null;
  visibility_status?: string | null;
  medical_profile_enabled?: boolean | null;
};

export type AdminReportRow = {
  id: string;
  status: string;
  reporter_name: string | null;
  reporter_phone: string | null;
  location_text: string | null;
  created_at: string;
  viewed_at: string | null;
  resolved_at: string | null;
  pet_id: string | null;
  tag_id: string;
  pet_name?: string | null;
  tag_code?: string | null;
};

export type FiltersOption = {
  label: string;
  value: string;
};
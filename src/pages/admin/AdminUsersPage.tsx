import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../../components/ui/CustomSelect";
import AdminPageHeader from "../../components/admin/AdminPageHeader";
import AdminFlashMessages from "../../components/admin/AdminFlashMessages";
import AdminAccessDenied from "../../components/admin/AdminAccessDenied";

type RegistrationFilter =
  | "all"
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month";

type PetsFilter = "all" | "with_pets" | "without_pets";
type ActiveTagsFilter = "all" | "with_active_tags" | "without_active_tags";

type QuickFilter =
  | "all"
  | "with_email"
  | "with_phone"
  | "with_location"
  | "with_active_tags";

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  address_line: string | null;
  country_id: string | null;
  division_level_1_id: string | null;
  division_level_2_id: string | null;
  division_level_3_id: string | null;
  created_at: string;
};

type CountryRow = {
  id: string;
  name: string;
  iso2: string;
};

type GeoDivisionRow = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  country_id: string;
};

type PetOwnerRow = {
  id: string;
  owner_user_id: string;
};

type ActivePetTagRow = {
  pet_id: string;
};

type UserViewRow = UserRow & {
  display_name: string;
  display_email: string;
  display_phone: string;
  display_whatsapp: string;
  country_name: string | null;
  division_level_1_name: string | null;
  division_level_2_name: string | null;
  division_level_3_name: string | null;
  location_label: string;
  pets_count: number;
  active_tags_count: number;
};

const ITEMS_PER_PAGE = 10;

const inputClass =
  "w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 disabled:cursor-not-allowed disabled:opacity-60";

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}

function buildLocationLabel(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(", ");
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatCountLabel(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : plural || `${singular}s`}`;
}

function hasText(value: string | null | undefined) {
  return !!value?.trim();
}

function hasLocation(user: UserViewRow) {
  return Boolean(
    user.country_id ||
      user.division_level_1_id ||
      user.division_level_2_id ||
      user.division_level_3_id ||
      user.address_line?.trim()
  );
}

function getPrimaryPhone(user: UserViewRow) {
  return user.whatsapp_phone?.trim() || user.phone?.trim() || "";
}

function getWhatsAppUrl(phone: string | null | undefined) {
  const digits = normalizePhone(phone || "");
  if (!digits) return "";

  return `https://wa.me/${digits}`;
}

function getPhoneCallUrl(phone: string | null | undefined) {
  const digits = normalizePhone(phone || "");
  if (!digits) return "";

  return `tel:${digits}`;
}

function getMailUrl(email: string | null | undefined) {
  const cleanEmail = email?.trim();
  if (!cleanEmail) return "";

  return `mailto:${cleanEmail}`;
}

function matchesRegistrationFilter(
  createdAt: string,
  filter: RegistrationFilter
) {
  if (filter === "all") return true;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (filter === "today") {
    return isSameDay;
  }

  if (filter === "this_month") {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  if (filter === "last_7_days") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    return date >= start && date <= now;
  }

  if (filter === "last_30_days") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 29);
    return date >= start && date <= now;
  }

  return true;
}

function matchesQuickFilter(user: UserViewRow, filter: QuickFilter) {
  if (filter === "all") return true;

  if (filter === "with_email") {
    return hasText(user.email);
  }

  if (filter === "with_phone") {
    return hasText(user.whatsapp_phone) || hasText(user.phone);
  }

  if (filter === "with_location") {
    return hasLocation(user);
  }

  if (filter === "with_active_tags") {
    return user.active_tags_count > 0;
  }

  return true;
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);

  for (
    let page = Math.max(1, currentPage - 1);
    page <= Math.min(totalPages, currentPage + 1);
    page++
  ) {
    pages.add(page);
  }

  const orderedPages = Array.from(pages).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  for (let index = 0; index < orderedPages.length; index++) {
    const page = orderedPages[index];
    const previous = orderedPages[index - 1];

    if (previous && page - previous > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  }

  return items;
}

async function copyText(value: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Tu navegador no permite copiar automáticamente.");
  }

  await navigator.clipboard.writeText(value);
}

export default function AdminUsersPage() {
  const { role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [users, setUsers] = useState<UserViewRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [countryFilter, setCountryFilter] = useState("");
  const [level1Filter, setLevel1Filter] = useState("");
  const [level2Filter, setLevel2Filter] = useState("");
  const [level3Filter, setLevel3Filter] = useState("");
  const [registrationFilter, setRegistrationFilter] =
    useState<RegistrationFilter>("all");
  const [petsFilter, setPetsFilter] = useState<PetsFilter>("all");
  const [activeTagsFilter, setActiveTagsFilter] =
    useState<ActiveTagsFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const loadUsers = useCallback(async () => {
    if (role !== "admin") return;

    setLoading(true);
    setErrorMsg("");
    setWarningMsg("");
    setSuccessMsg("");

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          email,
          phone,
          whatsapp_phone,
          address_line,
          country_id,
          division_level_1_id,
          division_level_2_id,
          division_level_3_id,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (profilesError) {
        throw new Error(profilesError.message);
      }

      const baseUsers = (profilesData ?? []) as UserRow[];
      const warnings: string[] = [];

      const countryIds = uniqueStrings(baseUsers.map((user) => user.country_id));
      const divisionIds = uniqueStrings([
        ...baseUsers.map((user) => user.division_level_1_id),
        ...baseUsers.map((user) => user.division_level_2_id),
        ...baseUsers.map((user) => user.division_level_3_id),
      ]);

      let countriesData: CountryRow[] = [];
      let divisionsData: GeoDivisionRow[] = [];
      let petsData: PetOwnerRow[] = [];
      let activePetTagsData: ActivePetTagRow[] = [];

      if (countryIds.length > 0) {
        const { data: countriesRes, error: countriesError } = await supabase
          .from("countries")
          .select("id, name, iso2")
          .in("id", countryIds);

        if (countriesError) {
          warnings.push(
            "No se pudieron cargar todos los países asociados a los usuarios."
          );
        } else {
          countriesData = (countriesRes ?? []) as CountryRow[];
        }
      }

      if (divisionIds.length > 0) {
        const { data: divisionsRes, error: divisionsError } = await supabase
          .from("geo_divisions")
          .select("id, name, level, parent_id, country_id")
          .in("id", divisionIds);

        if (divisionsError) {
          warnings.push(
            "No se pudieron cargar todas las divisiones geográficas de los usuarios."
          );
        } else {
          divisionsData = (divisionsRes ?? []) as GeoDivisionRow[];
        }
      }

      const { data: petsRes, error: petsError } = await supabase
        .from("pets")
        .select("id, owner_user_id");

      if (petsError) {
        warnings.push(
          "No se pudieron cargar los conteos de mascotas por usuario."
        );
      } else {
        petsData = (petsRes ?? []) as PetOwnerRow[];
      }

      const petIds = uniqueStrings(petsData.map((pet) => pet.id));

      if (petIds.length > 0) {
        const { data: activePetTagsRes, error: activePetTagsError } =
          await supabase
            .from("pet_tags")
            .select("pet_id")
            .eq("status", "active")
            .in("pet_id", petIds);

        if (activePetTagsError) {
          warnings.push(
            "No se pudieron cargar los conteos de placas activas por usuario."
          );
        } else {
          activePetTagsData = (activePetTagsRes ?? []) as ActivePetTagRow[];
        }
      }

      const countriesMap = new Map(countriesData.map((item) => [item.id, item]));
      const divisionsMap = new Map(divisionsData.map((item) => [item.id, item]));

      const petsCountByUser = new Map<string, number>();
      petsData.forEach((pet) => {
        petsCountByUser.set(
          pet.owner_user_id,
          (petsCountByUser.get(pet.owner_user_id) ?? 0) + 1
        );
      });

      const activeTagsCountByPet = new Map<string, number>();
      activePetTagsData.forEach((row) => {
        activeTagsCountByPet.set(
          row.pet_id,
          (activeTagsCountByPet.get(row.pet_id) ?? 0) + 1
        );
      });

      const activeTagsCountByUser = new Map<string, number>();
      petsData.forEach((pet) => {
        activeTagsCountByUser.set(
          pet.owner_user_id,
          (activeTagsCountByUser.get(pet.owner_user_id) ?? 0) +
            (activeTagsCountByPet.get(pet.id) ?? 0)
        );
      });

      const normalizedUsers: UserViewRow[] = baseUsers.map((user) => {
        const country = user.country_id
          ? countriesMap.get(user.country_id) ?? null
          : null;

        const level1 = user.division_level_1_id
          ? divisionsMap.get(user.division_level_1_id) ?? null
          : null;

        const level2 = user.division_level_2_id
          ? divisionsMap.get(user.division_level_2_id) ?? null
          : null;

        const level3 = user.division_level_3_id
          ? divisionsMap.get(user.division_level_3_id) ?? null
          : null;

        return {
          ...user,
          display_name: user.full_name?.trim() || "Sin nombre",
          display_email: user.email?.trim() || "Sin correo",
          display_phone: user.phone?.trim() || "Sin teléfono",
          display_whatsapp: user.whatsapp_phone?.trim() || "Sin WhatsApp",
          country_name: country?.name || null,
          division_level_1_name: level1?.name || null,
          division_level_2_name: level2?.name || null,
          division_level_3_name: level3?.name || null,
          location_label:
            buildLocationLabel([
              level3?.name,
              level2?.name,
              level1?.name,
              country?.name,
            ]) || "Sin ubicación registrada",
          pets_count: petsCountByUser.get(user.id) ?? 0,
          active_tags_count: activeTagsCountByUser.get(user.id) ?? 0,
        };
      });

      setUsers(normalizedUsers);
      setWarningMsg(warnings.join(" "));
    } catch (error) {
      console.error("AdminUsersPage load error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los usuarios."
      );
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;

    void loadUsers();
  }, [authLoading, role, loadUsers]);

  const totalUsers = users.length;

  const usersWithWhatsApp = useMemo(
    () => users.filter((user) => getPrimaryPhone(user)).length,
    [users]
  );

  const usersWithEmail = useMemo(
    () => users.filter((user) => hasText(user.email)).length,
    [users]
  );

  const usersWithLocation = useMemo(
    () => users.filter((user) => hasLocation(user)).length,
    [users]
  );

  const usersWithActiveTags = useMemo(
    () => users.filter((user) => user.active_tags_count > 0).length,
    [users]
  );

  const countryOptions = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    users.forEach((user) => {
      if (user.country_id && user.country_name) {
        map.set(user.country_id, user.country_name);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [users]);

  const level1Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    users
      .filter((user) => (countryFilter ? user.country_id === countryFilter : true))
      .forEach((user) => {
        if (user.division_level_1_id && user.division_level_1_name) {
          map.set(user.division_level_1_id, user.division_level_1_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [users, countryFilter]);

  const level2Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    users
      .filter((user) => (countryFilter ? user.country_id === countryFilter : true))
      .filter((user) =>
        level1Filter ? user.division_level_1_id === level1Filter : true
      )
      .forEach((user) => {
        if (user.division_level_2_id && user.division_level_2_name) {
          map.set(user.division_level_2_id, user.division_level_2_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [users, countryFilter, level1Filter]);

  const level3Options = useMemo<CustomSelectOption[]>(() => {
    const map = new Map<string, string>();

    users
      .filter((user) => (countryFilter ? user.country_id === countryFilter : true))
      .filter((user) =>
        level1Filter ? user.division_level_1_id === level1Filter : true
      )
      .filter((user) =>
        level2Filter ? user.division_level_2_id === level2Filter : true
      )
      .forEach((user) => {
        if (user.division_level_3_id && user.division_level_3_name) {
          map.set(user.division_level_3_id, user.division_level_3_name);
        }
      });

    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([value, label]) => ({ value, label }));
  }, [users, countryFilter, level1Filter, level2Filter]);

  const registrationOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "today", label: "Hoy" },
    { value: "last_7_days", label: "Últimos 7 días" },
    { value: "last_30_days", label: "Últimos 30 días" },
    { value: "this_month", label: "Este mes" },
  ];

  const petsOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "with_pets", label: "Con mascotas" },
    { value: "without_pets", label: "Sin mascotas" },
  ];

  const activeTagsOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "with_active_tags", label: "Con placa activa" },
    { value: "without_active_tags", label: "Sin placa activa" },
  ];

  const filteredUsers = useMemo(() => {
    const term = normalizeText(searchTerm);

    return users.filter((user) => {
      const matchesCountry = countryFilter
        ? user.country_id === countryFilter
        : true;

      const matchesLevel1 = level1Filter
        ? user.division_level_1_id === level1Filter
        : true;

      const matchesLevel2 = level2Filter
        ? user.division_level_2_id === level2Filter
        : true;

      const matchesLevel3 = level3Filter
        ? user.division_level_3_id === level3Filter
        : true;

      const matchesRegistration = matchesRegistrationFilter(
        user.created_at,
        registrationFilter
      );

      const matchesPets =
        petsFilter === "all"
          ? true
          : petsFilter === "with_pets"
            ? user.pets_count > 0
            : user.pets_count === 0;

      const matchesActiveTags =
        activeTagsFilter === "all"
          ? true
          : activeTagsFilter === "with_active_tags"
            ? user.active_tags_count > 0
            : user.active_tags_count === 0;

      const matchesQuick = matchesQuickFilter(user, quickFilter);

      const haystack = normalizeText(
        [
          user.display_name,
          user.display_email,
          user.display_phone,
          user.display_whatsapp,
          user.address_line || "",
          user.location_label,
          user.country_name || "",
          user.division_level_1_name || "",
          user.division_level_2_name || "",
          user.division_level_3_name || "",
          String(user.pets_count),
          String(user.active_tags_count),
          user.id,
        ].join(" ")
      );

      const matchesSearch = term ? haystack.includes(term) : true;

      return (
        matchesCountry &&
        matchesLevel1 &&
        matchesLevel2 &&
        matchesLevel3 &&
        matchesRegistration &&
        matchesPets &&
        matchesActiveTags &&
        matchesQuick &&
        matchesSearch
      );
    });
  }, [
    users,
    searchTerm,
    countryFilter,
    level1Filter,
    level2Filter,
    level3Filter,
    registrationFilter,
    petsFilter,
    activeTagsFilter,
    quickFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    countryFilter,
    level1Filter,
    level2Filter,
    level3Filter,
    registrationFilter,
    petsFilter,
    activeTagsFilter,
    quickFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const clearFilters = () => {
    setSearchTerm("");
    setCountryFilter("");
    setLevel1Filter("");
    setLevel2Filter("");
    setLevel3Filter("");
    setRegistrationFilter("all");
    setPetsFilter("all");
    setActiveTagsFilter("all");
    setQuickFilter("all");
    setCurrentPage(1);
  };

  const exportCsv = () => {
    if (filteredUsers.length === 0) {
      setErrorMsg("No hay usuarios para exportar con los filtros actuales.");
      return;
    }

    const headers = [
      "Nombre",
      "Correo",
      "Teléfono",
      "WhatsApp",
      "País",
      "Departamento",
      "Provincia",
      "Distrito",
      "Dirección",
      "Ubicación resumida",
      "Mascotas registradas",
      "Placas activas",
      "Fecha de registro",
      "ID",
    ];

    const rows = filteredUsers.map((user) => [
      user.display_name,
      user.email || "",
      user.phone || "",
      user.whatsapp_phone || "",
      user.country_name || "",
      user.division_level_1_name || "",
      user.division_level_2_name || "",
      user.division_level_3_name || "",
      user.address_line || "",
      user.location_label,
      String(user.pets_count),
      String(user.active_tags_count),
      formatDateTime(user.created_at),
      user.id,
    ]);

    const csvContent = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);

    anchor.href = url;
    anchor.download = `mokko-usuarios-${datePart}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    setSuccessMsg("CSV exportado correctamente.");
  };

  const goToPage = () => {
    const parsedPage = Number(pageInput);

    if (!Number.isFinite(parsedPage)) {
      setPageInput(String(currentPage));
      return;
    }

    const safePage = Math.min(Math.max(1, Math.floor(parsedPage)), totalPages);
    setCurrentPage(safePage);
  };

  if (!authLoading && role !== "admin") {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <AdminAccessDenied message="No tienes permisos para acceder a la gestión de usuarios." />
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-7xl">
              <AdminPageHeader
                badge="Admin · Usuarios"
                title="Gestión de usuarios"
                description="Revisa usuarios registrados, ubicación, contacto, mascotas y placas activas."
                actions={
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={loading || filteredUsers.length === 0}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadUsers()}
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      {loading ? "Actualizando..." : "Recargar usuarios"}
                    </button>
                  </div>
                }
              />

              <AdminFlashMessages
                success={successMsg}
                error={errorMsg}
                warning={errorMsg ? "" : warningMsg}
                className="mt-6"
              />

              {loading ? (
                <div className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-10 text-center text-white/65">
                  Cargando usuarios...
                </div>
              ) : (
                <>
                  <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                    <StatCard
                      label="Total"
                      value={totalUsers}
                      variant="green"
                      active={quickFilter === "all"}
                      onClick={() => setQuickFilter("all")}
                    />

                    <StatCard
                      label="Con correo"
                      value={usersWithEmail}
                      variant="neutral"
                      active={quickFilter === "with_email"}
                      onClick={() => setQuickFilter("with_email")}
                    />

                    <StatCard
                      label="Con teléfono"
                      value={usersWithWhatsApp}
                      variant="yellow"
                      active={quickFilter === "with_phone"}
                      onClick={() => setQuickFilter("with_phone")}
                    />

                    <StatCard
                      label="Con ubicación"
                      value={usersWithLocation}
                      variant="neutral"
                      active={quickFilter === "with_location"}
                      onClick={() => setQuickFilter("with_location")}
                    />

                    <StatCard
                      label="Con placas"
                      value={usersWithActiveTags}
                      variant="yellow"
                      active={quickFilter === "with_active_tags"}
                      onClick={() => setQuickFilter("with_active_tags")}
                    />
                  </section>

                  <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Filtros</h2>
                        <p className="mt-2 text-sm leading-7 text-white/60">
                          Busca por nombre, correo, teléfono, WhatsApp, dirección,
                          ubicación o ID de usuario.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={clearFilters}
                        className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto"
                      >
                        Limpiar filtros
                      </button>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.35fr_0.8fr_0.8fr_0.8fr]">
                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Buscar usuario
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Nombre, correo, teléfono, dirección..."
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Registro
                        </label>
                        <CustomSelect
                          value={registrationFilter}
                          onChange={(nextValue) =>
                            setRegistrationFilter(nextValue as RegistrationFilter)
                          }
                          options={registrationOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Mascotas
                        </label>
                        <CustomSelect
                          value={petsFilter}
                          onChange={(nextValue) =>
                            setPetsFilter(nextValue as PetsFilter)
                          }
                          options={petsOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Placas activas
                        </label>
                        <CustomSelect
                          value={activeTagsFilter}
                          onChange={(nextValue) =>
                            setActiveTagsFilter(nextValue as ActiveTagsFilter)
                          }
                          options={activeTagsOptions}
                          placeholder="Todos"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-4">
                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          País
                        </label>
                        <CustomSelect
                          value={countryFilter}
                          onChange={(nextValue) => {
                            setCountryFilter(nextValue);
                            setLevel1Filter("");
                            setLevel2Filter("");
                            setLevel3Filter("");
                          }}
                          options={countryOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Departamento
                        </label>
                        <CustomSelect
                          value={level1Filter}
                          onChange={(nextValue) => {
                            setLevel1Filter(nextValue);
                            setLevel2Filter("");
                            setLevel3Filter("");
                          }}
                          options={level1Options}
                          placeholder="Todos"
                          disabled={!countryFilter && level1Options.length === 0}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Provincia
                        </label>
                        <CustomSelect
                          value={level2Filter}
                          onChange={(nextValue) => {
                            setLevel2Filter(nextValue);
                            setLevel3Filter("");
                          }}
                          options={level2Options}
                          placeholder="Todos"
                          disabled={!level1Filter && level2Options.length === 0}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Distrito
                        </label>
                        <CustomSelect
                          value={level3Filter}
                          onChange={(nextValue) => setLevel3Filter(nextValue)}
                          options={level3Options}
                          placeholder="Todos"
                          disabled={!level2Filter && level3Options.length === 0}
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white/60">
                      Mostrando{" "}
                      <span className="font-semibold text-white">
                        {filteredUsers.length}
                      </span>{" "}
                      usuario{filteredUsers.length === 1 ? "" : "s"}.
                    </div>
                  </section>

                  <section className="mt-8 grid gap-5">
                    {filteredUsers.length === 0 ? (
                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                        <div className="text-2xl font-semibold">
                          No se encontraron usuarios
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/65">
                          Ajusta la búsqueda o los filtros para ver otros
                          resultados.
                        </p>
                      </div>
                    ) : (
                      paginatedUsers.map((user) => {
                        const primaryPhone = getPrimaryPhone(user);
                        const whatsappUrl = getWhatsAppUrl(primaryPhone);
                        const callUrl = getPhoneCallUrl(primaryPhone);
                        const mailUrl = getMailUrl(user.email);

                        return (
                          <article
                            key={user.id}
                            className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6"
                          >
                            <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h2 className="break-words text-2xl font-semibold">
                                    {user.display_name}
                                  </h2>

                                  <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                    {formatCountLabel(
                                      user.pets_count,
                                      "mascota",
                                      "mascotas"
                                    )}
                                  </StatusPill>

                                  <StatusPill
                                    className={
                                      user.active_tags_count > 0
                                        ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200"
                                        : "border-white/10 bg-white/5 text-white/70"
                                    }
                                  >
                                    {formatCountLabel(
                                      user.active_tags_count,
                                      "placa activa",
                                      "placas activas"
                                    )}
                                  </StatusPill>
                                </div>

                                <div className="mt-4 grid gap-2 text-sm text-white/62 sm:grid-cols-2 xl:grid-cols-3">
                                  <SmallInfo
                                    label="Correo"
                                    value={user.display_email}
                                  />
                                  <SmallInfo
                                    label="Teléfono"
                                    value={user.phone || "—"}
                                  />
                                  <SmallInfo
                                    label="WhatsApp"
                                    value={user.whatsapp_phone || "—"}
                                  />
                                  <SmallInfo
                                    label="Registro"
                                    value={formatDateTime(user.created_at)}
                                  />
                                  <SmallInfo
                                    label="Mascotas"
                                    value={String(user.pets_count)}
                                  />
                                  <SmallInfo
                                    label="Placas activas"
                                    value={String(user.active_tags_count)}
                                  />
                                </div>

                                <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                                  <span className="text-white/45">
                                    Ubicación:
                                  </span>{" "}
                                  {user.location_label}
                                </div>

                                {user.address_line && (
                                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                                    <span className="text-white/45">
                                      Dirección:
                                    </span>{" "}
                                    {user.address_line}
                                  </div>
                                )}

                                {expandedUserId === user.id && (
                                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                                    <InfoBox
                                      label="País"
                                      value={user.country_name || "No registrado"}
                                    />
                                    <InfoBox
                                      label="Departamento"
                                      value={
                                        user.division_level_1_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Provincia"
                                      value={
                                        user.division_level_2_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Distrito"
                                      value={
                                        user.division_level_3_name ||
                                        "No registrado"
                                      }
                                    />
                                    <InfoBox
                                      label="Mascotas registradas"
                                      value={String(user.pets_count)}
                                    />
                                    <InfoBox
                                      label="Placas activas"
                                      value={String(user.active_tags_count)}
                                    />
                                    <InfoBox
                                      label="Correo"
                                      value={user.email || "No registrado"}
                                    />
                                    <InfoBox
                                      label="Teléfono / WhatsApp"
                                      value={primaryPhone || "No registrado"}
                                    />
                                    <InfoBox label="ID usuario" value={user.id} />
                                  </div>
                                )}
                              </div>

                              <aside className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Acciones
                                </div>

                                <ActionGroup title="Contacto">
                                  {whatsappUrl ? (
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#F5F0E8] transition hover:bg-[#E8C547]/15"
                                    >
                                      Abrir WhatsApp
                                    </a>
                                  ) : (
                                    <div className="rounded-2xl border border-white/10 px-4 py-3 text-center text-sm text-white/45">
                                      Sin número disponible
                                    </div>
                                  )}

                                  {callUrl && (
                                    <a
                                      href={callUrl}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Llamar usuario
                                    </a>
                                  )}

                                  {mailUrl && (
                                    <a
                                      href={mailUrl}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Enviar correo
                                    </a>
                                  )}
                                </ActionGroup>

                                <ActionGroup title="Gestión interna">
                                  {user.email?.trim() && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await copyText(user.email || "");
                                          setSuccessMsg(
                                            "Correo copiado correctamente."
                                          );
                                        } catch {
                                          setErrorMsg(
                                            "No se pudo copiar el correo."
                                          );
                                        }
                                      }}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Copiar correo
                                    </button>
                                  )}

                                  {primaryPhone && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await copyText(primaryPhone);
                                          setSuccessMsg(
                                            "Teléfono copiado correctamente."
                                          );
                                        } catch {
                                          setErrorMsg(
                                            "No se pudo copiar el teléfono."
                                          );
                                        }
                                      }}
                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                    >
                                      Copiar teléfono
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await copyText(user.id);
                                        setSuccessMsg("ID copiado correctamente.");
                                      } catch {
                                        setErrorMsg("No se pudo copiar el ID.");
                                      }
                                    }}
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    Copiar ID
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedUserId((current) =>
                                        current === user.id ? null : user.id
                                      )
                                    }
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                  >
                                    {expandedUserId === user.id
                                      ? "Ver menos"
                                      : "Ver más"}
                                  </button>
                                </ActionGroup>
                              </aside>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>

                  {filteredUsers.length > 0 && (
                    <PaginationPanel
                      currentPage={currentPage}
                      totalPages={totalPages}
                      pageInput={pageInput}
                      paginationItems={paginationItems}
                      setCurrentPage={setCurrentPage}
                      setPageInput={setPageInput}
                      goToPage={goToPage}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function StatCard({
  label,
  value,
  variant,
  active = false,
  onClick,
}: {
  label: string;
  value: number;
  variant: "green" | "yellow" | "neutral";
  active?: boolean;
  onClick?: () => void;
}) {
  const variantClass =
    variant === "green"
      ? active
        ? "border-[#2D5A27]/70 bg-[#12311c]"
        : "border-[#2D5A27]/60 bg-[#12311c]"
      : variant === "yellow"
        ? active
          ? "border-[#E8C547]/25 bg-[#E8C547]/10"
          : "border-[#E8C547]/15 bg-[#E8C547]/8"
        : active
          ? "border-[#E8C547]/20 bg-[#E8C547]/8"
          : "border-white/8 bg-white/[0.04]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] sm:rounded-[28px] sm:p-6 ${variantClass}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 sm:text-sm">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-[#E8C547] sm:text-4xl">
        {value}
      </div>
    </button>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${className}`}
    >
      {children}
    </span>
  );
}

function SmallInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/35">{label}:</span>{" "}
      <span className="break-words text-white/70">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>
      <div className="mt-2 break-words text-sm leading-6 text-white/80">
        {value}
      </div>
    </div>
  );
}

function ActionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-white/10 pt-5 first:mt-0 first:border-t-0 first:pt-0">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </div>

      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function PaginationPanel({
  currentPage,
  totalPages,
  pageInput,
  paginationItems,
  setCurrentPage,
  setPageInput,
  goToPage,
}: {
  currentPage: number;
  totalPages: number;
  pageInput: string;
  paginationItems: Array<number | "ellipsis">;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  setPageInput: Dispatch<SetStateAction<string>>;
  goToPage: () => void;
}) {
  return (
    <section className="mt-6 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="text-sm text-white/55">
          Página {currentPage} de {totalPages}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Primera
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </button>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 text-sm text-white/45"
                >
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={`min-w-[44px] rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    currentPage === item
                      ? "bg-[#E8C547] text-[#1A1A14] shadow-lg shadow-[#E8C547]/20"
                      : "border border-white/10 text-white/85 hover:bg-white/5"
                  }`}
                >
                  {item}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={currentPage === totalPages}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Última
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="grid gap-3 sm:flex sm:items-center">
          <label className="text-sm text-white/60">Ir a página</label>

          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                goToPage();
              }
            }}
            className="w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 sm:w-28"
          />

          <button
            type="button"
            onClick={goToPage}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
          >
            Ir
          </button>
        </div>
      </div>
    </section>
  );
}
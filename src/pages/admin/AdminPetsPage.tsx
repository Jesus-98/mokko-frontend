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

type PetStatusFilter = "all" | "active" | "inactive";
type SpeciesFilter = "all" | "dog" | "cat" | "other";
type VisibilityStatus = "public" | "private" | "lost_mode";
type VisibilityFilter = "all" | VisibilityStatus | "no_profile";
type MedicalFilter = "all" | "enabled";
type QuickFilter = "all" | "active" | "lost_mode" | "medical" | "no_profile";

type SoldPlanType = "essential" | "custom" | "partner_batch" | "other";
type RelationValue<T> = T | T[] | null;

type OwnerProfileRow = {
  full_name: string | null;
  email: string | null;
};

type BreedRow = {
  name: string | null;
  name_es: string | null;
};

type PublicProfileRow = {
  visibility_status: VisibilityStatus;
  medical_profile_enabled: boolean | null;
};

type MedicalProfileRow = {
  id: string;
  pet_id: string;
  sterilized: boolean | null;
  allergies_text: string | null;
  conditions_text: string | null;
  medications_text: string | null;
  dietary_notes: string | null;
  created_at: string;
  updated_at: string;
};

type VaccineTypeRow = {
  id: string;
  species: "dog" | "cat" | "other";
  name: string;
  code: string | null;
  recommended_frequency_months: number | null;
  is_core: boolean;
  created_at: string;
};

type PetVaccinationRow = {
  id: string;
  pet_id: string;
  vaccine_type_id: string;
  applied_on: string | null;
  expires_on: string | null;
  dose_number: number | null;
  applied_by_partner_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  vaccine_type: RelationValue<VaccineTypeRow>;
};

type TagRow = {
  code: string | null;
};

type PetTagRow = {
  status: string | null;
  is_primary: boolean | null;
  sold_plan_type: SoldPlanType | null;
  tag: RelationValue<TagRow>;
};

type PetRow = {
  id: string;
  name: string;
  species: "dog" | "cat" | "other";
  sex: string;
  color: string | null;
  breed_custom: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_at: string;
  owner_user_id: string;
  owner_profile: RelationValue<OwnerProfileRow>;
  breed: RelationValue<BreedRow>;
  public_profile: RelationValue<PublicProfileRow>;
  medical_profile: RelationValue<MedicalProfileRow>;
  pet_tags: RelationValue<PetTagRow>;
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

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function getSpeciesLabel(species: SpeciesFilter | "dog" | "cat" | "other") {
  switch (species) {
    case "dog":
      return "Perro";
    case "cat":
      return "Gato";
    case "other":
      return "Otro";
    case "all":
      return "Todas";
    default:
      return species;
  }
}

function getSexLabel(sex: string) {
  switch (sex) {
    case "male":
      return "Macho";
    case "female":
      return "Hembra";
    case "unknown":
      return "No definido";
    default:
      return sex || "—";
  }
}

function getVisibilityLabel(status: VisibilityStatus | null | undefined) {
  switch (status) {
    case "public":
      return "Público";
    case "private":
      return "Privado";
    case "lost_mode":
      return "Modo perdido";
    default:
      return "Sin perfil público";
  }
}

function getVisibilityClass(status: VisibilityStatus | null | undefined) {
  switch (status) {
    case "public":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "private":
      return "border-white/10 bg-white/5 text-white/80";
    case "lost_mode":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function getStatusBadgeClass(isActive: boolean) {
  return isActive
    ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200"
    : "border-red-400/20 bg-red-400/10 text-red-200";
}

function getPlanTypeLabel(value: SoldPlanType | null | undefined) {
  switch (value) {
    case "essential":
      return "Essential";
    case "custom":
      return "Custom";
    case "partner_batch":
      return "Lote aliado";
    case "other":
      return "Otro";
    default:
      return "Sin definir";
  }
}

function getPlanTypeClass(value: SoldPlanType | null | undefined) {
  switch (value) {
    case "custom":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "essential":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "partner_batch":
      return "border-white/10 bg-white/5 text-white/80";
    case "other":
      return "border-white/10 bg-white/5 text-white/70";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function getRelationItem<T>(value: RelationValue<T> | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function getRelationArray<T>(value: RelationValue<T> | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function getOwnerProfile(pet: PetRow) {
  return getRelationItem(pet.owner_profile);
}

function getBreedRow(pet: PetRow) {
  return getRelationItem(pet.breed);
}

function getPublicProfile(pet: PetRow) {
  return getRelationItem(pet.public_profile);
}

function getMedicalProfile(pet: PetRow) {
  return getRelationItem(pet.medical_profile);
}

function getOwnerLabel(pet: PetRow) {
  const ownerProfile = getOwnerProfile(pet);

  return (
    ownerProfile?.full_name?.trim() ||
    ownerProfile?.email?.trim() ||
    "Usuario registrado"
  );
}

function getBreedLabel(pet: PetRow) {
  const customBreed = pet.breed_custom?.trim();
  if (customBreed) return customBreed;

  const breed = getBreedRow(pet);
  return breed?.name_es?.trim() || breed?.name?.trim() || "—";
}

function getPetTagRows(pet: PetRow) {
  return getRelationArray(pet.pet_tags).sort((a, b) => {
    const aPrimary = a.is_primary ? 1 : 0;
    const bPrimary = b.is_primary ? 1 : 0;

    if (aPrimary !== bPrimary) return bPrimary - aPrimary;

    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;

    return bActive - aActive;
  });
}

function getPetTagCode(row: PetTagRow) {
  return getRelationItem(row.tag)?.code?.trim() || "Sin código";
}

function getPetTagStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "Activa";
    case "assigned":
      return "Asignada";
    case "available":
      return "Disponible";
    case "inactive":
      return "Inactiva";
    case "lost":
      return "Extraviada";
    case "suspended":
      return "Suspendida";
    case "retired":
      return "Retirada";
    default:
      return status || "Sin estado";
  }
}

function getPetTagStatusClass(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
    case "assigned":
      return "border-blue-400/20 bg-blue-400/10 text-blue-200";
    case "available":
      return "border-white/10 bg-white/5 text-white/75";
    case "lost":
    case "suspended":
      return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
    case "retired":
    case "inactive":
      return "border-red-400/20 bg-red-400/10 text-red-200";
    default:
      return "border-white/10 bg-white/5 text-white/60";
  }
}

function getActivePetTagRow(pet: PetRow) {
  const rows = getRelationArray(pet.pet_tags);

  return (
    rows.find((row) => row?.status === "active" && row?.is_primary) ||
    rows.find((row) => row?.status === "active") ||
    rows.find((row) => row?.is_primary) ||
    rows[0] ||
    null
  );
}

function getActiveTag(pet: PetRow) {
  const activePetTag = getActivePetTagRow(pet);
  return getRelationItem(activePetTag?.tag);
}

function getActiveTagCode(pet: PetRow) {
  return getActiveTag(pet)?.code?.trim() || "";
}

function getActiveTagLabel(pet: PetRow) {
  return getActiveTagCode(pet) || "Sin placa activa";
}

function getActivePlanType(pet: PetRow) {
  return getActivePetTagRow(pet)?.sold_plan_type ?? null;
}

function hasMedicalRecord(pet: PetRow) {
  const publicProfile = getPublicProfile(pet);
  const medicalProfile = getMedicalProfile(pet);

  return !!publicProfile?.medical_profile_enabled || !!medicalProfile?.pet_id;
}

function matchesQuickFilter(pet: PetRow, filter: QuickFilter) {
  const publicProfile = getPublicProfile(pet);

  if (filter === "all") return true;
  if (filter === "active") return pet.is_active;
  if (filter === "lost_mode") return publicProfile?.visibility_status === "lost_mode";
  if (filter === "medical") return hasMedicalRecord(pet);
  if (filter === "no_profile") return !publicProfile;

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

function getBooleanLabel(value: boolean | null | undefined) {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "No definido";
}

function getOptionalText(value: string | null | undefined) {
  return value?.trim() || "—";
}

function getMedicalStatusLabel(
  medicalEnabled: boolean,
  medicalProfile: MedicalProfileRow | null
) {
  if (medicalProfile) return "Registrado";
  if (medicalEnabled) return "Habilitado sin completar";
  return "No registrado";
}

function getMedicalStatusClass(
  medicalEnabled: boolean,
  medicalProfile: MedicalProfileRow | null
) {
  if (medicalProfile) {
    return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
  }

  if (medicalEnabled) {
    return "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]";
  }

  return "border-white/10 bg-white/5 text-white/70";
}

function getVaccineType(vaccination: PetVaccinationRow) {
  return getRelationItem(vaccination.vaccine_type);
}

function getVaccineName(vaccination: PetVaccinationRow) {
  const vaccineType = getVaccineType(vaccination);
  return vaccineType?.name?.trim() || "Vacuna";
}

function buildVaccinesSummaryForCsv(vaccinations: PetVaccinationRow[]) {
  if (vaccinations.length === 0) return "";

  return vaccinations
    .map((vaccination) => {
      const vaccineType = getVaccineType(vaccination);
      const name = getVaccineName(vaccination);
      const dose =
        vaccination.dose_number != null ? `Dosis ${vaccination.dose_number}` : "";
      const applied = vaccination.applied_on
        ? `Aplicada ${formatDateOnly(vaccination.applied_on)}`
        : "";
      const expires = vaccination.expires_on
        ? `Vence ${formatDateOnly(vaccination.expires_on)}`
        : "";
      const code = vaccineType?.code?.trim() || "";

      return [name, code, dose, applied, expires].filter(Boolean).join(" · ");
    })
    .join(" | ");
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function getPublicProfileUrl(tagCode: string) {
  return `/p/${encodeURIComponent(tagCode)}`;
}

export default function AdminPetsPage() {
  const { role, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [pets, setPets] = useState<PetRow[]>([]);
  const [vaccinationsByPetId, setVaccinationsByPetId] = useState<
    Map<string, PetVaccinationRow[]>
  >(new Map());

  const [expandedPetId, setExpandedPetId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [speciesFilter, setSpeciesFilter] = useState<SpeciesFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PetStatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [medicalFilter, setMedicalFilter] = useState<MedicalFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  const loadPets = useCallback(async () => {
    if (role !== "admin") return;

    setLoading(true);
    setErrorMsg("");
    setWarningMsg("");
    setSuccessMsg("");

    try {
      const warnings: string[] = [];

      const { data, error } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          sex,
          color,
          breed_custom,
          photo_url,
          is_active,
          created_at,
          owner_user_id,
          owner_profile:profiles!pets_owner_user_id_fkey (
            full_name,
            email
          ),
          breed:pet_breeds!pets_breed_id_fkey (
            name,
            name_es
          ),
          public_profile:pet_profiles!pet_profiles_pet_id_fkey (
            visibility_status,
            medical_profile_enabled
          ),
          medical_profile:pet_medical_profiles!pet_medical_profiles_pet_id_fkey (
            id,
            pet_id,
            sterilized,
            allergies_text,
            conditions_text,
            medications_text,
            dietary_notes,
            created_at,
            updated_at
          ),
          pet_tags:pet_tags!pet_tags_pet_id_fkey (
            status,
            is_primary,
            sold_plan_type,
            tag:tags!pet_tags_tag_id_fkey (
              code
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as PetRow[];
      setPets(rows);

      if (rows.length > 0) {
        const hasEmbeddedData = rows.some(
          (pet) =>
            !!getOwnerProfile(pet) ||
            !!getBreedRow(pet) ||
            !!getPublicProfile(pet) ||
            !!getMedicalProfile(pet) ||
            getRelationArray(pet.pet_tags).length > 0
        );

        if (!hasEmbeddedData) {
          warnings.push(
            "Las mascotas cargaron, pero varias relaciones asociadas llegaron vacías. Si sigue ocurriendo, revisa las policies de profiles, pet_breeds, pet_profiles, pet_medical_profiles, pet_tags y tags."
          );
        }
      }

      const petIds = rows.map((pet) => pet.id);

      if (petIds.length === 0) {
        setVaccinationsByPetId(new Map());
        setWarningMsg(warnings.join(" "));
        return;
      }

      const { data: vaccinationsData, error: vaccinationsError } = await supabase
        .from("pet_vaccinations")
        .select(`
          id,
          pet_id,
          vaccine_type_id,
          applied_on,
          expires_on,
          dose_number,
          applied_by_partner_id,
          notes,
          created_at,
          updated_at,
          vaccine_type:vaccine_types!pet_vaccinations_vaccine_type_id_fkey (
            id,
            species,
            name,
            code,
            recommended_frequency_months,
            is_core,
            created_at
          )
        `)
        .in("pet_id", petIds)
        .order("applied_on", { ascending: false })
        .order("created_at", { ascending: false });

      if (vaccinationsError) {
        console.error("AdminPetsPage vaccinations load error:", vaccinationsError);
        warnings.push("No se pudieron cargar todas las vacunas registradas.");
        setVaccinationsByPetId(new Map());
      } else {
        const vaccinationRows = (vaccinationsData ?? []) as PetVaccinationRow[];
        const grouped = new Map<string, PetVaccinationRow[]>();

        vaccinationRows.forEach((vaccination) => {
          const current = grouped.get(vaccination.pet_id) ?? [];
          current.push(vaccination);
          grouped.set(vaccination.pet_id, current);
        });

        setVaccinationsByPetId(grouped);
      }

      setWarningMsg(warnings.join(" "));
    } catch (error) {
      console.error("AdminPetsPage load error:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las mascotas."
      );
      setVaccinationsByPetId(new Map());
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") return;

    void loadPets();
  }, [authLoading, role, loadPets]);

  const totalPets = pets.length;

  const activePets = useMemo(
    () => pets.filter((pet) => pet.is_active).length,
    [pets]
  );

  const lostModePets = useMemo(
    () =>
      pets.filter(
        (pet) => getPublicProfile(pet)?.visibility_status === "lost_mode"
      ).length,
    [pets]
  );

  const medicalEnabledPets = useMemo(
    () => pets.filter((pet) => hasMedicalRecord(pet)).length,
    [pets]
  );

  const noProfilePets = useMemo(
    () => pets.filter((pet) => !getPublicProfile(pet)).length,
    [pets]
  );

  const speciesOptions: CustomSelectOption[] = [
    { value: "all", label: "Todas" },
    { value: "dog", label: "Perro" },
    { value: "cat", label: "Gato" },
    { value: "other", label: "Otro" },
  ];

  const statusOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activas" },
    { value: "inactive", label: "Inactivas" },
  ];

  const visibilityOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "public", label: "Público" },
    { value: "private", label: "Privado" },
    { value: "lost_mode", label: "Modo perdido" },
    { value: "no_profile", label: "Sin perfil público" },
  ];

  const medicalOptions: CustomSelectOption[] = [
    { value: "all", label: "Todos" },
    { value: "enabled", label: "Con ficha médica" },
  ];

  const filteredPets = useMemo(() => {
    const term = normalizeText(searchTerm);

    return pets.filter((pet) => {
      const ownerProfile = getOwnerProfile(pet);
      const ownerName = getOwnerLabel(pet);
      const ownerEmail = ownerProfile?.email || "";
      const publicProfile = getPublicProfile(pet);
      const medicalEnabled = hasMedicalRecord(pet);
      const breedLabel = getBreedLabel(pet);
      const activeTagLabel = getActiveTagLabel(pet);
      const activePlanType = getPlanTypeLabel(getActivePlanType(pet));
      const petTagRows = getPetTagRows(pet);
      const petTagsText = petTagRows
        .map((row) =>
          [
            getPetTagCode(row),
            getPetTagStatusLabel(row.status),
            getPlanTypeLabel(row.sold_plan_type),
            row.is_primary ? "principal" : "",
          ]
            .filter(Boolean)
            .join(" ")
        )
        .join(" ");

      const vaccinations = vaccinationsByPetId.get(pet.id) ?? [];
      const vaccinesText = vaccinations
        .map((vaccination) => getVaccineName(vaccination))
        .join(" ");

      const matchesSpecies =
        speciesFilter === "all" ? true : pet.species === speciesFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? pet.is_active
            : !pet.is_active;

      const matchesVisibility =
        visibilityFilter === "all"
          ? true
          : visibilityFilter === "no_profile"
            ? !publicProfile
            : publicProfile?.visibility_status === visibilityFilter;

      const matchesMedical =
        medicalFilter === "enabled" ? medicalEnabled : true;

      const matchesQuick = matchesQuickFilter(pet, quickFilter);

      const haystack = normalizeText(
        [
          pet.name,
          pet.species,
          pet.sex || "",
          pet.color || "",
          breedLabel,
          ownerName,
          ownerEmail,
          getVisibilityLabel(publicProfile?.visibility_status),
          medicalEnabled ? "ficha médica registrada" : "sin ficha médica",
          activeTagLabel,
          activePlanType,
          petTagsText,
          vaccinesText,
        ].join(" ")
      );

      const matchesSearch = term ? haystack.includes(term) : true;

      return (
        matchesSpecies &&
        matchesStatus &&
        matchesVisibility &&
        matchesMedical &&
        matchesQuick &&
        matchesSearch
      );
    });
  }, [
    pets,
    searchTerm,
    speciesFilter,
    statusFilter,
    visibilityFilter,
    medicalFilter,
    quickFilter,
    vaccinationsByPetId,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredPets.length / ITEMS_PER_PAGE)
  );

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedPets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    return filteredPets.slice(start, end);
  }, [filteredPets, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    speciesFilter,
    statusFilter,
    visibilityFilter,
    medicalFilter,
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

  const applyQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSpeciesFilter("all");
    setStatusFilter("all");
    setVisibilityFilter("all");
    setMedicalFilter("all");
    setQuickFilter("all");
    setCurrentPage(1);
  };

  const exportCsv = () => {
    if (filteredPets.length === 0) {
      setErrorMsg("No hay mascotas para exportar con los filtros actuales.");
      return;
    }

    const headers = [
      "Nombre",
      "Especie",
      "Sexo",
      "Color",
      "Raza",
      "Estado",
      "Perfil público",
      "Ficha médica",
      "Vacunas registradas",
      "Detalle vacunas",
      "Código placa principal/activa",
      "Tipo placa principal/activa",
      "Placas asociadas",
      "Dueño",
      "Correo dueño",
      "ID dueño",
      "Fecha de registro",
      "ID mascota",
    ];

    const rows = filteredPets.map((pet) => {
      const ownerProfile = getOwnerProfile(pet);
      const ownerName = getOwnerLabel(pet);
      const ownerEmail = ownerProfile?.email || "";
      const publicProfile = getPublicProfile(pet);
      const medicalEnabled = hasMedicalRecord(pet);
      const vaccinations = vaccinationsByPetId.get(pet.id) ?? [];
      const petTagRows = getPetTagRows(pet);

      const allTagsSummary = petTagRows
        .map((row) => {
          const parts = [
            getPetTagCode(row),
            getPetTagStatusLabel(row.status),
            getPlanTypeLabel(row.sold_plan_type),
            row.is_primary ? "Principal" : "",
          ];

          return parts.filter(Boolean).join(" · ");
        })
        .join(" | ");

      return [
        pet.name,
        getSpeciesLabel(pet.species),
        getSexLabel(pet.sex),
        pet.color || "",
        getBreedLabel(pet),
        pet.is_active ? "Activa" : "Inactiva",
        getVisibilityLabel(publicProfile?.visibility_status),
        medicalEnabled ? "Sí" : "No",
        String(vaccinations.length),
        buildVaccinesSummaryForCsv(vaccinations),
        getActiveTagLabel(pet),
        getPlanTypeLabel(getActivePlanType(pet)),
        allTagsSummary,
        ownerName,
        ownerEmail,
        pet.owner_user_id,
        formatDateTime(pet.created_at),
        pet.id,
      ];
    });

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
    anchor.download = `mokko-mascotas-${datePart}.csv`;
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
          <AdminAccessDenied message="No tienes permisos para acceder a la gestión de mascotas." />
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
                badge="Admin · Mascotas"
                title="Gestión de mascotas"
                description="Revisa mascotas registradas, dueño, perfil público, placas asociadas, ficha médica y vacunas."
                actions={
                  <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                    <button
                      type="button"
                      onClick={exportCsv}
                      disabled={loading || filteredPets.length === 0}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      Exportar CSV
                    </button>

                    <button
                      type="button"
                      onClick={() => void loadPets()}
                      disabled={loading}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                    >
                      {loading ? "Actualizando..." : "Recargar mascotas"}
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
                  Cargando mascotas...
                </div>
              ) : (
                <>
                  <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
                    <StatCard
                      label="Total"
                      value={totalPets}
                      variant="green"
                      active={quickFilter === "all"}
                      onClick={() => applyQuickFilter("all")}
                    />

                    <StatCard
                      label="Activas"
                      value={activePets}
                      variant="neutral"
                      active={quickFilter === "active"}
                      onClick={() => applyQuickFilter("active")}
                    />

                    <StatCard
                      label="Modo perdido"
                      value={lostModePets}
                      variant="yellow"
                      active={quickFilter === "lost_mode"}
                      onClick={() => applyQuickFilter("lost_mode")}
                    />

                    <StatCard
                      label="Ficha médica"
                      value={medicalEnabledPets}
                      variant="neutral"
                      active={quickFilter === "medical"}
                      onClick={() => applyQuickFilter("medical")}
                    />

                    <StatCard
                      label="Sin perfil"
                      value={noProfilePets}
                      variant="yellow"
                      active={quickFilter === "no_profile"}
                      onClick={() => applyQuickFilter("no_profile")}
                    />
                  </section>

                  <section className="mt-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Filtros</h2>
                        <p className="mt-2 text-sm leading-7 text-white/60">
                          Busca por nombre, dueño, raza, placa, tipo de placa o
                          vacuna registrada.
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

                    <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.8fr_0.9fr]">
                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Buscar mascota
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Nombre, raza, dueño, placa, tipo o vacuna"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Especie
                        </label>
                        <CustomSelect
                          value={speciesFilter}
                          onChange={(value) =>
                            setSpeciesFilter(value as SpeciesFilter)
                          }
                          options={speciesOptions}
                          placeholder="Todas"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Estado
                        </label>
                        <CustomSelect
                          value={statusFilter}
                          onChange={(value) =>
                            setStatusFilter(value as PetStatusFilter)
                          }
                          options={statusOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Perfil público
                        </label>
                        <CustomSelect
                          value={visibilityFilter}
                          onChange={(value) =>
                            setVisibilityFilter(value as VisibilityFilter)
                          }
                          options={visibilityOptions}
                          placeholder="Todos"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-white/80">
                          Ficha médica
                        </label>
                        <CustomSelect
                          value={medicalFilter}
                          onChange={(value) =>
                            setMedicalFilter(value as MedicalFilter)
                          }
                          options={medicalOptions}
                          placeholder="Todos"
                        />
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-white/10 bg-[#141410] px-4 py-3 text-sm text-white/60">
                      Mostrando{" "}
                      <span className="font-semibold text-white">
                        {filteredPets.length}
                      </span>{" "}
                      mascota{filteredPets.length === 1 ? "" : "s"}.
                    </div>
                  </section>

                  <section className="mt-8 grid gap-5">
                    {filteredPets.length === 0 ? (
                      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
                        <div className="text-2xl font-semibold">
                          No se encontraron mascotas
                        </div>
                        <p className="mt-3 text-sm leading-7 text-white/65">
                          Ajusta la búsqueda o los filtros para ver otros
                          resultados.
                        </p>
                      </div>
                    ) : (
                      paginatedPets.map((pet) => {
                        const ownerProfile = getOwnerProfile(pet);
                        const ownerName = getOwnerLabel(pet);
                        const ownerEmail = ownerProfile?.email || "—";
                        const publicProfile = getPublicProfile(pet);
                        const medicalEnabled = hasMedicalRecord(pet);
                        const activeTagCode = getActiveTagCode(pet);
                        const activeTagLabel = getActiveTagLabel(pet);
                        const activePlanType = getActivePlanType(pet);
                        const medicalProfile = getMedicalProfile(pet);
                        const vaccinations = vaccinationsByPetId.get(pet.id) ?? [];
                        const petTagRows = getPetTagRows(pet);
                        const publicUrl = activeTagCode
                          ? getPublicProfileUrl(activeTagCode)
                          : "";

                        return (
                          <article
                            key={pet.id}
                            className="rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6"
                          >
                            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                              <div className="min-w-0">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#141410]">
                                    {pet.photo_url ? (
                                      <img
                                        src={pet.photo_url}
                                        alt={`Foto de ${pet.name}`}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                                        Sin foto
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h2 className="break-words text-2xl font-semibold">
                                        {pet.name}
                                      </h2>

                                      <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                        {getSpeciesLabel(pet.species)}
                                      </StatusPill>

                                      <StatusPill
                                        className={getVisibilityClass(
                                          publicProfile?.visibility_status
                                        )}
                                      >
                                        {getVisibilityLabel(
                                          publicProfile?.visibility_status
                                        )}
                                      </StatusPill>

                                      <StatusPill
                                        className={getStatusBadgeClass(
                                          pet.is_active
                                        )}
                                      >
                                        {pet.is_active ? "Activa" : "Inactiva"}
                                      </StatusPill>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-sm text-white/62 sm:grid-cols-2 xl:grid-cols-3">
                                      <SmallInfo label="Dueño" value={ownerName} />
                                      <SmallInfo
                                        label="Sexo"
                                        value={getSexLabel(pet.sex)}
                                      />
                                      <SmallInfo
                                        label="Color"
                                        value={pet.color || "—"}
                                      />
                                      <SmallInfo
                                        label="Raza"
                                        value={getBreedLabel(pet)}
                                      />
                                      <SmallInfo
                                        label="Registro"
                                        value={formatDateTime(pet.created_at)}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {expandedPetId === pet.id && (
                                  <>
                                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                                      <InfoBox label="ID mascota" value={pet.id} />
                                      <InfoBox
                                        label="ID dueño"
                                        value={pet.owner_user_id}
                                      />
                                      <InfoBox
                                        label="Correo dueño"
                                        value={ownerEmail}
                                      />
                                      <InfoBox
                                        label="Raza"
                                        value={getBreedLabel(pet)}
                                      />
                                      <InfoBox
                                        label="Ficha médica"
                                        value={getMedicalStatusLabel(
                                          medicalEnabled,
                                          medicalProfile
                                        )}
                                      />
                                      <InfoBox
                                        label="Perfil público"
                                        value={getVisibilityLabel(
                                          publicProfile?.visibility_status
                                        )}
                                      />
                                      <InfoBox
                                        label="Código principal / activo"
                                        value={activeTagLabel}
                                      />
                                      <InfoBox
                                        label="Tipo de placa principal / activa"
                                        value={getPlanTypeLabel(activePlanType)}
                                      />
                                    </div>

                                    <section className="mt-5 rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                      <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                            Placas asociadas
                                          </div>
                                          <div className="mt-2 text-base font-semibold text-[#F5F0E8]">
                                            Todas las placas vinculadas
                                          </div>
                                        </div>

                                        <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                          {petTagRows.length} placa
                                          {petTagRows.length === 1 ? "" : "s"}
                                        </StatusPill>
                                      </div>

                                      {petTagRows.length === 0 ? (
                                        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/65">
                                          Esta mascota no tiene placas asociadas.
                                        </div>
                                      ) : (
                                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                                          {petTagRows.map((petTag, index) => {
                                            const tagCode = getPetTagCode(petTag);
                                            const canOpenPublicProfile =
                                              tagCode !== "Sin código";

                                            return (
                                              <div
                                                key={`${tagCode}-${index}`}
                                                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                                              >
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <div className="break-all text-base font-semibold text-[#F5F0E8]">
                                                    {tagCode}
                                                  </div>

                                                  {petTag.is_primary && (
                                                    <StatusPill className="border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]">
                                                      Principal
                                                    </StatusPill>
                                                  )}

                                                  <StatusPill
                                                    className={getPetTagStatusClass(
                                                      petTag.status
                                                    )}
                                                  >
                                                    {getPetTagStatusLabel(
                                                      petTag.status
                                                    )}
                                                  </StatusPill>
                                                </div>

                                                <div className="mt-3 grid gap-2 text-sm text-white/70">
                                                  <SmallLine
                                                    label="Tipo de placa"
                                                    value={getPlanTypeLabel(
                                                      petTag.sold_plan_type
                                                    )}
                                                  />

                                                  <SmallLine
                                                    label="Principal"
                                                    value={
                                                      petTag.is_primary
                                                        ? "Sí"
                                                        : "No"
                                                    }
                                                  />

                                                  <SmallLine
                                                    label="Estado"
                                                    value={getPetTagStatusLabel(
                                                      petTag.status
                                                    )}
                                                  />
                                                </div>

                                                {canOpenPublicProfile && (
                                                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                                    <a
                                                      href={getPublicProfileUrl(
                                                        tagCode
                                                      )}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20"
                                                    >
                                                      Ver perfil
                                                    </a>

                                                    <button
                                                      type="button"
                                                      onClick={async () => {
                                                        try {
                                                          await copyText(tagCode);
                                                          setSuccessMsg(
                                                            "Código de placa copiado correctamente."
                                                          );
                                                        } catch {
                                                          setErrorMsg(
                                                            "No se pudo copiar el código de placa."
                                                          );
                                                        }
                                                      }}
                                                      className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                                    >
                                                      Copiar
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </section>

                                    <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                                      <section className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                              Perfil médico
                                            </div>
                                            <div className="mt-2 text-base font-semibold text-[#F5F0E8]">
                                              Detalle de ficha médica
                                            </div>
                                          </div>

                                          <StatusPill
                                            className={getMedicalStatusClass(
                                              medicalEnabled,
                                              medicalProfile
                                            )}
                                          >
                                            {getMedicalStatusLabel(
                                              medicalEnabled,
                                              medicalProfile
                                            )}
                                          </StatusPill>
                                        </div>

                                        {!medicalProfile ? (
                                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/65">
                                            {medicalEnabled
                                              ? "La ficha médica está habilitada para esta mascota, pero todavía no tiene datos registrados."
                                              : "Esta mascota no tiene un perfil médico registrado."}
                                          </div>
                                        ) : (
                                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                                            <InfoBox
                                              label="Esterilizado"
                                              value={getBooleanLabel(
                                                medicalProfile.sterilized
                                              )}
                                            />
                                            <InfoBox
                                              label="Alergias"
                                              value={getOptionalText(
                                                medicalProfile.allergies_text
                                              )}
                                            />
                                            <InfoBox
                                              label="Condiciones"
                                              value={getOptionalText(
                                                medicalProfile.conditions_text
                                              )}
                                            />
                                            <InfoBox
                                              label="Medicamentos"
                                              value={getOptionalText(
                                                medicalProfile.medications_text
                                              )}
                                            />
                                            <InfoBox
                                              label="Notas de dieta"
                                              value={getOptionalText(
                                                medicalProfile.dietary_notes
                                              )}
                                            />
                                            <InfoBox
                                              label="Última actualización"
                                              value={formatDateTime(
                                                medicalProfile.updated_at
                                              )}
                                            />
                                          </div>
                                        )}
                                      </section>

                                      <section className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                          <div>
                                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                              Vacunas registradas
                                            </div>
                                            <div className="mt-2 text-base font-semibold text-[#F5F0E8]">
                                              Historial de vacunación
                                            </div>
                                          </div>

                                          <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                            {vaccinations.length} vacuna
                                            {vaccinations.length === 1
                                              ? ""
                                              : "s"}
                                          </StatusPill>
                                        </div>

                                        {vaccinations.length === 0 ? (
                                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/65">
                                            No hay vacunas registradas para esta
                                            mascota.
                                          </div>
                                        ) : (
                                          <div className="mt-4 grid gap-3">
                                            {vaccinations.map((vaccination) => {
                                              const vaccineType =
                                                getVaccineType(vaccination);

                                              return (
                                                <div
                                                  key={vaccination.id}
                                                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                                                >
                                                  <div className="flex flex-wrap items-center gap-2">
                                                    <div className="text-base font-semibold text-[#F5F0E8]">
                                                      {getVaccineName(vaccination)}
                                                    </div>

                                                    {vaccineType?.is_core ? (
                                                      <StatusPill className="border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200">
                                                        Core
                                                      </StatusPill>
                                                    ) : null}

                                                    {vaccineType?.code ? (
                                                      <StatusPill className="border-white/10 bg-white/5 text-white/70">
                                                        {vaccineType.code}
                                                      </StatusPill>
                                                    ) : null}
                                                  </div>

                                                  <div className="mt-3 grid gap-2 text-sm text-white/70 md:grid-cols-2">
                                                    <SmallLine
                                                      label="Aplicada"
                                                      value={formatDateOnly(
                                                        vaccination.applied_on
                                                      )}
                                                    />

                                                    <SmallLine
                                                      label="Vence"
                                                      value={formatDateOnly(
                                                        vaccination.expires_on
                                                      )}
                                                    />

                                                    <SmallLine
                                                      label="Dosis"
                                                      value={String(
                                                        vaccination.dose_number ??
                                                          "—"
                                                      )}
                                                    />

                                                    <SmallLine
                                                      label="Frecuencia sugerida"
                                                      value={
                                                        vaccineType?.recommended_frequency_months !=
                                                        null
                                                          ? `${vaccineType.recommended_frequency_months} mes(es)`
                                                          : "—"
                                                      }
                                                    />
                                                  </div>

                                                  {vaccination.notes?.trim() && (
                                                    <div className="mt-3 text-sm leading-6 text-white/70">
                                                      <span className="text-white/45">
                                                        Notas:
                                                      </span>{" "}
                                                      {vaccination.notes.trim()}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </section>
                                    </div>
                                  </>
                                )}
                              </div>

                              <aside className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                                <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                  Resumen
                                </div>

                                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                  <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                                    Placa principal / activa
                                  </div>

                                  <div className="mt-2 break-all text-base font-semibold text-[#F5F0E8]">
                                    {activeTagLabel}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <StatusPill
                                      className={getPlanTypeClass(activePlanType)}
                                    >
                                      {getPlanTypeLabel(activePlanType)}
                                    </StatusPill>

                                    <StatusPill
                                      className={
                                        medicalEnabled
                                          ? "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200"
                                          : "border-white/10 bg-white/5 text-white/70"
                                      }
                                    >
                                      {medicalEnabled
                                        ? "Ficha médica"
                                        : "Sin ficha médica"}
                                    </StatusPill>

                                    <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                      {vaccinations.length} vacuna
                                      {vaccinations.length === 1 ? "" : "s"}
                                    </StatusPill>

                                    <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                      {petTagRows.length} placa
                                      {petTagRows.length === 1 ? "" : "s"}
                                    </StatusPill>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPetId((current) =>
                                        current === pet.id ? null : pet.id
                                      )
                                    }
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm font-medium text-[#F5F0E8] transition hover:bg-[#E8C547]/15"
                                  >
                                    {expandedPetId === pet.id
                                      ? "Ocultar detalle"
                                      : "Ver detalle"}
                                  </button>

                                  {activeTagCode && (
                                    <>
                                      <a
                                        href={publicUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex w-full items-center justify-center rounded-2xl border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-4 py-3 text-sm font-medium text-green-100 transition hover:bg-[#2D5A27]/20"
                                      >
                                        Abrir perfil público principal
                                      </a>

                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await copyText(activeTagCode);
                                            setSuccessMsg(
                                              "Código de placa copiado correctamente."
                                            );
                                          } catch {
                                            setErrorMsg(
                                              "No se pudo copiar el código de placa."
                                            );
                                          }
                                        }}
                                        className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                      >
                                        Copiar código principal
                                      </button>
                                    </>
                                  )}
                                </div>
                              </aside>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </section>

                  {filteredPets.length > 0 && (
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

  const content = (
    <>
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45 sm:text-sm">
        {label}
      </div>

      <div className="mt-3 text-3xl font-semibold text-[#E8C547] sm:text-4xl">
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-[24px] border p-4 text-left transition hover:-translate-y-[1px] sm:rounded-[28px] sm:p-6 ${variantClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`rounded-[24px] border p-4 sm:rounded-[28px] sm:p-6 ${variantClass}`}
    >
      {content}
    </div>
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
      <span className="text-white/70">{value}</span>
    </div>
  );
}

function SmallLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/45">{label}:</span>{" "}
      <span className="text-white/78">{value}</span>
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
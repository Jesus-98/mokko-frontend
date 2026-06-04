import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  PawPrint,
  Plus,
  ShieldCheck,
  Tags,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PetForm from "../components/pets/PetForm";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type PetBreedRow = {
  name: string;
  name_es?: string | null;
};

type MaybeRelation<T> = T | T[] | null | undefined;

type PetRow = {
  id: string;
  name: string;
  species: string | null;
  breed_id: string | null;
  breed_custom?: string | null;
  sex: string | null;
  color: string | null;
  birthdate: string | null;
  weight_kg: number | null;
  photo_url: string | null;
  is_active: boolean;
  pet_breeds?: MaybeRelation<PetBreedRow>;
};

type PetProfileRow = {
  pet_id: string;
  visibility_status: "public" | "private" | "lost_mode";
  medical_profile_enabled: boolean;
};

type PetTagRow = {
  pet_id: string;
  status: string;
  sold_plan_type: "essential" | "custom" | "partner_batch" | "other";
};

type PetCardRow = PetRow & {
  visibility_status: "public" | "private" | "lost_mode";
  medical_profile_enabled: boolean;
  active_tags: number;
  has_custom_active: boolean;
};

function firstRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getBreedLabel(pet: PetRow) {
  const breed = firstRelation(pet.pet_breeds);

  if (pet.breed_custom?.trim()) return pet.breed_custom.trim();
  if (breed?.name_es?.trim()) return breed.name_es.trim();
  if (breed?.name?.trim()) return breed.name.trim();

  return null;
}

function getSexLabel(sex: string | null) {
  if (sex === "male") return "Macho";
  if (sex === "female") return "Hembra";
  return "No especificado";
}

function getSpeciesLabel(species: string | null) {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  return "Mascota";
}

function getVisibilityLabel(visibility: "public" | "private" | "lost_mode") {
  if (visibility === "public") return "Perfil público";
  if (visibility === "private") return "Perfil privado";
  return "Modo perdido";
}

function getVisibilityClass(visibility: "public" | "private" | "lost_mode") {
  if (visibility === "lost_mode") {
    return "border-orange-400/20 bg-orange-400/10 text-orange-200";
  }

  if (visibility === "private") {
    return "border-white/10 bg-white/5 text-white/65";
  }

  return "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200";
}

export default function MyPets() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [pets, setPets] = useState<PetCardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadPets = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          breed_id,
          breed_custom,
          sex,
          color,
          birthdate,
          weight_kg,
          photo_url,
          is_active,
          pet_breeds (
            name,
            name_es
          )
        `)
        .eq("owner_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (petsError) throw petsError;

      const basePets = (petsData ?? []) as PetRow[];

      if (basePets.length === 0) {
        setPets([]);
        return;
      }

      const petIds = basePets.map((pet) => pet.id);

      const [profilesRes, tagsRes] = await Promise.all([
        supabase
          .from("pet_profiles")
          .select("pet_id, visibility_status, medical_profile_enabled")
          .in("pet_id", petIds),

        supabase
          .from("pet_tags")
          .select("pet_id, status, sold_plan_type")
          .in("pet_id", petIds)
          .eq("status", "active"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (tagsRes.error) throw tagsRes.error;

      const profiles = (profilesRes.data ?? []) as PetProfileRow[];
      const activeTags = (tagsRes.data ?? []) as PetTagRow[];

      const profileMap = new Map<string, PetProfileRow>();

      for (const profile of profiles) {
        profileMap.set(profile.pet_id, profile);
      }

      const tagStatsMap = new Map<
        string,
        { active_tags: number; has_custom_active: boolean }
      >();

      for (const tag of activeTags) {
        const current = tagStatsMap.get(tag.pet_id) ?? {
          active_tags: 0,
          has_custom_active: false,
        };

        current.active_tags += 1;

        if (tag.sold_plan_type === "custom") {
          current.has_custom_active = true;
        }

        tagStatsMap.set(tag.pet_id, current);
      }

      const normalizedPets: PetCardRow[] = basePets.map((pet) => {
        const petProfile = profileMap.get(pet.id);
        const tagStats = tagStatsMap.get(pet.id);

        return {
          ...pet,
          visibility_status: petProfile?.visibility_status ?? "public",
          medical_profile_enabled: !!petProfile?.medical_profile_enabled,
          active_tags: tagStats?.active_tags ?? 0,
          has_custom_active: !!tagStats?.has_custom_active,
        };
      });

      setPets(normalizedPets);
    } catch (error) {
      console.error("MyPets load error:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar tus mascotas."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) return;
    void loadPets();
  }, [authLoading, user?.id, loadPets]);

  const openCreate = () => {
    setShowCreate((prev) => !prev);
  };

  const totalPets = useMemo(() => pets.length, [pets]);

  const totalActiveTags = useMemo(
    () => pets.reduce((sum, pet) => sum + pet.active_tags, 0),
    [pets]
  );

  const totalMedicalEnabled = useMemo(
    () =>
      pets.filter(
        (pet) => pet.medical_profile_enabled || pet.has_custom_active
      ).length,
    [pets]
  );

  const totalWithoutTag = useMemo(
    () => pets.filter((pet) => pet.active_tags === 0).length,
    [pets]
  );

  const showLoading = authLoading || loading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.12),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Mis mascotas
                    </span>

                    <div className="space-y-4">
                      <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                        Gestiona tus{" "}
                        <span className="text-[#E8C547]">mascotas</span>
                      </h1>

                      <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Registra, edita y organiza la información de tus mascotas
                        para usar Mokko de forma ordenada.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openCreate}
                    disabled={showLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:py-3.5"
                  >
                    <Plus className="h-4 w-4" />
                    {showCreate ? "Cerrar formulario" : "Agregar mascota"}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {errorMsg}
                </div>
              )}

              <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  icon={PawPrint}
                  label="Mascotas"
                  value={showLoading ? "—" : totalPets}
                  description="Registradas."
                />

                <MetricCard
                  icon={Tags}
                  label="Placas"
                  value={showLoading ? "—" : totalActiveTags}
                  description="Activas."
                />

                <MetricCard
                  icon={HeartPulse}
                  label="Ficha médica"
                  value={showLoading ? "—" : totalMedicalEnabled}
                  description="Habilitadas."
                />

                <MetricCard
                  icon={ShieldCheck}
                  label="Sin placa"
                  value={showLoading ? "—" : totalWithoutTag}
                  description="Pendientes."
                  highlight={totalWithoutTag > 0}
                />
              </section>

              {showCreate && (
                <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold leading-tight">
                      Nueva mascota
                    </h2>
                    <p className="text-sm leading-7 text-white/65">
                      Completa los datos básicos. Luego podrás ampliar con perfil
                      público, datos médicos y vacunas.
                    </p>
                  </div>

                  <div className="mt-6">
                    <PetForm
                      mode="create"
                      onSuccess={() => {
                        setShowCreate(false);
                        void loadPets();
                      }}
                      onCancel={() => setShowCreate(false)}
                    />
                  </div>
                </section>
              )}

              <section className="mt-7">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold">Listado</h2>
                    <p className="mt-2 text-sm leading-7 text-white/60">
                      Revisa el estado y accesos rápidos de cada mascota.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  {showLoading ? (
                    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-8 text-center text-white/65">
                      Cargando mascotas...
                    </div>
                  ) : pets.length === 0 ? (
                    <div className="rounded-[28px] border border-white/10 bg-[#141410] p-6">
                      <div className="text-xl font-semibold">
                        Aún no tienes mascotas registradas
                      </div>

                      <p className="mt-2 text-sm leading-7 text-white/65">
                        Empieza agregando tu primera mascota para luego activar
                        una placa, completar su perfil y configurar sus datos.
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowCreate(true)}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                      >
                        <Plus className="h-4 w-4" />
                        Agregar mi primera mascota
                      </button>
                    </div>
                  ) : (
                    pets.map((pet) => {
                      const breedLabel = getBreedLabel(pet);
                      const perfilMedicoDisponible =
                        pet.medical_profile_enabled || pet.has_custom_active;

                      return (
                        <article
                          key={pet.id}
                          className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-xl transition hover:border-[#E8C547]/20 hover:bg-white/[0.055]"
                        >
                          <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="flex items-center gap-4">
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                                  {pet.photo_url ? (
                                    <img
                                      src={pet.photo_url}
                                      alt={`Foto de ${pet.name}`}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs text-white/38">
                                      Sin foto
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="truncate text-xl font-semibold text-[#F5F0E8]">
                                    {pet.name}
                                  </div>

                                  <div className="mt-1 text-sm text-white/50">
                                    {getSpeciesLabel(pet.species)}
                                    {breedLabel ? ` • ${breedLabel}` : ""}
                                  </div>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <StatusPill
                                      className={getVisibilityClass(
                                        pet.visibility_status
                                      )}
                                    >
                                      {getVisibilityLabel(pet.visibility_status)}
                                    </StatusPill>

                                    <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                      {getSexLabel(pet.sex)}
                                    </StatusPill>

                                    {pet.color && (
                                      <StatusPill className="border-white/10 bg-white/5 text-white/75">
                                        {pet.color}
                                      </StatusPill>
                                    )}

                                    {pet.active_tags === 0 ? (
                                      <StatusPill className="border-red-400/20 bg-red-400/10 text-red-200">
                                        Sin placa
                                      </StatusPill>
                                    ) : (
                                      <StatusPill className="border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200">
                                        {pet.active_tags} placa
                                        {pet.active_tags === 1 ? "" : "s"}
                                      </StatusPill>
                                    )}

                                    {perfilMedicoDisponible && (
                                      <StatusPill className="border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]">
                                        Ficha médica
                                      </StatusPill>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                              <Link
                                to={`/mis-mascotas/${pet.id}`}
                                className="inline-flex items-center justify-center rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] transition hover:bg-[#f0cf55]"
                              >
                                Detalles
                              </Link>

                              <Link
                                to={`/mis-mascotas/${pet.id}/perfil-publico`}
                                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                              >
                                Perfil público
                              </Link>

                              {perfilMedicoDisponible ? (
                                <Link
                                  to={`/mis-mascotas/${pet.id}/perfil-medico`}
                                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Ficha médica
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/35"
                                >
                                  Ficha médica
                                </button>
                              )}

                              <Link
                                to={`/mis-mascotas/${pet.id}/editar?from=list`}
                                className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                              >
                                Editar
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 sm:rounded-[28px] sm:p-5 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">
          {label}
        </div>

        <div
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            highlight
              ? "bg-[#E8C547]/10 text-[#E8C547]"
              : "bg-white/10 text-white/60"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 text-3xl font-semibold text-[#F5F0E8]">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: ReactNode;
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
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PetForm from "../components/pets/PetForm";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import SectionTitle from "../components/ui/SectionTitle";
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

export default function MyPets() {
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPet, setEditingPet] = useState<PetRow | null>(null);
  const [pets, setPets] = useState<PetCardRow[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const loadPets = async () => {
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
        const profile = profileMap.get(pet.id);
        const tagStats = tagStatsMap.get(pet.id);

        return {
          ...pet,
          visibility_status: profile?.visibility_status ?? "public",
          medical_profile_enabled: !!profile?.medical_profile_enabled,
          active_tags: tagStats?.active_tags ?? 0,
          has_custom_active: !!tagStats?.has_custom_active,
        };
      });

      setPets(normalizedPets);
    } catch (error: any) {
      console.error("MyPets load error:", error);
      setErrorMsg(error?.message ?? "No se pudieron cargar tus mascotas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    void loadPets();
  }, [authLoading, user?.id]);

  const getBreedLabel = (pet: PetRow) => {
    const breed = firstRelation(pet.pet_breeds);

    if (pet.breed_custom?.trim()) return pet.breed_custom.trim();
    if (breed?.name_es?.trim()) return breed.name_es.trim();
    if (breed?.name?.trim()) return breed.name.trim();

    return null;
  };

  const getSexLabel = (sex: string | null) => {
    if (sex === "male") return "Macho";
    if (sex === "female") return "Hembra";
    return "No especificado";
  };

  const getSpeciesLabel = (species: string | null) => {
    if (species === "dog") return "Perro";
    if (species === "cat") return "Gato";
    return "Mascota";
  };

  const getVisibilityLabel = (visibility: "public" | "private" | "lost_mode") => {
    if (visibility === "public") return "Público";
    if (visibility === "private") return "Privado";
    return "Perdido";
  };

  const openCreate = () => {
    setEditingPet(null);
    setShowCreate((prev) => !prev);
  };

  const openEdit = (pet: PetRow) => {
    setShowCreate(false);
    setEditingPet(pet);
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

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.12),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Mis mascotas
              </span>

              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold sm:text-5xl">
                    Gestiona tus <span className="text-[#E8C547]">mascotas</span>
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                    Aquí podrás registrar, editar y organizar la información de tus
                    mascotas para usar Mokko de forma ordenada.
                  </p>
                </div>

                <Button variant="primary" onClick={openCreate} className="px-5 py-3">
                  {showCreate ? "Cerrar formulario" : "Agregar mascota"}
                </Button>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Card variant="subtle" className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Mascotas
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#F5F0E8]">
                    {authLoading || loading ? "—" : totalPets}
                  </div>
                </Card>

                <Card variant="subtle" className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Placas activas
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#F5F0E8]">
                    {authLoading || loading ? "—" : totalActiveTags}
                  </div>
                </Card>

                <Card variant="subtle" className="p-5">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
                    Perfil médico habilitado
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-[#F5F0E8]">
                    {authLoading || loading ? "—" : totalMedicalEnabled}
                  </div>
                </Card>
              </div>

              {showCreate && (
                <Card variant="panel" className="mt-8 p-6">
                  <SectionTitle
                    title="Nueva mascota"
                    description="Completa los datos básicos. Luego podrás ampliar con perfil público, datos médicos y vacunas."
                  />

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
                </Card>
              )}

              {editingPet && (
                <Card variant="panel" className="mt-8 p-6">
                  <SectionTitle
                    title="Editar mascota"
                    description="Actualiza la información básica de tu mascota."
                  />

                  <div className="mt-6">
                    <PetForm
                      mode="edit"
                      initialValues={{
                        id: editingPet.id,
                        name: editingPet.name,
                        species: editingPet.species === "cat" ? "cat" : "dog",
                        breed_id: editingPet.breed_id,
                        breed_custom: editingPet.breed_custom ?? "",
                        sex:
                          editingPet.sex === "male" ||
                          editingPet.sex === "female" ||
                          editingPet.sex === "unknown"
                            ? editingPet.sex
                            : "unknown",
                        color: editingPet.color ?? "",
                        birthdate: editingPet.birthdate ?? "",
                        weight_kg: editingPet.weight_kg,
                        photo_url: editingPet.photo_url ?? "",
                      }}
                      onSuccess={() => {
                        setEditingPet(null);
                        void loadPets();
                      }}
                      onCancel={() => setEditingPet(null)}
                    />
                  </div>
                </Card>
              )}

              <div className="mt-8 grid gap-4">
                {loading || authLoading ? (
                  <Card variant="dark" className="p-8 text-center text-white/65">
                    Cargando mascotas...
                  </Card>
                ) : pets.length === 0 ? (
                  <Card variant="dark" className="p-8">
                    <div className="text-xl font-semibold">
                      Aún no tienes mascotas registradas
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/65">
                      Empieza agregando tu primera mascota para luego activar una
                      placa, completar su perfil y configurar sus datos médicos.
                    </p>
                  </Card>
                ) : (
                  pets.map((pet) => {
                    const breedLabel = getBreedLabel(pet);
                    const perfilMedicoDisponible =
                      pet.medical_profile_enabled || pet.has_custom_active;

                    return (
                      <Card key={pet.id} variant="subtle" className="p-5">
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#E8C547]/8 bg-white/5">
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

                              <div>
                                <div className="text-xl font-semibold text-[#F5F0E8]">
                                  {pet.name}
                                </div>

                                <div className="mt-1 text-sm text-white/50">
                                  {getSpeciesLabel(pet.species)}
                                  {breedLabel ? ` • ${breedLabel}` : ""}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                                {getSexLabel(pet.sex)}
                              </span>

                              {pet.color && (
                                <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                                  {pet.color}
                                </span>
                              )}

                              <span className="inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-xs font-medium text-[#f6df8a]">
                                {getVisibilityLabel(pet.visibility_status)}
                              </span>

                              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/75">
                                {pet.active_tags} placa{pet.active_tags === 1 ? "" : "s"} activa
                                {pet.active_tags === 1 ? "" : "s"}
                              </span>

                              {perfilMedicoDisponible && (
                                <span className="inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-xs font-medium text-[#f6df8a]">
                                  Perfil médico
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link to={`/mis-mascotas/${pet.id}`} className="contents">
                              <Button variant="ghost">Ver detalles</Button>
                            </Link>

                            <Link
                              to={`/mis-mascotas/${pet.id}/perfil-publico`}
                              className="contents"
                            >
                              <Button variant="ghost">Perfil público</Button>
                            </Link>

                            {perfilMedicoDisponible ? (
                              <Link
                                to={`/mis-mascotas/${pet.id}/perfil-medico`}
                                className="contents"
                              >
                                <Button variant="ghost">Perfil médico</Button>
                              </Link>
                            ) : (
                              <Button variant="ghost" disabled>
                                Perfil médico
                              </Button>
                            )}

                            <Button variant="ghost" onClick={() => openEdit(pet)}>
                              Editar
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
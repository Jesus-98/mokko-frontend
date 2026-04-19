import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type MaybeRelation<T> = T | T[] | null | undefined;

type PetBreedRow = {
  name: string | null;
  name_es?: string | null;
};

type PetRow = {
  id: string;
  name: string;
  species: string | null;
  breed_id: string | null;
  breed_custom?: string | null;
  photo_url?: string | null;
  breed?: MaybeRelation<PetBreedRow>;
};

type PetTagRow = {
  pet_id: string;
  status: string;
};

type FoundReportRow = {
  id: string;
  pet_id: string | null;
  status: string;
};

type PetWithStats = PetRow & {
  activeTags: number;
  petReports: number;
};

function firstRelation<T>(value: MaybeRelation<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function getSpeciesLabel(species: string | null) {
  if (species === "dog") return "Perro";
  if (species === "cat") return "Gato";
  if (species === "other") return "Mascota";
  return "Mascota";
}

function getBreedLabel(pet: PetRow) {
  const breed = firstRelation(pet.breed);

  if (pet.breed_custom?.trim()) return pet.breed_custom.trim();
  if (breed?.name_es?.trim()) return breed.name_es.trim();
  if (breed?.name?.trim()) return breed.name.trim();

  return null;
}

function isPendingReport(status: string | null | undefined) {
  const normalized = (status ?? "").trim().toLowerCase();
  return normalized === "new" || normalized === "viewed";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const [pets, setPets] = useState<PetRow[]>([]);
  const [petTags, setPetTags] = useState<PetTagRow[]>([]);
  const [reports, setReports] = useState<FoundReportRow[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMsg("");
    setWarningMsg("");

    try {
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select(`
          id,
          name,
          species,
          breed_id,
          breed_custom,
          photo_url,
          breed:pet_breeds!pets_breed_id_fkey (
            name,
            name_es
          )
        `)
        .eq("owner_user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (petsError) {
        throw new Error(`No se pudieron cargar tus mascotas: ${petsError.message}`);
      }

      const normalizedPets = (petsData ?? []) as PetRow[];
      setPets(normalizedPets);

      const petIds = normalizedPets.map((pet) => pet.id);

      if (petIds.length === 0) {
        setPetTags([]);
        setReports([]);
        return;
      }

      const [petTagsRes, reportsRes] = await Promise.all([
        supabase
          .from("pet_tags")
          .select("pet_id, status")
          .in("pet_id", petIds),

        supabase
          .from("found_reports")
          .select("id, pet_id, status")
          .in("pet_id", petIds)
          .order("created_at", { ascending: false }),
      ]);

      const warnings: string[] = [];

      if (petTagsRes.error) {
        console.error(
          "Error cargando placas activas en dashboard:",
          petTagsRes.error.message
        );
        setPetTags([]);
        warnings.push(
          "No se pudieron cargar todas las placas activas. Se muestran datos parciales."
        );
      } else {
        setPetTags((petTagsRes.data ?? []) as PetTagRow[]);
      }

      if (reportsRes.error) {
        console.error(
          "Error cargando reportes en dashboard:",
          reportsRes.error.message
        );
        setReports([]);
        warnings.push(
          "No se pudieron cargar todos los reportes. Se muestran datos parciales."
        );
      } else {
        setReports((reportsRes.data ?? []) as FoundReportRow[]);
      }

      setWarningMsg(warnings.join(" "));
    } catch (error) {
      console.error("Error cargando dashboard:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Ocurrió un error cargando el dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setPets([]);
      setPetTags([]);
      setReports([]);
      setErrorMsg("");
      setWarningMsg("");
      setLoading(false);
      return;
    }

    void loadDashboard();
  }, [authLoading, user?.id, loadDashboard]);

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    profile?.email?.split("@")[0] ||
    "Usuario";

  const displayEmail = user?.email || profile?.email || "Sin correo";

  const tagsByPet = useMemo(() => {
    const map = new Map<string, number>();

    for (const tag of petTags) {
      if (tag.status === "active") {
        map.set(tag.pet_id, (map.get(tag.pet_id) || 0) + 1);
      }
    }

    return map;
  }, [petTags]);

  const pendingReports = useMemo(() => {
    return reports.filter((report) => isPendingReport(report.status));
  }, [reports]);

  const reportsByPet = useMemo(() => {
    const map = new Map<string, number>();

    for (const report of pendingReports) {
      if (report.pet_id) {
        map.set(report.pet_id, (map.get(report.pet_id) || 0) + 1);
      }
    }

    return map;
  }, [pendingReports]);

  const petsWithStats = useMemo<PetWithStats[]>(() => {
    return pets.map((pet) => ({
      ...pet,
      activeTags: tagsByPet.get(pet.id) || 0,
      petReports: reportsByPet.get(pet.id) || 0,
    }));
  }, [pets, tagsByPet, reportsByPet]);

  const totalPets = pets.length;
  const totalActiveTags = useMemo(
    () => petTags.filter((tag) => tag.status === "active").length,
    [petTags]
  );
  const totalReports = pendingReports.length;

  const showLoading = authLoading || loading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Dashboard Mokko
              </span>

              <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Hola, <span className="text-[#E8C547]">{displayName}</span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    Aquí puedes gestionar tus mascotas, revisar placas activas,
                    administrar tus placas y acceder rápidamente a tu cuenta Mokko.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/activar")}
                  disabled={showLoading}
                  className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Activar nueva placa
                </button>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              {!!warningMsg && !errorMsg && (
                <div className="mt-6 rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm text-[#f6df8a]">
                  {warningMsg}
                </div>
              )}

              <div className="mt-8 grid gap-6 xl:grid-cols-[1.42fr_0.98fr]">
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-[28px] border border-[#E8C547]/12 bg-white/[0.05] p-6">
                      <div className="text-sm uppercase tracking-[0.16em] text-white/45">
                        Mascotas
                      </div>
                      <div className="mt-4 text-4xl font-semibold text-[#F5F0E8]">
                        {showLoading ? "—" : totalPets}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/65">
                        Registradas actualmente en tu cuenta.
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                      <div className="text-sm uppercase tracking-[0.16em] text-white/45">
                        Placas activas
                      </div>
                      <div className="mt-4 text-4xl font-semibold text-[#F5F0E8]">
                        {showLoading ? "—" : totalActiveTags}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/65">
                        Placas vinculadas a tus mascotas.
                      </p>
                    </div>

                    <div className="rounded-[28px] border border-[#E8C547]/16 bg-[#E8C547]/8 p-6">
                      <div className="text-sm uppercase tracking-[0.16em] text-white/45">
                        Reportes pendientes
                      </div>
                      <div className="mt-4 text-4xl font-semibold text-[#F5F0E8]">
                        {showLoading ? "—" : totalReports}
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/65">
                        Reportes nuevos o vistos que siguen pendientes.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold">Tus mascotas</h2>
                        <p className="mt-2 text-sm leading-7 text-white/70">
                          Resumen rápido de tus mascotas y su actividad.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-mascotas")}
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4">
                      {showLoading ? (
                        <div className="rounded-[24px] border border-white/10 bg-[#141410] p-5 text-white/65">
                          Cargando mascotas...
                        </div>
                      ) : petsWithStats.length === 0 ? (
                        <div className="rounded-[24px] border border-white/10 bg-[#141410] p-5">
                          <div className="text-lg font-semibold">
                            Aún no tienes mascotas registradas
                          </div>
                          <p className="mt-2 text-sm leading-7 text-white/65">
                            Registra tu primera mascota para activar una placa y
                            empezar a gestionar su información.
                          </p>

                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => navigate("/mis-mascotas")}
                              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                            >
                              Ir a mis mascotas
                            </button>
                          </div>
                        </div>
                      ) : (
                        petsWithStats.map((pet) => {
                          const breedLabel = getBreedLabel(pet);

                          return (
                            <div
                              key={pet.id}
                              className="rounded-[24px] border border-white/10 bg-[#141410] p-5"
                            >
                              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                                    {pet.photo_url ? (
                                      <img
                                        src={pet.photo_url}
                                        alt={pet.name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-xs text-white/35">
                                        Sin foto
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-xl font-semibold">{pet.name}</div>
                                    <div className="mt-1 text-sm text-white/50">
                                      {getSpeciesLabel(pet.species)}
                                      {breedLabel ? ` • ${breedLabel}` : ""}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                                    {pet.activeTags} placa
                                    {pet.activeTags === 1 ? "" : "s"} activa
                                    {pet.activeTags === 1 ? "" : "s"}
                                  </div>

                                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                                    {pet.petReports} reporte
                                    {pet.petReports === 1 ? "" : "s"} pendiente
                                    {pet.petReports === 1 ? "" : "s"}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/mis-mascotas/${pet.id}`)}
                                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Ver detalle
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate("/mis-placas")}
                                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Ver placas
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate("/activar")}
                                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                                >
                                  Activar otra placa
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-6">
                  <div className="rounded-[32px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6">
                    <h2 className="text-2xl font-semibold">Accesos rápidos</h2>
                    <p className="mt-2 text-sm leading-7 text-white/70">
                      Entra rápido a las acciones más importantes de tu cuenta.
                    </p>

                    <div className="mt-6 grid gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/my-account")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Mis datos</div>
                        <div className="mt-1 text-sm text-white/65">
                          Edita tu información personal y de contacto.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-placas")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Mis placas</div>
                        <div className="mt-1 text-sm text-white/65">
                          Gestiona tus placas activas, principales, suspendidas o extraviadas.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-pedidos")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Mis pedidos</div>
                        <div className="mt-1 text-sm text-white/65">
                          Revisa tus órdenes, estados y placas solicitadas.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-reportes")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Mis reportes</div>
                        <div className="mt-1 text-sm text-white/65">
                          Revisa los reportes asociados a tus mascotas.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/activar")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Activar placa</div>
                        <div className="mt-1 text-sm text-white/65">
                          Vincula una nueva placa a una mascota.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/pedido")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">Obtener placa</div>
                        <div className="mt-1 text-sm text-white/65">
                          Crea un nuevo pedido de placas Mokko.
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold">Estado de tu cuenta</h2>
                        <p className="mt-2 text-sm leading-7 text-white/70">
                          Gestiona tu información principal y mantén tu cuenta al día.
                        </p>
                      </div>

                      <span className="inline-flex items-center justify-center rounded-full border border-[#2D5A27]/30 bg-[#2D5A27]/15 px-3 py-1 text-xs font-medium text-green-200">
                        Sesión activa
                      </span>
                    </div>

                    <div className="mt-6 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Usuario
                        </div>
                        <div className="mt-2 text-base font-semibold">
                          {displayName}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                        <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                          Correo
                        </div>
                        <div className="mt-2 break-all text-sm font-medium text-white/80">
                          {displayEmail}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/my-account")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Actualizar mis datos
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Modifica tu nombre, datos de contacto y la información de tu cuenta.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-placas")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Gestionar mis placas
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Define tu placa principal y administra estados como suspendida, extraviada o retirada.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/update-password")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Cambiar contraseña
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Actualiza tu contraseña para mantener tu cuenta protegida.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/mis-pedidos")}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
                      >
                        <div className="text-base font-semibold">
                          Revisar actividad de compra
                        </div>
                        <div className="mt-1 text-sm text-white/65">
                          Consulta el estado de tus pedidos y el detalle de tus placas.
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
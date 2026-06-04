import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ChevronLeft, PawPrint } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PetForm from "../components/pets/PetForm";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type SpeciesType = "dog" | "cat";
type PetSexType = "male" | "female" | "unknown";

type PetEditRow = {
  id: string;
  name: string;
  species: string | null;
  breed_id: string | null;
  breed_custom: string | null;
  sex: string | null;
  color: string | null;
  birthdate: string | null;
  weight_kg: number | null;
  photo_url: string | null;
};

function normalizeSpecies(value: string | null): SpeciesType {
  return value === "cat" ? "cat" : "dog";
}

function normalizeSex(value: string | null): PetSexType {
  if (value === "male" || value === "female" || value === "unknown") {
    return value;
  }

  return "unknown";
}

export default function EditPet() {
  const { id } = useParams<{ id: string }>();
  const petId = id ?? "";

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const cameFromList = searchParams.get("from") === "list";

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [pet, setPet] = useState<PetEditRow | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(
        `/login?next=${encodeURIComponent(
          `${location.pathname}${location.search}`
        )}`,
        { replace: true }
      );
      return;
    }

    if (!petId) {
      setErrorMsg("No se encontró la mascota solicitada.");
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadPet = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        const { data, error } = await supabase
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
            photo_url
          `)
          .eq("id", petId)
          .eq("owner_user_id", user.id)
          .eq("is_active", true)
          .single();

        if (error || !data) {
          throw new Error("No se pudo cargar la mascota.");
        }

        if (!mounted) return;

        setPet(data as PetEditRow);
      } catch (error) {
        console.error("EditPet load error:", error);

        if (!mounted) return;

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información de la mascota."
        );
        setPet(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadPet();

    return () => {
      mounted = false;
    };
  }, [authLoading, location.pathname, location.search, navigate, petId, user]);

  const goBack = () => {
    if (cameFromList || !petId) {
      navigate("/mis-mascotas");
      return;
    }

    navigate(`/mis-mascotas/${petId}`);
  };

  const handleSuccess = () => {
    if (cameFromList) {
      navigate("/mis-mascotas");
      return;
    }

    navigate(`/mis-mascotas/${petId}`);
  };

  const backLabel = cameFromList
    ? "Volver a mis mascotas"
    : "Volver al detalle";

  if (authLoading || loading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-8 md:py-12">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-10 text-center text-white/70 sm:rounded-[32px] sm:px-6 sm:py-12">
              Cargando formulario de edición...
            </div>
          </section>
        </main>

        <Footer />
      </>
    );
  }

  if (errorMsg || !pet) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-8 md:py-12">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-red-400/20 bg-red-400/10 px-5 py-10 sm:rounded-[32px] sm:px-6 sm:py-12">
              <div className="text-2xl font-semibold">
                No se pudo cargar la mascota
              </div>

              <p className="mt-3 text-sm leading-7 text-red-200">
                {errorMsg || "No se encontró información para esta mascota."}
              </p>

              <button
                type="button"
                onClick={() => navigate("/mis-mascotas")}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] sm:w-auto sm:py-3.5"
              >
                Volver a mis mascotas
              </button>
            </div>
          </section>
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
            <div className="mx-auto max-w-4xl">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Editar mascota
                    </span>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                        {pet.photo_url ? (
                          <img
                            src={pet.photo_url}
                            alt={`Foto de ${pet.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <PawPrint className="h-8 w-8 text-white/25" />
                          </div>
                        )}
                      </div>

                      <div>
                        <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                          {pet.name}
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                          Actualiza los datos principales de tu mascota.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={goBack}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] sm:w-auto sm:py-3.5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {backLabel}
                  </button>
                </div>
              </div>

              <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold leading-tight">
                    Información de la mascota
                  </h2>

                  <p className="text-sm leading-7 text-white/65">
                    Los cambios se guardarán directamente en el perfil de esta
                    mascota.
                  </p>
                </div>

                <div className="mt-6">
                  <PetForm
                    mode="edit"
                    initialValues={{
                      id: pet.id,
                      name: pet.name,
                      species: normalizeSpecies(pet.species),
                      breed_id: pet.breed_id,
                      breed_custom: pet.breed_custom ?? "",
                      sex: normalizeSex(pet.sex),
                      color: pet.color ?? "",
                      birthdate: pet.birthdate ?? "",
                      weight_kg: pet.weight_kg,
                      photo_url: pet.photo_url ?? "",
                    }}
                    onSuccess={handleSuccess}
                    onCancel={goBack}
                  />
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
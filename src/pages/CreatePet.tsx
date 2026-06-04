import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, PawPrint } from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PetForm from "../components/pets/PetForm";
import { useAuth } from "../context/AuthContext";

export default function CreatePet() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(
        `/login?next=${encodeURIComponent(
          `${location.pathname}${location.search}`
        )}`,
        { replace: true }
      );
    }
  }, [authLoading, location.pathname, location.search, navigate, user]);

  const goBack = () => {
    navigate("/mis-mascotas");
  };

  if (authLoading) {
    return (
      <>
        <Header />

        <main className="min-h-screen bg-[#1A1A14] text-white">
          <section className="mokko-container py-8 md:py-12">
            <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/[0.04] px-5 py-10 text-center text-white/70 sm:rounded-[32px] sm:px-6 sm:py-12">
              Cargando formulario...
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
                      Nueva mascota
                    </span>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                        <PawPrint className="h-8 w-8 text-[#E8C547]" />
                      </div>

                      <div>
                        <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                          Agregar mascota
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                          Registra los datos principales de tu mascota para
                          luego activar una placa, configurar su perfil público
                          y completar su ficha médica.
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
                    Volver a mis mascotas
                  </button>
                </div>
              </div>

              <section className="mt-7 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px]">
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold leading-tight">
                    Información de la mascota
                  </h2>

                  <p className="text-sm leading-7 text-white/65">
                    Completa los datos básicos. Podrás actualizarlos cuando lo
                    necesites.
                  </p>
                </div>

                <div className="mt-6">
                  <PetForm
                    mode="create"
                    onSuccess={() => navigate("/mis-mascotas")}
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
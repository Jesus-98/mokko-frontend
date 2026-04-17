import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function getSafeNext(search: string) {
  const rawNext = new URLSearchParams(search).get("next");

  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/")) return "/dashboard";

  return rawNext;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const next = useMemo(() => getSafeNext(location.search), [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(next, { replace: true });
    }
  }, [authLoading, user, navigate, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginLoading || forgotLoading || authLoading) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoginLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedEmail) {
        throw new Error("Ingresa tu correo.");
      }

      if (!password.trim()) {
        throw new Error("Ingresa tu contraseña.");
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("handleLogin error", err);

      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al iniciar sesión."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (loginLoading || forgotLoading || authLoading) return;

    setErrorMsg("");
    setSuccessMsg("");

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setErrorMsg("Ingresa tu correo para enviarte el enlace de recuperación.");
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg(
        "Te enviamos un enlace para restablecer tu contraseña."
      );
    } catch (err) {
      console.error("handleForgotPassword error", err);

      setErrorMsg(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el correo de recuperación."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const isBusy = loginLoading || forgotLoading || authLoading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[32px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-6 sm:p-8">
                <span className="mokko-badge mokko-badge-primary w-fit">
                  Acceso Mokko
                </span>

                <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                  Inicia sesión en{" "}
                  <span className="text-[#E8C547]">tu cuenta</span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  Accede para gestionar tus mascotas, activar placas Mokko y
                  actualizar la información visible cuando alguien encuentre a tu
                  compañero.
                </p>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-medium text-white">
                      Acceso rápido
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Entra a tu cuenta y continúa donde lo dejaste.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-medium text-white">
                      Recuperación simple
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Si olvidaste tu contraseña, te enviaremos un enlace para
                      crear una nueva.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">
                    Bienvenido de nuevo
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Ingresa con tu correo y contraseña para continuar.
                  </p>
                </div>

                <form onSubmit={handleLogin} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                      placeholder="tucorreo@ejemplo.com"
                      required
                      disabled={isBusy}
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                      placeholder="••••••••"
                      required
                      disabled={isBusy}
                      autoComplete="current-password"
                    />
                  </div>

                  {errorMsg && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                      {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                      {successMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loginLoading
                      ? "Ingresando..."
                      : authLoading
                      ? "Cargando..."
                      : "Ingresar"}
                  </button>
                </form>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isBusy}
                    className="text-left text-white/60 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {forgotLoading
                      ? "Enviando enlace..."
                      : "¿Olvidaste tu contraseña?"}
                  </button>

                  <div className="text-sm text-white/60">
                    ¿Aún no tienes cuenta?{" "}
                    <Link
                      to={`/register?next=${encodeURIComponent(next)}`}
                      className="font-medium text-[#E8C547] transition hover:text-[#f0cf55]"
                    >
                      Crear cuenta
                    </Link>
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
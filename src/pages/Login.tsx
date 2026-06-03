import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function getSafeNext(search: string) {
  const rawNext = new URLSearchParams(search).get("next");

  if (!rawNext) return "/dashboard";
  if (!rawNext.startsWith("/")) return "/dashboard";
  if (rawNext.startsWith("//")) return "/dashboard";

  return rawNext;
}

function getSiteUrl() {
  return import.meta.env.PROD
    ? "https://www.mokkopet.com"
    : "http://localhost:5173";
}

function getReadableAuthError(message: string) {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes("email rate limit exceeded")) {
    return "Has solicitado demasiados correos en poco tiempo. Espera unos minutos e inténtalo nuevamente.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }

  if (normalized.includes("too many requests")) {
    return "Se detectaron demasiados intentos. Espera un momento e inténtalo nuevamente.";
  }

  if (normalized.includes("unable to validate email address")) {
    return "Ingresa un correo válido.";
  }

  if (normalized.includes("for security purposes")) {
    return "Por seguridad, espera un momento antes de volver a intentarlo.";
  }

  return "No se pudo completar la operación. Inténtalo nuevamente.";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const next = useMemo(() => getSafeNext(location.search), [location.search]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(next, { replace: true });
    }
  }, [authLoading, user, navigate, next]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
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

      if (err instanceof Error) {
        setErrorMsg(getReadableAuthError(err.message));
      } else {
        setErrorMsg("Ocurrió un error inesperado al iniciar sesión.");
      }
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
      const siteUrl = getSiteUrl();

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${siteUrl}/update-password`,
      });

      if (error) {
        throw error;
      }

      setSuccessMsg("Te enviamos un enlace para restablecer tu contraseña.");
    } catch (err) {
      console.error("handleForgotPassword error", err);

      if (err instanceof Error) {
        setErrorMsg(getReadableAuthError(err.message));
      } else {
        setErrorMsg("No se pudo enviar el correo de recuperación.");
      }
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

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
              <div className="order-2 rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 sm:p-8 lg:order-1 lg:rounded-[32px]">
                <div className="space-y-5">
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    Acceso Mokko
                  </span>

                  <div className="space-y-4">
                    <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                      Inicia sesión en{" "}
                      <span className="text-[#E8C547]">tu cuenta</span>
                    </h1>

                    <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                      Accede para gestionar tus mascotas, activar placas Mokko y
                      mantener actualizada la información de contacto.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-medium text-white">
                      Gestiona tus mascotas
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Revisa perfiles, placas, reportes y datos importantes
                      desde tu cuenta.
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

              <div className="order-1 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:order-2 lg:rounded-[32px] lg:p-10">
                <div className="mx-auto w-full max-w-[500px]">
                  <div className="space-y-4">
                    <span className="mokko-badge mokko-badge-primary w-fit lg:hidden">
                      Acceso Mokko
                    </span>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.01em] sm:text-3xl">
                        Bienvenido de nuevo
                      </h2>

                      <p className="text-sm leading-7 text-white/65">
                        Ingresa con tu correo y contraseña para continuar.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="mt-7 space-y-5 sm:mt-8">
                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Correo
                      </label>

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                        placeholder="tucorreo@ejemplo.com"
                        required
                        disabled={isBusy}
                        autoComplete="email"
                        inputMode="email"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Contraseña
                      </label>

                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-24 text-base outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                          placeholder="••••••••"
                          required
                          disabled={isBusy}
                          autoComplete="current-password"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          disabled={isBusy}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {showPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>
                    </div>

                    {errorMsg && (
                      <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                        {errorMsg}
                      </div>
                    )}

                    {successMsg && (
                      <div className="rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm leading-6 text-green-200">
                        {successMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isBusy}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                    >
                      {loginLoading
                        ? "Ingresando..."
                        : authLoading
                          ? "Cargando..."
                          : "Ingresar"}
                    </button>
                  </form>

                  <div className="mt-6 grid gap-4 text-sm sm:flex sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isBusy}
                      className="text-left font-medium text-white/65 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {forgotLoading
                        ? "Enviando enlace..."
                        : "¿Olvidaste tu contraseña?"}
                    </button>

                    <div className="text-white/60">
                      ¿Aún no tienes cuenta?{" "}
                      <Link
                        to={`/register?next=${encodeURIComponent(next)}`}
                        className="font-semibold text-[#E8C547] transition hover:text-[#f0cf55]"
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  </div>

                  <div className="mt-7 rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/60">
                    ¿Tienes una placa nueva? Primero crea o ingresa a tu cuenta
                    y luego usa la opción{" "}
                    <span className="text-white/80">Activar placa</span>.
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
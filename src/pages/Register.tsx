import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type PasswordStrength = {
  label: string;
  helper: string;
  color: string;
  width: string;
  textColor: string;
};

function getSafeNext(search: string) {
  const rawNext = new URLSearchParams(search).get("next");

  if (!rawNext) return "/activar";
  if (!rawNext.startsWith("/")) return "/activar";

  return rawNext;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      label: "",
      helper: "",
      color: "bg-white/20",
      width: "w-0",
      textColor: "text-white/40",
    };
  }

  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) {
    return {
      label: "Débil",
      helper: "Agrega más caracteres, números, mayúsculas o símbolos.",
      color: "bg-red-400",
      width: "w-1/3",
      textColor: "text-red-300",
    };
  }

  if (score <= 4) {
    return {
      label: "Media",
      helper: "Va bien, pero puedes reforzarla con mayúsculas o símbolos.",
      color: "bg-yellow-400",
      width: "w-2/3",
      textColor: "text-yellow-300",
    };
  }

  return {
    label: "Fuerte",
    helper: "Buen nivel de seguridad.",
    color: "bg-green-400",
    width: "w-full",
    textColor: "text-green-300",
  };
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const next = useMemo(() => getSafeNext(location.search), [location.search]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(next, { replace: true });
    }
  }, [authLoading, user, navigate, next]);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || authLoading) return;

    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const trimmedFullName = fullName.trim();
      const trimmedEmail = email.trim().toLowerCase();

      if (!trimmedFullName) {
        throw new Error("Ingresa tu nombre completo.");
      }

      if (password.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedFullName,
          },
        },
      });

      if (error) {
        throw error;
      }

      const newUser = data.user;

      if (!newUser) {
        throw new Error("No se pudo completar el registro del usuario.");
      }

      if (data.session) {
        navigate(next, { replace: true });
        return;
      }

      setSuccessMsg(
        "Cuenta creada. Revisa tu correo para confirmar tu registro antes de continuar."
      );
    } catch (err) {
      console.error("handleRegister error", err);

      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado al crear tu cuenta."
      );
    } finally {
      setLoading(false);
    }
  };

  const isBusy = loading || authLoading;

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[32px] border border-[#2D5A27]/60 bg-[#12311c] p-6 sm:p-8">
                <span className="mokko-badge mokko-badge-primary w-fit">
                  Nuevo en Mokko
                </span>

                <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                  Crea tu cuenta y empieza a{" "}
                  <span className="text-[#E8C547]">proteger a tu mascota</span>
                </h1>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                  Regístrate para activar tu placa Mokko, registrar a tu mascota
                  y tener un perfil listo para cuando alguien la encuentre.
                </p>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-medium text-white">
                      Registro rápido
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Crea tu cuenta en minutos y completa el resto más adelante.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-medium text-white">
                      Perfil editable
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Luego podrás actualizar datos, visibilidad y alertas desde
                      tu dashboard.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8">
                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">
                    Crear cuenta
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Completa tus datos para comenzar.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="mt-8 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                      placeholder="Jesús Huarcaya"
                      required
                      disabled={isBusy}
                      autoComplete="name"
                    />
                  </div>

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
                      minLength={8}
                      disabled={isBusy}
                      autoComplete="new-password"
                    />

                    <div className="mt-4 space-y-2">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${passwordStrength.width} ${passwordStrength.color}`}
                        />
                      </div>

                      {password && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Seguridad</span>
                            <span
                              className={`font-medium ${passwordStrength.textColor}`}
                            >
                              {passwordStrength.label}
                            </span>
                          </div>

                          <p
                            className={`text-xs leading-5 ${passwordStrength.textColor}`}
                          >
                            {passwordStrength.helper}
                          </p>
                        </>
                      )}
                    </div>
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
                    {loading
                      ? "Creando cuenta..."
                      : authLoading
                      ? "Cargando..."
                      : "Crear cuenta"}
                  </button>

                  <p className="text-center text-xs text-white/40">
                    Usa al menos 8 caracteres para mayor seguridad.
                  </p>
                </form>

                <div className="mt-6 text-sm text-white/60">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    to={`/login?next=${encodeURIComponent(next)}`}
                    className="font-medium text-[#E8C547] transition hover:text-[#f0cf55]"
                  >
                    Iniciar sesión
                  </Link>
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
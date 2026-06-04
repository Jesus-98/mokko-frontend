import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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

type PasswordValidation = {
  hasMinLength: boolean;
  hasLowercase: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isValid: boolean;
};

function getSafeNext(search: string) {
  const rawNext = new URLSearchParams(search).get("next");

  if (!rawNext) return "/activar";
  if (!rawNext.startsWith("/")) return "/activar";
  if (rawNext.startsWith("//")) return "/activar";

  return rawNext;
}

function validatePassword(password: string): PasswordValidation {
  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return {
    hasMinLength,
    hasLowercase,
    hasUppercase,
    hasNumber,
    hasSymbol,
    isValid:
      hasMinLength &&
      hasLowercase &&
      hasUppercase &&
      hasNumber &&
      hasSymbol,
  };
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

  const validation = validatePassword(password);

  let score = 0;
  if (validation.hasMinLength) score++;
  if (validation.hasLowercase) score++;
  if (validation.hasUppercase) score++;
  if (validation.hasNumber) score++;
  if (validation.hasSymbol) score++;

  if (score <= 2) {
    return {
      label: "Débil",
      helper: "Agrega mayúsculas, minúsculas, números y símbolos.",
      color: "bg-red-400",
      width: "w-1/3",
      textColor: "text-red-300",
    };
  }

  if (score <= 4) {
    return {
      label: "Media",
      helper: "Vas bien, pero aún falta cumplir todos los requisitos.",
      color: "bg-yellow-400",
      width: "w-2/3",
      textColor: "text-yellow-300",
    };
  }

  return {
    label: "Fuerte",
    helper: "Cumple con todos los requisitos de seguridad.",
    color: "bg-green-400",
    width: "w-full",
    textColor: "text-green-300",
  };
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

  if (normalized.includes("user already registered")) {
    return "Ese correo ya está registrado. Intenta iniciar sesión.";
  }

  if (
    normalized.includes("password should contain at least one character of each")
  ) {
    return "La contraseña debe incluir al menos una minúscula, una mayúscula, un número y un símbolo.";
  }

  if (normalized.includes("password should be at least")) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }

  if (normalized.includes("weak password")) {
    return "La contraseña no cumple con el nivel mínimo de seguridad.";
  }

  if (normalized.includes("signup is disabled")) {
    return "El registro está deshabilitado temporalmente.";
  }

  if (normalized.includes("unable to validate email address")) {
    return "Ingresa un correo válido.";
  }

  if (normalized.includes("for security purposes")) {
    return "Por seguridad, espera un momento antes de volver a intentarlo.";
  }

  return "No se pudo crear la cuenta. Revisa tus datos e inténtalo nuevamente.";
}

function RequirementItem({
  met,
  label,
}: {
  met: boolean;
  label: string;
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-[11px] font-medium transition sm:text-xs ${
        met
          ? "border-green-400/20 bg-green-400/10 text-green-200"
          : "border-white/10 bg-white/5 text-white/55"
      }`}
    >
      {met ? "✓ " : ""}
      {label}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const next = useMemo(() => getSafeNext(location.search), [location.search]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(next, { replace: true });
    }
  }, [authLoading, user, navigate, next]);

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
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

      if (!trimmedEmail) {
        throw new Error("Ingresa tu correo.");
      }

      if (!passwordValidation.isValid) {
        throw new Error(
          "Tu contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula, un número y un símbolo."
        );
      }

      const siteUrl = getSiteUrl();

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${siteUrl}${next}`,
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

      if (err instanceof Error) {
        setErrorMsg(getReadableAuthError(err.message));
      } else {
        setErrorMsg("Ocurrió un error inesperado al crear tu cuenta.");
      }
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

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
              <div className="order-2 rounded-[28px] border border-[#2D5A27]/60 bg-[#12311c] p-5 sm:p-8 lg:order-1 lg:rounded-[32px]">
                <div className="space-y-5">
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    Nuevo en Mokko
                  </span>

                  <div className="space-y-4">
                    <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                      Crea tu cuenta y empieza a{" "}
                      <span className="text-[#E8C547]">
                        proteger a tu mascota
                      </span>
                    </h1>

                    <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                      Regístrate para activar tu placa Mokko, registrar a tu
                      mascota y tener un perfil listo para cuando alguien la
                      encuentre.
                    </p>
                  </div>
                </div>

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
                      tu panel.
                    </div>
                  </div>
                </div>
              </div>

              <div className="order-1 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:order-2 lg:rounded-[32px] lg:p-10">
                <div className="mx-auto w-full max-w-[500px]">
                  <div className="space-y-4">
                    <span className="mokko-badge mokko-badge-primary w-fit lg:hidden">
                      Nuevo en Mokko
                    </span>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.01em] sm:text-3xl">
                        Crear cuenta
                      </h2>

                      <p className="text-sm leading-7 text-white/65">
                        Completa tus datos para comenzar.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleRegister}
                    className="mt-7 space-y-5 sm:mt-8"
                  >
                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Nombre completo
                      </label>

                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          setErrorMsg("");
                          setSuccessMsg("");
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-base outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                        placeholder="Tu nombre completo"
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
                          minLength={8}
                          disabled={isBusy}
                          autoComplete="new-password"
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

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <RequirementItem
                          met={passwordValidation.hasMinLength}
                          label="8+ caracteres"
                        />
                        <RequirementItem
                          met={passwordValidation.hasLowercase}
                          label="Minúscula"
                        />
                        <RequirementItem
                          met={passwordValidation.hasUppercase}
                          label="Mayúscula"
                        />
                        <RequirementItem
                          met={passwordValidation.hasNumber}
                          label="Número"
                        />
                        <RequirementItem
                          met={passwordValidation.hasSymbol}
                          label="Símbolo"
                        />
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
                      {loading
                        ? "Creando cuenta..."
                        : authLoading
                          ? "Cargando..."
                          : "Crear cuenta"}
                    </button>

                    <p className="text-center text-xs leading-5 text-white/40">
                      Usa al menos 8 caracteres, una minúscula, una mayúscula,
                      un número y un símbolo.
                    </p>
                  </form>

                  <div className="mt-7 text-sm text-white/60">
                    ¿Ya tienes cuenta?{" "}
                    <Link
                      to={`/login?next=${encodeURIComponent(next)}`}
                      className="font-semibold text-[#E8C547] transition hover:text-[#f0cf55]"
                    >
                      Iniciar sesión
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
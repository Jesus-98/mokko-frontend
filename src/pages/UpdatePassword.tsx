import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";

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

function detectRecoveryIntent() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get("type") === "recovery" ||
    searchParams.get("type") === "recovery"
  );
}

function getReadablePasswordError(message: string) {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("password should contain at least one character of each")
  ) {
    return "La contraseña debe incluir al menos una minúscula, una mayúscula, un número y un símbolo.";
  }

  if (normalized.includes("new password should be different")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }

  if (normalized.includes("same password")) {
    return "La nueva contraseña no puede ser igual a la anterior.";
  }

  if (normalized.includes("password is too short")) {
    return "La contraseña es demasiado corta.";
  }

  if (normalized.includes("weak password")) {
    return "La contraseña no cumple con el nivel mínimo de seguridad.";
  }

  return "No se pudo actualizar la contraseña. Revisa los requisitos e inténtalo nuevamente.";
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

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    let isMounted = true;

    const validateAccess = async () => {
      setCheckingSession(true);
      setErrorMsg("");
      setSuccessMsg("");

      try {
        const recoveryIntent = detectRecoveryIntent();

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw new Error(error.message);
        }

        if (!isMounted) return;

        setIsRecoveryFlow(recoveryIntent);

        if (!session) {
          setHasValidSession(false);
          setErrorMsg(
            recoveryIntent
              ? "El enlace de recuperación no es válido o ya expiró. Solicita uno nuevo."
              : "Debes iniciar sesión para actualizar tu contraseña."
          );
          return;
        }

        setHasValidSession(true);
      } catch (error) {
        console.error("UpdatePassword validateAccess error:", error);

        if (!isMounted) return;

        setHasValidSession(false);
        setErrorMsg("No se pudo validar el acceso para actualizar la contraseña.");
      } finally {
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    void validateAccess();

    return () => {
      isMounted = false;
    };
  }, []);

  const passwordValidation = useMemo(
    () => validatePassword(password),
    [password]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const isBusy = loading || redirecting;

  const handleUpdatePassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isBusy) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (!hasValidSession) {
      setErrorMsg("No tienes una sesión válida para actualizar tu contraseña.");
      return;
    }

    if (!passwordValidation.isValid) {
      setErrorMsg(
        "Tu contraseña debe tener al menos 8 caracteres, una minúscula, una mayúscula, un número y un símbolo."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setPassword("");
      setConfirmPassword("");
      setRedirecting(true);
      setSuccessMsg(
        "Contraseña actualizada con éxito. Te estamos llevando a tu dashboard..."
      );

      window.setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1800);
    } catch (error) {
      console.error("UpdatePassword handleUpdatePassword error:", error);

      if (error instanceof Error) {
        setErrorMsg(getReadablePasswordError(error.message));
      } else {
        setErrorMsg("Ocurrió un error inesperado al actualizar la contraseña.");
      }
    } finally {
      setLoading(false);
    }
  };

  const title = isRecoveryFlow ? "Crear nueva contraseña" : "Actualizar contraseña";

  const subtitle = isRecoveryFlow
    ? "Define una nueva contraseña para recuperar el acceso a tu cuenta."
    : "Cambia tu contraseña y mantén tu cuenta protegida.";

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:rounded-[32px] lg:p-10">
              <div className="mx-auto w-full max-w-[500px]">
                <div className="space-y-4">
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    Seguridad Mokko
                  </span>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold leading-tight tracking-[-0.01em] sm:text-3xl">
                      {title}
                    </h1>

                    <p className="text-sm leading-7 text-white/65">
                      {subtitle}
                    </p>
                  </div>
                </div>

                {checkingSession ? (
                  <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/70">
                    Validando acceso...
                  </div>
                ) : !hasValidSession ? (
                  <div className="mt-8 space-y-5">
                    {errorMsg && (
                      <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                        {errorMsg}
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/60">
                      Para actualizar tu contraseña necesitas iniciar sesión o
                      usar un enlace de recuperación válido.
                    </div>

                    <div className="grid gap-3">
                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="w-full rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55]"
                      >
                        Ir a iniciar sesión
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/login")}
                        className="w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5"
                      >
                        Solicitar nuevo enlace
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleUpdatePassword}
                    className="mt-7 space-y-5 sm:mt-8"
                  >
                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Nueva contraseña
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
                          placeholder="Ingresa tu nueva contraseña"
                          disabled={isBusy}
                          required
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

                    <div>
                      <label className="mb-2 block text-sm text-white/80">
                        Confirmar contraseña
                      </label>

                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 pr-24 text-base outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                          placeholder="Repite tu contraseña"
                          disabled={isBusy}
                          required
                          autoComplete="new-password"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          disabled={isBusy}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2 text-xs font-medium text-white/55 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {showConfirmPassword ? "Ocultar" : "Mostrar"}
                        </button>
                      </div>

                      {confirmPassword.length > 0 && (
                        <p
                          className={`mt-3 text-xs ${
                            passwordsMatch ? "text-green-300" : "text-red-300"
                          }`}
                        >
                          {passwordsMatch
                            ? "Las contraseñas coinciden"
                            : "Las contraseñas no coinciden"}
                        </p>
                      )}
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
                      {redirecting
                        ? "Redirigiendo..."
                        : loading
                          ? "Actualizando..."
                          : "Actualizar contraseña"}
                    </button>

                    <p className="text-center text-xs leading-5 text-white/40">
                      Usa al menos 8 caracteres, una minúscula, una mayúscula,
                      un número y un símbolo.
                    </p>
                  </form>
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
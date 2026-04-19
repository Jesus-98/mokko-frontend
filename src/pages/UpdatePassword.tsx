import { useEffect, useMemo, useState } from "react";
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

function detectRecoveryIntent() {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get("type") === "recovery" ||
    searchParams.get("type") === "recovery"
  );
}

export default function UpdatePassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading || redirecting) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (!hasValidSession) {
      setErrorMsg("No tienes una sesión válida para actualizar tu contraseña.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("La contraseña debe tener al menos 8 caracteres.");
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
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado al actualizar la contraseña."
      );
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

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-md rounded-[28px] border border-white/10 bg-[#141410]/80 p-6 shadow-2xl backdrop-blur-md sm:p-7">
              <div className="text-center">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-2 text-sm text-white/60">{subtitle}</p>
              </div>

              {checkingSession ? (
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
                  Validando acceso...
                </div>
              ) : !hasValidSession ? (
                <div className="mt-8 space-y-4">
                  {errorMsg && (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:bg-[#f0cf55]"
                    >
                      Ir a iniciar sesión
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                    >
                      Solicitar nuevo enlace
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="mt-6 space-y-5">
                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Nueva contraseña
                    </label>

                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 focus:bg-white/10"
                      placeholder="Ingresa tu nueva contraseña"
                      disabled={loading || redirecting}
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
                            <span className={`font-medium ${passwordStrength.textColor}`}>
                              {passwordStrength.label}
                            </span>
                          </div>

                          <p className={`text-xs leading-5 ${passwordStrength.textColor}`}>
                            {passwordStrength.helper}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Confirmar contraseña
                    </label>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 focus:bg-white/10"
                      placeholder="Repite tu contraseña"
                      disabled={loading || redirecting}
                    />

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
                    disabled={loading || redirecting}
                    className="w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {redirecting
                      ? "Redirigiendo..."
                      : loading
                      ? "Actualizando..."
                      : "Actualizar contraseña"}
                  </button>

                  <p className="text-center text-xs text-white/40">
                    Usa al menos 8 caracteres para mayor seguridad.
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
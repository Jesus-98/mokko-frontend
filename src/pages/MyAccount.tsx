import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import CustomSelect, {
  type CustomSelectOption,
} from "../components/ui/CustomSelect";
import { FieldLabel, TextInput } from "../components/ui/Field";

type CountryRow = {
  id: string;
  iso2: string;
  name: string;
  phone_code: string | null;
};

type GeoDivisionRow = {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  country_id: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  country_id: string | null;
  division_level_1_id: string | null;
  division_level_2_id: string | null;
  division_level_3_id: string | null;
  address_line: string | null;
  must_change_password: boolean;
};

const PHONE_RULES_BY_ISO2: Record<
  string,
  {
    placeholder: string;
    minDigits: number;
    maxDigits: number;
  }
> = {
  PE: { placeholder: "999999999", minDigits: 9, maxDigits: 9 },
  MX: { placeholder: "5512345678", minDigits: 10, maxDigits: 10 },
  CO: { placeholder: "3001234567", minDigits: 10, maxDigits: 10 },
  CL: { placeholder: "912345678", minDigits: 9, maxDigits: 9 },
  EC: { placeholder: "991234567", minDigits: 9, maxDigits: 10 },
  US: { placeholder: "5551234567", minDigits: 10, maxDigits: 10 },
  AR: { placeholder: "1123456789", minDigits: 10, maxDigits: 10 },
  BO: { placeholder: "71234567", minDigits: 8, maxDigits: 8 },
  ES: { placeholder: "612345678", minDigits: 9, maxDigits: 9 },
};

const DEFAULT_PHONE_RULE = {
  placeholder: "999999999",
  minDigits: 6,
  maxDigits: 15,
};

function getCountryDialCode(countryId: string, countries: CountryRow[]) {
  const country = countries.find((item) => item.id === countryId);
  return (country?.phone_code || "").replace(/\D/g, "");
}

function stripCountryCodeFromStoredPhone(
  value: string | null | undefined,
  countryDialCode: string
) {
  if (!value) return "";

  const digits = value.replace(/\D/g, "");
  const cleanCode = countryDialCode.replace(/\D/g, "");

  if (!digits) return "";
  if (!cleanCode) return digits;

  if (digits.startsWith(cleanCode)) {
    return digits.slice(cleanCode.length);
  }

  return digits;
}

function normalizePhoneForStorage(
  value: string | null | undefined,
  countryDialCode: string
) {
  const digits = (value || "").replace(/\D/g, "");
  const cleanCode = countryDialCode.replace(/\D/g, "");

  if (!digits) return null;
  if (!cleanCode) return digits;

  const localDigits = digits.startsWith(cleanCode)
    ? digits.slice(cleanCode.length)
    : digits;

  if (!localDigits) return null;

  return `+${cleanCode}${localDigits}`;
}

function sanitizeLocalPhoneInput(value: string) {
  return value.replace(/\D/g, "");
}

export default function MyAccount() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileId, setProfileId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");

  const [countryId, setCountryId] = useState("");
  const [divisionLevel1Id, setDivisionLevel1Id] = useState("");
  const [divisionLevel2Id, setDivisionLevel2Id] = useState("");
  const [divisionLevel3Id, setDivisionLevel3Id] = useState("");

  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [level1Options, setLevel1Options] = useState<GeoDivisionRow[]>([]);
  const [level2Options, setLevel2Options] = useState<GeoDivisionRow[]>([]);
  const [level3Options, setLevel3Options] = useState<GeoDivisionRow[]>([]);

  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const peruCountryId = useMemo(() => {
    return countries.find((country) => country.iso2 === "PE")?.id ?? "";
  }, [countries]);

  const selectedCountry = useMemo(() => {
    return countries.find((country) => country.id === countryId) ?? null;
  }, [countries, countryId]);

  const selectedCountryDialCode = useMemo(() => {
    return getCountryDialCode(countryId, countries);
  }, [countryId, countries]);

  const phoneRule = useMemo(() => {
    const iso2 = selectedCountry?.iso2?.toUpperCase() || "PE";
    return PHONE_RULES_BY_ISO2[iso2] || DEFAULT_PHONE_RULE;
  }, [selectedCountry]);

  const countrySelectOptions = useMemo<CustomSelectOption[]>(() => {
    return countries.map((country) => ({
      value: country.id,
      label: country.name,
    }));
  }, [countries]);

  const level1SelectOptions = useMemo<CustomSelectOption[]>(() => {
    return level1Options.map((division) => ({
      value: division.id,
      label: division.name,
    }));
  }, [level1Options]);

  const level2SelectOptions = useMemo<CustomSelectOption[]>(() => {
    return level2Options.map((division) => ({
      value: division.id,
      label: division.name,
    }));
  }, [level2Options]);

  const level3SelectOptions = useMemo<CustomSelectOption[]>(() => {
    return level3Options.map((division) => ({
      value: division.id,
      label: division.name,
    }));
  }, [level3Options]);

  const displayEmail = useMemo(() => {
    return (
      email.trim() ||
      user?.email ||
      profile?.email ||
      "Sin correo registrado"
    );
  }, [email, user?.email, profile?.email]);

  const displayName = fullName.trim() || profile?.full_name || "Usuario Mokko";

  const showLoading = authLoading || loading;

  const dialCodeLabel = selectedCountryDialCode
    ? `+${selectedCountryDialCode}`
    : "Sin prefijo";

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;

    let isMounted = true;

    const loadInitialData = async () => {
      setLoading(true);
      setErrorMsg("");
      setWarningMsg("");
      setSuccessMsg("");

      try {
        const [countriesRes, profileRes] = await Promise.all([
          supabase
            .from("v_countries_active")
            .select("id, iso2, name, phone_code")
            .order("name", { ascending: true }),

          supabase
            .from("profiles")
            .select(`
              id,
              full_name,
              email,
              phone,
              whatsapp_phone,
              country_id,
              division_level_1_id,
              division_level_2_id,
              division_level_3_id,
              address_line,
              must_change_password
            `)
            .eq("id", user.id)
            .maybeSingle(),
        ]);

        if (countriesRes.error) {
          throw new Error(
            `No se pudieron cargar los países: ${countriesRes.error.message}`
          );
        }

        if (profileRes.error) {
          throw new Error(
            `No se pudo cargar tu perfil: ${profileRes.error.message}`
          );
        }

        if (!isMounted) return;

        const countriesData = (countriesRes.data ?? []) as CountryRow[];
        setCountries(countriesData);

        const peruId =
          countriesData.find((country) => country.iso2 === "PE")?.id ?? "";

        const accountProfile = (profileRes.data as ProfileRow | null) ?? null;

        if (!accountProfile) {
          setProfileId(user.id);
          setFullName(profile?.full_name || "");
          setEmail(user.email || "");
          setPhone("");
          setWhatsappPhone("");
          setAddressLine("");
          setCountryId(peruId);
          setDivisionLevel1Id("");
          setDivisionLevel2Id("");
          setDivisionLevel3Id("");
          return;
        }

        const initialCountryId = accountProfile.country_id || peruId;
        const initialDialCode = getCountryDialCode(
          initialCountryId,
          countriesData
        );

        setProfileId(accountProfile.id);
        setFullName(accountProfile.full_name || "");
        setEmail(accountProfile.email || user.email || "");
        setPhone(
          stripCountryCodeFromStoredPhone(accountProfile.phone, initialDialCode)
        );
        setWhatsappPhone(
          stripCountryCodeFromStoredPhone(
            accountProfile.whatsapp_phone,
            initialDialCode
          )
        );
        setAddressLine(accountProfile.address_line || "");
        setCountryId(initialCountryId);
        setDivisionLevel1Id(accountProfile.division_level_1_id || "");
        setDivisionLevel2Id(accountProfile.division_level_2_id || "");
        setDivisionLevel3Id(accountProfile.division_level_3_id || "");

        if (accountProfile.must_change_password) {
          setWarningMsg(
            "Tu cuenta tiene marcado cambio obligatorio de contraseña. Te conviene actualizarla ahora."
          );
        }
      } catch (error) {
        console.error("Error cargando MyAccount:", error);

        if (!isMounted) return;

        setErrorMsg(
          error instanceof Error
            ? error.message
            : "Ocurrió un error cargando tu cuenta."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id, user?.email, profile?.full_name, profile?.email]);

  useEffect(() => {
    if (!countryId && peruCountryId) {
      setCountryId(peruCountryId);
    }
  }, [countryId, peruCountryId]);

  useEffect(() => {
    if (!countryId) {
      setLevel1Options([]);
      setDivisionLevel1Id("");
      setLevel2Options([]);
      setDivisionLevel2Id("");
      setLevel3Options([]);
      setDivisionLevel3Id("");
      return;
    }

    let isMounted = true;

    const loadLevel1 = async () => {
      try {
        const { data, error } = await supabase
          .from("geo_divisions")
          .select("id, name, level, parent_id, country_id")
          .eq("country_id", countryId)
          .eq("level", 1)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!isMounted) return;

        setLevel1Options((data ?? []) as GeoDivisionRow[]);
      } catch (error) {
        console.error("Error cargando departamentos:", error);

        if (!isMounted) return;
        setLevel1Options([]);
      }
    };

    void loadLevel1();

    return () => {
      isMounted = false;
    };
  }, [countryId]);

  useEffect(() => {
    if (!countryId || !divisionLevel1Id) {
      setLevel2Options([]);
      setDivisionLevel2Id("");
      setLevel3Options([]);
      setDivisionLevel3Id("");
      return;
    }

    let isMounted = true;

    const loadLevel2 = async () => {
      try {
        const { data, error } = await supabase
          .from("geo_divisions")
          .select("id, name, level, parent_id, country_id")
          .eq("country_id", countryId)
          .eq("parent_id", divisionLevel1Id)
          .eq("level", 2)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!isMounted) return;

        setLevel2Options((data ?? []) as GeoDivisionRow[]);
      } catch (error) {
        console.error("Error cargando provincias:", error);

        if (!isMounted) return;
        setLevel2Options([]);
      }
    };

    void loadLevel2();

    return () => {
      isMounted = false;
    };
  }, [countryId, divisionLevel1Id]);

  useEffect(() => {
    if (!countryId || !divisionLevel2Id) {
      setLevel3Options([]);
      setDivisionLevel3Id("");
      return;
    }

    let isMounted = true;

    const loadLevel3 = async () => {
      try {
        const { data, error } = await supabase
          .from("geo_divisions")
          .select("id, name, level, parent_id, country_id")
          .eq("country_id", countryId)
          .eq("parent_id", divisionLevel2Id)
          .eq("level", 3)
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!isMounted) return;

        setLevel3Options((data ?? []) as GeoDivisionRow[]);
      } catch (error) {
        console.error("Error cargando distritos:", error);

        if (!isMounted) return;
        setLevel3Options([]);
      }
    };

    void loadLevel3();

    return () => {
      isMounted = false;
    };
  }, [countryId, divisionLevel2Id]);

  const handleCountryChange = (value: string) => {
    setCountryId(value);
    setDivisionLevel1Id("");
    setDivisionLevel2Id("");
    setDivisionLevel3Id("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleLevel1Change = (value: string) => {
    setDivisionLevel1Id(value);
    setDivisionLevel2Id("");
    setDivisionLevel3Id("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleLevel2Change = (value: string) => {
    setDivisionLevel2Id(value);
    setDivisionLevel3Id("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const validateLocalPhone = (value: string, fieldName: string) => {
    if (!value.trim()) return true;

    const digits = value.replace(/\D/g, "");

    if (
      digits.length < phoneRule.minDigits ||
      digits.length > phoneRule.maxDigits
    ) {
      if (phoneRule.minDigits === phoneRule.maxDigits) {
        setErrorMsg(
          `${fieldName} debe tener ${phoneRule.minDigits} dígitos para el país seleccionado.`
        );
      } else {
        setErrorMsg(
          `${fieldName} debe tener entre ${phoneRule.minDigits} y ${phoneRule.maxDigits} dígitos para el país seleccionado.`
        );
      }

      return false;
    }

    return true;
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user?.id || !profileId) {
      setErrorMsg("No se pudo identificar tu perfil.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMsg("Ingresa tu nombre completo.");
      return;
    }

    if (!validateLocalPhone(phone, "Teléfono")) return;
    if (!validateLocalPhone(whatsappPhone, "WhatsApp")) return;

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: profileId,
        full_name: fullName.trim() || null,
        phone: normalizePhoneForStorage(phone, selectedCountryDialCode),
        whatsapp_phone: normalizePhoneForStorage(
          whatsappPhone,
          selectedCountryDialCode
        ),
        country_id: countryId || null,
        division_level_1_id: divisionLevel1Id || null,
        division_level_2_id: divisionLevel2Id || null,
        division_level_3_id: divisionLevel3Id || null,
        address_line: addressLine.trim() || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      await refreshProfile();
      setSuccessMsg("Tus datos fueron actualizados correctamente.");
    } catch (error) {
      console.error("Error guardando MyAccount:", error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:gap-8">
              <div className="order-2 rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 sm:p-8 lg:order-1 lg:rounded-[32px]">
                <div className="space-y-5">
                  <span className="mokko-badge mokko-badge-primary w-fit">
                    Mi cuenta
                  </span>

                  <div className="space-y-4">
                    <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                      Gestiona tus{" "}
                      <span className="text-[#E8C547]">datos</span>
                    </h1>

                    <p className="max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                      Mantén actualizada tu información para que tus placas Mokko
                      y el perfil de tus mascotas funcionen correctamente.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                      Usuario
                    </div>
                    <div className="mt-2 text-base font-semibold">
                      {displayName}
                    </div>
                    <div className="mt-1 break-all text-sm text-white/60">
                      {displayEmail}
                    </div>
                  </div>

                  <InfoCard
                    title="¿Por qué es importante?"
                    description="Tus datos ayudan a que puedan contactarte más rápido si encuentran a tu mascota."
                  />

                  <InfoCard
                    title="Información editable"
                    description="Puedes actualizar tu nombre, teléfono, WhatsApp, ubicación y dirección cuando quieras."
                  />

                  <button
                    type="button"
                    onClick={() => navigate("/update-password")}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10"
                  >
                    <div className="text-sm font-medium text-white">
                      Cambiar contraseña
                    </div>
                    <div className="mt-2 text-sm leading-7 text-white/65">
                      Actualiza tu contraseña para mantener tu cuenta protegida.
                    </div>
                  </button>
                </div>
              </div>

              <div className="order-1 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm sm:p-8 lg:order-2 lg:rounded-[32px] lg:p-10">
                <div className="mx-auto w-full max-w-[620px]">
                  <div className="space-y-4">
                    <span className="mokko-badge mokko-badge-primary w-fit lg:hidden">
                      Mi cuenta
                    </span>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold leading-tight tracking-[-0.01em] sm:text-3xl">
                        Datos de tu cuenta
                      </h2>

                      <p className="text-sm leading-7 text-white/65">
                        Aquí puedes editar la información principal de tu perfil.
                      </p>
                    </div>
                  </div>

                  {showLoading ? (
                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-6 text-white/70">
                      Cargando datos...
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSave}
                      className="mt-7 space-y-5 sm:mt-8"
                    >
                      <div>
                        <FieldLabel>Nombre completo</FieldLabel>
                        <TextInput
                          type="text"
                          value={fullName}
                          onChange={(e) => {
                            setFullName(e.target.value);
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          placeholder="Tu nombre completo"
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                          <FieldLabel>Correo de acceso</FieldLabel>

                          <span className="rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f6df8a] sm:text-[11px]">
                            Vinculado
                          </span>
                        </div>

                        <div className="rounded-2xl border border-[#E8C547]/18 bg-[#E8C547]/[0.06] px-4 py-4">
                          <div className="break-all text-base font-medium text-[#F5F0E8]">
                            {displayEmail}
                          </div>
                        </div>

                        <p className="mt-2 text-xs leading-6 text-white/45">
                          Este correo está vinculado al acceso de tu cuenta y
                          por ahora no se puede cambiar desde esta sección.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <PhoneField
                          label="Teléfono"
                          value={phone}
                          onChange={(value) => {
                            setPhone(sanitizeLocalPhoneInput(value));
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          placeholder={phoneRule.placeholder}
                          maxLength={phoneRule.maxDigits}
                          dialCodeLabel={dialCodeLabel}
                        />

                        <PhoneField
                          label="WhatsApp"
                          value={whatsappPhone}
                          onChange={(value) => {
                            setWhatsappPhone(sanitizeLocalPhoneInput(value));
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          placeholder={phoneRule.placeholder}
                          maxLength={phoneRule.maxDigits}
                          dialCodeLabel={dialCodeLabel}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>País</FieldLabel>
                          <CustomSelect
                            value={countryId}
                            onChange={handleCountryChange}
                            options={countrySelectOptions}
                            placeholder="Selecciona un país"
                          />
                        </div>

                        <div>
                          <FieldLabel>Departamento</FieldLabel>
                          <CustomSelect
                            value={divisionLevel1Id}
                            onChange={handleLevel1Change}
                            options={level1SelectOptions}
                            placeholder="Selecciona un departamento"
                            disabled={!countryId}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Provincia</FieldLabel>
                          <CustomSelect
                            value={divisionLevel2Id}
                            onChange={handleLevel2Change}
                            options={level2SelectOptions}
                            placeholder="Selecciona una provincia"
                            disabled={!divisionLevel1Id}
                          />
                        </div>

                        <div>
                          <FieldLabel>Distrito</FieldLabel>
                          <CustomSelect
                            value={divisionLevel3Id}
                            onChange={(value) => {
                              setDivisionLevel3Id(value);
                              setErrorMsg("");
                              setSuccessMsg("");
                            }}
                            options={level3SelectOptions}
                            placeholder="Selecciona un distrito"
                            disabled={!divisionLevel2Id}
                          />
                        </div>
                      </div>

                      <div>
                        <FieldLabel>Dirección</FieldLabel>
                        <TextInput
                          type="text"
                          value={addressLine}
                          onChange={(e) => {
                            setAddressLine(e.target.value);
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          placeholder="Av., calle, referencia u otra información útil"
                        />
                        <p className="mt-2 text-xs leading-6 text-white/45">
                          Este dato puede ayudarte a organizar tus pedidos o
                          referencias internas. Evita colocar información que no
                          quieras compartir.
                        </p>
                      </div>

                      {warningMsg && !errorMsg && (
                        <div className="rounded-2xl border border-[#E8C547]/20 bg-[#E8C547]/10 px-4 py-3 text-sm leading-6 text-[#f6df8a]">
                          {warningMsg}
                        </div>
                      )}

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
                        disabled={saving}
                        className="w-full rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70 sm:py-3.5"
                      >
                        {saving ? "Guardando cambios..." : "Guardar cambios"}
                      </button>
                    </form>
                  )}
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

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-white/65">
        {description}
      </div>
    </div>
  );
}

function PhoneField({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  dialCodeLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength: number;
  dialCodeLabel: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>

      <div className="flex rounded-2xl border border-white/10 bg-white/5 focus-within:border-[#E8C547]/60">
        <div className="flex min-w-[76px] items-center justify-center border-r border-white/10 px-3 text-sm font-medium text-white/65">
          {dialCodeLabel}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          inputMode="numeric"
          maxLength={maxLength}
          className="min-w-0 flex-1 rounded-r-2xl bg-transparent px-4 py-4 text-base text-white outline-none transition placeholder:text-white/30 sm:py-3.5"
        />
      </div>

      <p className="mt-2 text-xs leading-6 text-white/45">
        Ingresa solo el número local, sin prefijo.
      </p>
    </div>
  );
}
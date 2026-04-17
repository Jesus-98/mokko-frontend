import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type PlatePlanType = "essential" | "custom";
type PlateColor = "white" | "black" | "green";
type PlateShape = "circle" | "bone";
type PlateSize = "S" | "M" | "L";

type OrderPlateItem = {
  id: string;
  planType: PlatePlanType;
  petName: string;
  color: PlateColor;
  shape: PlateShape;
  size: PlateSize;
  unitPrice: number;
};

type RpcOrderResult = {
  order_id: string;
  order_number: string;
  subtotal: number;
  total: number;
};

const SUPPORT_WHATSAPP = "51944606429";

const PLAN_PRICES: Record<PlatePlanType, number> = {
  essential: 29,
  custom: 39,
};

const COLOR_OPTIONS: { value: PlateColor; label: string; swatch: string }[] = [
  { value: "white", label: "Blanco", swatch: "bg-white" },
  { value: "black", label: "Negro", swatch: "bg-black" },
  { value: "green", label: "Verde", swatch: "bg-[#2D5A27]" },
];

const SHAPE_OPTIONS: { value: PlateShape; label: string }[] = [
  { value: "circle", label: "Circular" },
  { value: "bone", label: "Huesito" },
];

const SIZE_OPTIONS_BY_SHAPE: Record<
  PlateShape,
  { value: PlateSize; label: string; detail: string }[]
> = {
  circle: [
    { value: "S", label: "S", detail: "3.2 cm diámetro" },
    { value: "M", label: "M", detail: "3.8 cm diámetro" },
    { value: "L", label: "L", detail: "4.5 cm diámetro" },
  ],
  bone: [
    { value: "S", label: "S", detail: "4.0 x 2.2 cm" },
    { value: "M", label: "M", detail: "4.8 x 2.6 cm" },
    { value: "L", label: "L", detail: "5.6 x 3.0 cm" },
  ],
};

function createPlateItem(planType: PlatePlanType): OrderPlateItem {
  if (planType === "essential") {
    return {
      id: crypto.randomUUID(),
      planType: "essential",
      petName: "",
      color: "white",
      shape: "circle",
      size: "S",
      unitPrice: PLAN_PRICES.essential,
    };
  }

  return {
    id: crypto.randomUUID(),
    planType: "custom",
    petName: "",
    color: "white",
    shape: "circle",
    size: "S",
    unitPrice: PLAN_PRICES.custom,
  };
}

function obtenerLabelColor(color: PlateColor) {
  return COLOR_OPTIONS.find((option) => option.value === color)?.label ?? color;
}

function obtenerLabelForma(shape: PlateShape) {
  return SHAPE_OPTIONS.find((option) => option.value === shape)?.label ?? shape;
}

function obtenerDetalleTamano(item: OrderPlateItem) {
  if (item.planType === "essential") {
    return "3 cm diámetro";
  }

  return (
    SIZE_OPTIONS_BY_SHAPE[item.shape].find((option) => option.value === item.size)
      ?.detail ?? item.size
  );
}

function esCorreoValido(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Order() {
  const location = useLocation();
  const { user, profile } = useAuth();

  const [items, setItems] = useState<OrderPlateItem[]>([]);
  const [guestName, setGuestName] = useState(profile?.full_name || "");
  const [guestEmail, setGuestEmail] = useState(profile?.email || user?.email || "");
  const [guestPhone, setGuestPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const initializedRef = useRef(false);
  const lastProcessedAddRef = useRef<string | null>(null);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  useEffect(() => {
    if (profile?.full_name && !guestName) {
      setGuestName(profile.full_name);
    }

    const nextEmail = profile?.email || user?.email || "";
    if (nextEmail && !guestEmail) {
      setGuestEmail(nextEmail);
    }
  }, [profile, user, guestName, guestEmail]);

  useEffect(() => {
    const add = searchParams.get("add");

    if (!initializedRef.current) {
      if (add === "essential" || add === "custom") {
        setItems([createPlateItem(add)]);
        lastProcessedAddRef.current = add;
      } else {
        setItems([createPlateItem("essential")]);
        lastProcessedAddRef.current = null;
      }

      initializedRef.current = true;
      return;
    }

    if (
      add &&
      (add === "essential" || add === "custom") &&
      add !== lastProcessedAddRef.current
    ) {
      setItems((prev) => [...prev, createPlateItem(add)]);
      lastProcessedAddRef.current = add;
    }
  }, [searchParams]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice, 0),
    [items]
  );

  const canSubmit = useMemo(() => {
    if (items.length === 0) return false;

    for (const item of items) {
      if (item.planType === "custom" && !item.petName.trim()) {
        return false;
      }
    }

    if (!esCorreoValido(guestEmail)) {
      return false;
    }

    if (!user) {
      return !!guestName.trim() && !!guestPhone.trim();
    }

    return !!guestPhone.trim() || !!guestEmail.trim() || !!guestName.trim();
  }, [items, user, guestName, guestPhone, guestEmail]);

  const addItem = (planType: PlatePlanType) => {
    setItems((prev) => [...prev, createPlateItem(planType)]);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const removeItem = (id: string) => {
    const confirmed = window.confirm("¿Quieres eliminar esta placa del pedido?");
    if (!confirmed) return;

    setItems((prev) => prev.filter((item) => item.id !== id));
    setErrorMsg("");
    setSuccessMsg("");
  };

  const updateItem = <K extends keyof OrderPlateItem>(
    id: string,
    key: K,
    value: OrderPlateItem[K]
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const next = { ...item, [key]: value };

        if (key === "planType") {
          next.unitPrice = PLAN_PRICES[value as PlatePlanType];

          if (value === "essential") {
            next.petName = "";
            next.shape = "circle";
            next.size = "S";
          }
        }

        if (key === "shape") {
          next.size = "S";
        }

        return next;
      })
    );

    setErrorMsg("");
    setSuccessMsg("");
  };

  const buildWhatsappMessage = (orderNumber: string) => {
    const lines: string[] = [];

    lines.push("Hola, quiero realizar este pedido Mokko:");
    lines.push("");
    lines.push(`Pedido: ${orderNumber}`);
    lines.push("");

    items.forEach((item, index) => {
      const colorLabel = obtenerLabelColor(item.color);
      const shapeLabel =
        item.planType === "essential" ? "Circular" : obtenerLabelForma(item.shape);
      const sizeLabel = obtenerDetalleTamano(item);

      lines.push(`Placa ${index + 1}`);
      lines.push(`Tipo: ${item.planType === "essential" ? "Essential" : "Custom"}`);

      if (item.planType === "custom") {
        lines.push(`Nombre: ${item.petName.trim()}`);
      }

      lines.push(`Color: ${colorLabel}`);
      lines.push(`Forma: ${shapeLabel}`);
      lines.push(`Tamaño: ${sizeLabel}`);
      lines.push(`Precio: S/ ${item.unitPrice.toFixed(2)}`);
      lines.push("");
    });

    lines.push(`Total: S/ ${subtotal.toFixed(2)}`);

    if (guestName.trim()) {
      lines.push("");
      lines.push(`Cliente: ${guestName.trim()}`);
    }

    if (guestPhone.trim()) {
      lines.push(`Teléfono: ${guestPhone.trim()}`);
    }

    if (guestEmail.trim()) {
      lines.push(`Correo: ${guestEmail.trim()}`);
    }

    return lines.join("\n");
  };

  const handleCreateOrder = async () => {
    if (loading) return;

    setErrorMsg("");
    setSuccessMsg("");

    if (items.length === 0) {
      setErrorMsg("Agrega al menos una placa al pedido.");
      return;
    }

    for (const item of items) {
      if (item.planType === "custom" && !item.petName.trim()) {
        setErrorMsg("Completa el nombre de la mascota en todas las placas Custom.");
        return;
      }
    }

    if (!esCorreoValido(guestEmail)) {
      setErrorMsg("Ingresa un correo válido o déjalo vacío.");
      return;
    }

    if (!user && (!guestName.trim() || !guestPhone.trim())) {
      setErrorMsg("Ingresa al menos nombre y teléfono para continuar.");
      return;
    }

    setLoading(true);

    try {
      const payload = items.map((item) => {
        const colorLabel = obtenerLabelColor(item.color);
        const shapeLabel =
          item.planType === "essential"
            ? "Circular"
            : obtenerLabelForma(item.shape);
        const sizeLabel = obtenerDetalleTamano(item);

        return {
          sold_plan_type: item.planType,
          quantity: 1,
          customization_data: {
            color: item.color,
            color_label: colorLabel,
            shape: item.planType === "essential" ? "circle" : item.shape,
            shape_label: shapeLabel,
            size_code: item.planType === "essential" ? "S" : item.size,
            size_label: sizeLabel,
            pet_name: item.planType === "custom" ? item.petName.trim() : null,
          },
        };
      });

      const { data, error } = await supabase.rpc("create_order_with_items", {
        p_guest_name: guestName.trim() || null,
        p_guest_email: guestEmail.trim() || null,
        p_guest_phone: guestPhone.trim() || null,
        p_items: payload,
      });

      if (error) {
        throw new Error(error.message || "No se pudo generar el pedido.");
      }

      const result = data as RpcOrderResult | null;

      if (!result?.order_id || !result?.order_number) {
        throw new Error("No se recibió una respuesta válida al crear el pedido.");
      }

      setCreatedOrderId(result.order_id);
      setCreatedOrderNumber(result.order_number);
      setSuccessMsg("Pedido generado correctamente.");

      const whatsappMessage = buildWhatsappMessage(result.order_number);
      const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error al crear el pedido:", error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : "No se pudo generar el pedido."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#1A1A14] text-white">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(232,197,71,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,90,39,0.18),transparent_34%)]" />

          <div className="mokko-container relative z-10 py-10 md:py-14">
            <div className="mx-auto max-w-6xl">
              <span className="mokko-badge mokko-badge-primary w-fit">
                Pedido Mokko
              </span>

              <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                    Configura tus <span className="text-[#E8C547]">placas</span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                    Puedes combinar placas Essential y Custom en un solo pedido y
                    cerrarlo por WhatsApp con tu número de orden.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => addItem("essential")}
                    className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
                  >
                    + Añadir otra placa
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="mx-auto mt-8 max-w-6xl rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm text-green-200">
                {successMsg}
                {createdOrderNumber ? ` Número de orden: ${createdOrderNumber}` : ""}
              </div>
            )}

            <div className="mx-auto mt-8 grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="grid gap-4">
                {items.map((item, index) => {
                  const sizeOptions = SIZE_OPTIONS_BY_SHAPE[item.shape];

                  return (
                    <div
                      key={item.id}
                      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm uppercase tracking-[0.14em] text-white/45">
                            Placa {index + 1}
                          </div>
                          <h2 className="mt-2 text-2xl font-semibold">
                            {item.planType === "essential" ? "Essential" : "Custom"}
                          </h2>
                        </div>

                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded-2xl border border-red-400/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-400/10"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      <div className="mt-5 grid gap-4">
                        <div>
                          <label className="mb-2 block text-sm text-white/80">
                            Tipo de placa
                          </label>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, "planType", "essential")}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                item.planType === "essential"
                                  ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                                  : "border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="font-semibold">Essential</div>
                              <div className="mt-1 text-sm text-white/60">
                                Circular, simple, lista para usar.
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => updateItem(item.id, "planType", "custom")}
                              className={`rounded-2xl border px-4 py-3 text-left transition ${
                                item.planType === "custom"
                                  ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                                  : "border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              <div className="font-semibold">Custom</div>
                              <div className="mt-1 text-sm text-white/60">
                                Nombre, color, forma y tamaño.
                              </div>
                            </button>
                          </div>
                        </div>

                        {item.planType === "custom" && (
                          <div>
                            <label className="mb-2 block text-sm text-white/80">
                              Nombre de la mascota
                            </label>
                            <input
                              type="text"
                              value={item.petName}
                              onChange={(e) =>
                                updateItem(item.id, "petName", e.target.value)
                              }
                              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                              placeholder="Ej. Max"
                            />
                          </div>
                        )}

                        <div>
                          <label className="mb-2 block text-sm text-white/80">
                            Color
                          </label>

                          <div className="grid gap-3 sm:grid-cols-3">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => updateItem(item.id, "color", color.value)}
                                className={`rounded-2xl border px-4 py-3 transition ${
                                  item.color === color.value
                                    ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                                    : "border-white/10 bg-white/5 hover:bg-white/10"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`h-4 w-4 rounded-full border border-white/20 ${color.swatch}`}
                                  />
                                  <span className="text-sm font-medium">
                                    {color.label}
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>

                          <p className="mt-2 text-xs text-white/45">
                            El logo Mokko va siempre en amarillo.
                          </p>
                        </div>

                        {item.planType === "essential" ? (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                            Essential usa formato fijo:
                            <span className="ml-1 font-medium text-white">
                              circular · 3 cm de diámetro · color a elección
                            </span>
                          </div>
                        ) : (
                          <>
                            <div>
                              <label className="mb-2 block text-sm text-white/80">
                                Forma
                              </label>

                              <div className="grid gap-3 sm:grid-cols-2">
                                {SHAPE_OPTIONS.map((shape) => (
                                  <button
                                    key={shape.value}
                                    type="button"
                                    onClick={() =>
                                      updateItem(item.id, "shape", shape.value)
                                    }
                                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                                      item.shape === shape.value
                                        ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                    }`}
                                  >
                                    {shape.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm text-white/80">
                                Tamaño
                              </label>

                              <div className="grid gap-3 sm:grid-cols-3">
                                {sizeOptions.map((size) => (
                                  <button
                                    key={size.value}
                                    type="button"
                                    onClick={() =>
                                      updateItem(item.id, "size", size.value)
                                    }
                                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                                      item.size === size.value
                                        ? "border-[#E8C547]/60 bg-[#E8C547]/10"
                                        : "border-white/10 bg-white/5 hover:bg-white/10"
                                    }`}
                                  >
                                    <div className="font-semibold">{size.label}</div>
                                    <div className="mt-1 text-xs text-white/50">
                                      {size.detail}
                                    </div>
                                  </button>
                                ))}
                              </div>

                              <p className="mt-2 text-xs text-white/45">
                                Los tamaños mínimos ya consideran el espacio físico del chip NFC.
                              </p>
                            </div>
                          </>
                        )}

                        <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                          <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                            Precio de esta placa
                          </div>
                          <div className="mt-2 text-xl font-semibold text-[#E8C547]">
                            S/ {item.unitPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="h-fit rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
                <h2 className="text-2xl font-semibold">Resumen del pedido</h2>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                      Total de placas
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{items.length}</div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                      Subtotal
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[#E8C547]">
                      S/ {subtotal.toFixed(2)}
                    </div>
                  </div>

                  {createdOrderNumber && (
                    <div className="rounded-2xl border border-white/10 bg-[#141410] p-4">
                      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                        Número de orden
                      </div>
                      <div className="mt-2 text-base font-semibold">
                        {createdOrderNumber}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Datos de contacto</h3>

                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Correo
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      disabled={!!user}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60 disabled:opacity-70"
                      placeholder="tucorreo@ejemplo.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/80">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition placeholder:text-white/30 focus:border-[#E8C547]/60"
                      placeholder="+51 999 999 999"
                    />
                  </div>
                </div>

                {!user && (
                  <p className="mt-4 text-xs leading-6 text-white/45">
                    Puedes continuar como invitado, pero si quieres luego gestionar tus
                    placas más fácil, te conviene{" "}
                    <Link to="/register?next=/pedido" className="text-[#E8C547]">
                      crear una cuenta
                    </Link>
                    .
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={!canSubmit || loading}
                  className="mt-6 w-full rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Generando pedido..." : "Continuar por WhatsApp"}
                </button>

                {createdOrderId && (
                  <p className="mt-3 text-center text-xs text-white/40">
                    Pedido guardado correctamente antes de abrir WhatsApp.
                  </p>
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
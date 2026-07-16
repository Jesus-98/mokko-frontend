import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Palette,
  Phone,
  Plus,
  ReceiptText,
  Ruler,
  Shapes,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { buildWhatsAppUrl } from "../config/contact";
import { FieldLabel, TextInput } from "../components/ui/Field";
import {
  formatPrice,
  getCurrentPlanPrice,
  type PricingCatalog,
  type PurchasablePlanType,
} from "../config/pricing";
import { usePricingCatalog } from "../hooks/usePricing";

type PlatePlanType = PurchasablePlanType;
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

type RpcOrderItemResult = {
  sold_plan_type: PlatePlanType;
  quantity: number;
  unit_price: number;
  subtotal: number;
};

type RpcOrderResult = {
  order_id: string;
  order_number: string;
  subtotal: number;
  total: number;
  items?: RpcOrderItemResult[];
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

function createPlateItem(
  planType: PlatePlanType,
  pricingCatalog: PricingCatalog
): OrderPlateItem {
  return {
    id: crypto.randomUUID(),
    planType,
    petName: "",
    color: "white",
    shape: "circle",
    size: "S",
    unitPrice: getCurrentPlanPrice(planType, pricingCatalog),
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
    return "3.4 cm diámetro";
  }

  return (
    SIZE_OPTIONS_BY_SHAPE[item.shape].find(
      (option) => option.value === item.size
    )?.detail ?? item.size
  );
}

function esCorreoValido(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function getPlanLabel(plan: PlatePlanType) {
  return plan === "essential" ? "Essential" : "Custom";
}

export default function Order() {
  const location = useLocation();
  const { user, profile } = useAuth();
  const { catalog: pricingCatalog } = usePricingCatalog();

  const [items, setItems] = useState<OrderPlateItem[]>([]);
  const [guestName, setGuestName] = useState(profile?.full_name || "");
  const [guestEmail, setGuestEmail] = useState(
    profile?.email || user?.email || ""
  );
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
        setItems([createPlateItem(add, pricingCatalog)]);
        lastProcessedAddRef.current = add;
      } else {
        setItems([createPlateItem("essential", pricingCatalog)]);
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
      setItems((prev) => [...prev, createPlateItem(add, pricingCatalog)]);
      lastProcessedAddRef.current = add;
    }
  }, [searchParams, pricingCatalog]);

  useEffect(() => {
    setItems((currentItems) =>
      currentItems.map((item) => {
        const currentPrice = getCurrentPlanPrice(
          item.planType,
          pricingCatalog
        );

        return item.unitPrice === currentPrice
          ? item
          : { ...item, unitPrice: currentPrice };
      })
    );
  }, [pricingCatalog]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice, 0),
    [items]
  );

  const essentialCount = useMemo(
    () => items.filter((item) => item.planType === "essential").length,
    [items]
  );

  const customCount = useMemo(
    () => items.filter((item) => item.planType === "custom").length,
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

  const clearFeedback = (clearCreatedOrder = true) => {
    setErrorMsg("");
    setSuccessMsg("");

    if (clearCreatedOrder) {
      setCreatedOrderId("");
      setCreatedOrderNumber("");
    }
  };

  const addItem = (planType: PlatePlanType) => {
    setItems((prev) => [
      ...prev,
      createPlateItem(planType, pricingCatalog),
    ]);
    clearFeedback();
  };

  const removeItem = (id: string) => {
    const confirmed = window.confirm("¿Quieres eliminar esta placa del pedido?");
    if (!confirmed) return;

    setItems((prev) => prev.filter((item) => item.id !== id));
    clearFeedback();
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
          next.unitPrice = getCurrentPlanPrice(
            value as PlatePlanType,
            pricingCatalog
          );

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

    clearFeedback();
  };

  const buildWhatsappMessage = (result: RpcOrderResult) => {
    const lines: string[] = [];

    lines.push("Hola, quiero realizar este pedido Mokko:");
    lines.push("");
    lines.push(`Pedido: ${result.order_number}`);
    lines.push("");

    items.forEach((item, index) => {
      const serverItem = result.items?.[index];
      const unitPrice = Number(serverItem?.unit_price ?? item.unitPrice);
      const colorLabel = obtenerLabelColor(item.color);
      const shapeLabel =
        item.planType === "essential"
          ? "Circular"
          : obtenerLabelForma(item.shape);
      const sizeLabel = obtenerDetalleTamano(item);

      lines.push(`Placa ${index + 1}`);
      lines.push(`Tipo: ${getPlanLabel(item.planType)}`);

      if (item.planType === "custom") {
        lines.push(`Nombre: ${item.petName.trim()}`);
      }

      lines.push(`Color: ${colorLabel}`);
      lines.push(`Forma: ${shapeLabel}`);
      lines.push(`Tamaño: ${sizeLabel}`);
      lines.push(
        `Precio: ${formatPrice(unitPrice, { alwaysShowDecimals: true })}`
      );
      lines.push("");
    });

    lines.push(
      `Total: ${formatPrice(Number(result.total), { alwaysShowDecimals: true })}`
    );

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
        setErrorMsg(
          "Completa el nombre de la mascota en todas las placas Custom."
        );
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

      if (result.items?.length === items.length) {
        setItems((currentItems) =>
          currentItems.map((item, index) => {
            const serverPrice = Number(result.items?.[index]?.unit_price);

            return Number.isFinite(serverPrice)
              ? { ...item, unitPrice: serverPrice }
              : item;
          })
        );
      }

      setCreatedOrderId(result.order_id);
      setCreatedOrderNumber(result.order_number);
      setSuccessMsg("Pedido generado correctamente.");

      const whatsappMessage = buildWhatsappMessage(result);
      const whatsappUrl = buildWhatsAppUrl(whatsappMessage);

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

          <div className="mokko-container relative z-10 py-7 md:py-14">
            <div className="mx-auto max-w-6xl">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.28)] backdrop-blur-sm md:rounded-[36px] md:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-5">
                    <span className="mokko-badge mokko-badge-primary w-fit">
                      Pedido Mokko
                    </span>

                    <div className="space-y-4">
                      <h1 className="text-3xl font-semibold leading-[1.08] tracking-[-0.02em] sm:text-5xl">
                        Configura tus{" "}
                        <span className="text-[#E8C547]">placas</span>
                      </h1>

                      <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
                        Combina placas Essential y Custom en un solo pedido. Al
                        finalizar, se generará tu orden y se abrirá WhatsApp para
                        coordinar el pago y entrega.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:flex sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => addItem("essential")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-4 text-sm font-medium text-white/85 transition hover:bg-white/5 sm:w-auto sm:py-3.5"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir Essential
                    </button>

                    <button
                      type="button"
                      onClick={() => addItem("custom")}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] sm:w-auto sm:py-3.5"
                    >
                      <Plus className="h-4 w-4" />
                      Añadir Custom
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="mt-6 rounded-2xl border border-green-400/20 bg-green-400/10 px-4 py-3 text-sm leading-6 text-green-200">
                  {successMsg}
                  {createdOrderNumber
                    ? ` Número de orden: ${createdOrderNumber}`
                    : ""}
                </div>
              )}

              <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <MetricCard
                  icon={ShoppingBag}
                  label="Placas"
                  value={items.length}
                  description="En pedido."
                />

                <MetricCard
                  icon={CheckCircle2}
                  label="Essential"
                  value={essentialCount}
                  description="Formato fijo."
                />

                <MetricCard
                  icon={Sparkles}
                  label="Custom"
                  value={customCount}
                  description="Personalizadas."
                  highlight={customCount > 0}
                />

                <MetricCard
                  icon={ReceiptText}
                  label="Subtotal"
                  value={formatPrice(subtotal, { alwaysShowDecimals: true })}
                  description="Sin envío."
                  highlight
                />
              </section>

              <div className="mt-7 grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                <section className="grid gap-5">
                  {items.map((item, index) => {
                    const sizeOptions = SIZE_OPTIONS_BY_SHAPE[item.shape];

                    return (
                      <article
                        key={item.id}
                        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-sm transition hover:border-[#E8C547]/20 hover:bg-white/[0.055] md:rounded-[32px] md:p-6"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
                              Placa {index + 1}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <h2 className="text-2xl font-semibold text-[#F5F0E8]">
                                {getPlanLabel(item.planType)}
                              </h2>

                              <StatusPill
                                className={
                                  item.planType === "custom"
                                    ? "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]"
                                    : "border-white/10 bg-white/5 text-white/75"
                                }
                              >
                                {formatPrice(item.unitPrice)}
                              </StatusPill>
                            </div>
                          </div>

                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-400/10 sm:w-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          )}
                        </div>

                        <div className="mt-6 grid gap-6">
                          <section>
                            <FieldLabel>Tipo de placa</FieldLabel>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <PlanButton
                                active={item.planType === "essential"}
                                title="Essential"
                                description="Circular, simple y lista para usar."
                                price={getCurrentPlanPrice("essential", pricingCatalog)}
                                onClick={() =>
                                  updateItem(item.id, "planType", "essential")
                                }
                              />

                              <PlanButton
                                active={item.planType === "custom"}
                                title="Custom"
                                description="Nombre, color, forma y tamaño."
                                price={getCurrentPlanPrice("custom", pricingCatalog)}
                                onClick={() =>
                                  updateItem(item.id, "planType", "custom")
                                }
                              />
                            </div>
                          </section>

                          {item.planType === "custom" && (
                            <section>
                              <FieldLabel>Nombre de la mascota</FieldLabel>
                              <TextInput
                                type="text"
                                value={item.petName}
                                onChange={(e) =>
                                  updateItem(item.id, "petName", e.target.value)
                                }
                                placeholder="Ej. Max"
                              />
                            </section>
                          )}

                          <section>
                            <div className="mb-3 flex items-center gap-2">
                              <Palette className="h-4 w-4 text-[#E8C547]" />
                              <FieldLabel>Color</FieldLabel>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              {COLOR_OPTIONS.map((color) => (
                                <ColorButton
                                  key={color.value}
                                  active={item.color === color.value}
                                  label={color.label}
                                  swatch={color.swatch}
                                  onClick={() =>
                                    updateItem(item.id, "color", color.value)
                                  }
                                />
                              ))}
                            </div>

                            <p className="mt-2 text-xs leading-6 text-white/45">
                              El logo Mokko va siempre en amarillo.
                            </p>
                          </section>

                          {item.planType === "essential" ? (
                            <div className="rounded-2xl border border-white/10 bg-[#141410] p-4 text-sm leading-7 text-white/70">
                              Essential usa formato fijo:{" "}
                              <span className="font-medium text-white">
                                circular · 3.4 cm de diámetro · color a elección.
                              </span>
                            </div>
                          ) : (
                            <>
                              <section>
                                <div className="mb-3 flex items-center gap-2">
                                  <Shapes className="h-4 w-4 text-[#E8C547]" />
                                  <FieldLabel>Forma</FieldLabel>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                  {SHAPE_OPTIONS.map((shape) => (
                                    <OptionButton
                                      key={shape.value}
                                      active={item.shape === shape.value}
                                      title={shape.label}
                                      onClick={() =>
                                        updateItem(item.id, "shape", shape.value)
                                      }
                                    />
                                  ))}
                                </div>
                              </section>

                              <section>
                                <div className="mb-3 flex items-center gap-2">
                                  <Ruler className="h-4 w-4 text-[#E8C547]" />
                                  <FieldLabel>Tamaño</FieldLabel>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                  {sizeOptions.map((size) => (
                                    <OptionButton
                                      key={size.value}
                                      active={item.size === size.value}
                                      title={size.label}
                                      description={size.detail}
                                      onClick={() =>
                                        updateItem(item.id, "size", size.value)
                                      }
                                    />
                                  ))}
                                </div>

                                <p className="mt-2 text-xs leading-6 text-white/45">
                                  Las medidas corresponden al cuerpo principal de la placa, sin contar la zona de la argolla.
                                </p>
                              </section>
                            </>
                          )}

                          <InfoCard
                            label="Precio de esta placa"
                            value={formatPrice(item.unitPrice, { alwaysShowDecimals: true })}
                            highlight
                          />
                        </div>
                      </article>
                    );
                  })}
                </section>

                <aside className="h-fit rounded-[28px] border border-[#E8C547]/15 bg-[#E8C547]/8 p-5 shadow-2xl backdrop-blur-sm sm:p-6 md:rounded-[32px] lg:sticky lg:top-24">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E8C547] text-[#1A1A14]">
                      <ReceiptText className="h-5 w-5" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-semibold">
                        Resumen del pedido
                      </h2>
                      <p className="mt-1 text-sm text-white/60">
                        Revisa tus datos antes de continuar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <InfoCard label="Total de placas" value={String(items.length)} />
                    <InfoCard
                      label="Subtotal"
                      value={formatPrice(subtotal, { alwaysShowDecimals: true })}
                      highlight
                    />

                    {createdOrderNumber && (
                      <InfoCard
                        label="Número de orden"
                        value={createdOrderNumber}
                      />
                    )}
                  </div>

                  <div className="mt-7 space-y-4">
                    <h3 className="text-lg font-semibold">Datos de contacto</h3>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-white/50" />
                        <FieldLabel>Nombre</FieldLabel>
                      </div>
                      <TextInput
                        type="text"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          clearFeedback(false);
                        }}
                        placeholder="Tu nombre"
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-white/50" />
                        <FieldLabel>Correo</FieldLabel>
                      </div>
                      <TextInput
                        type="email"
                        value={guestEmail}
                        onChange={(e) => {
                          setGuestEmail(e.target.value);
                          clearFeedback(false);
                        }}
                        disabled={!!user}
                        placeholder="tucorreo@ejemplo.com"
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-white/50" />
                        <FieldLabel>Teléfono / WhatsApp</FieldLabel>
                      </div>
                      <TextInput
                        type="text"
                        value={guestPhone}
                        onChange={(e) => {
                          setGuestPhone(e.target.value);
                          clearFeedback(false);
                        }}
                        placeholder="+51 999 999 999"
                      />
                    </div>
                  </div>

                  {!user && (
                    <p className="mt-4 text-xs leading-6 text-white/50">
                      Puedes continuar como invitado, pero para gestionar tus
                      placas más fácil luego te conviene{" "}
                      <Link
                        to="/register?next=/pedido"
                        className="font-semibold text-[#E8C547] hover:underline"
                      >
                        crear una cuenta
                      </Link>
                      .
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={!canSubmit || loading}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#E8C547] px-5 py-4 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {loading ? "Generando pedido..." : "Continuar por WhatsApp"}
                  </button>

                  {createdOrderId && (
                    <p className="mt-3 text-center text-xs leading-6 text-white/45">
                      Pedido guardado correctamente antes de abrir WhatsApp.
                    </p>
                  )}
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function PlanButton({
  active,
  title,
  description,
  price,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  price: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#E8C547]/50 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410] hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-white">{title}</div>
          <div className="mt-1 text-sm leading-6 text-white/60">
            {description}
          </div>
        </div>

        <div className="shrink-0 text-sm font-semibold text-[#E8C547]">
          {formatPrice(price)}
        </div>
      </div>
    </button>
  );
}

function ColorButton({
  active,
  label,
  swatch,
  onClick,
}: {
  active: boolean;
  label: string;
  swatch: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#E8C547]/50 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410] hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-5 w-5 rounded-full border border-white/20 ${swatch}`} />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
    </button>
  );
}

function OptionButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-[#E8C547]/50 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410] hover:bg-white/5"
      }`}
    >
      <div className="font-semibold text-white">{title}</div>

      {description && (
        <div className="mt-1 text-xs leading-5 text-white/50">
          {description}
        </div>
      )}
    </button>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 sm:rounded-[28px] sm:p-5 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/45 sm:text-[11px]">
          {label}
        </div>

        <div
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            highlight
              ? "bg-[#E8C547]/14 text-[#E8C547]"
              : "bg-white/8 text-white/60"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 text-2xl font-semibold text-[#F5F0E8] sm:text-3xl">
        {value}
      </div>

      <p className="mt-2 hidden text-sm leading-7 text-white/62 sm:block">
        {description}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-[#E8C547]/20 bg-[#E8C547]/10"
          : "border-white/10 bg-[#141410]"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] text-white/45">
        {label}
      </div>

      <div
        className={`mt-2 break-words text-lg font-semibold ${
          highlight ? "text-[#E8C547]" : "text-white"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px] ${className}`}
    >
      {children}
    </span>
  );
}
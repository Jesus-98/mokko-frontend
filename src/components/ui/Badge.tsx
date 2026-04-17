import type { ReactNode } from "react";

type Variant =
  | "neutral"
  | "warm"
  | "green"
  | "success"
  | "info"
  | "danger"
  | "muted";

type Props = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
};

const base =
  "inline-flex items-center rounded-2xl border px-3 py-2 text-sm font-medium";

const variants: Record<Variant, string> = {
  neutral: "border-white/10 bg-white/[0.04] text-white/80",
  warm: "border-[#E8C547]/20 bg-[#E8C547]/10 text-[#f6df8a]",
  green: "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200",
  success: "border-[#2D5A27]/30 bg-[#2D5A27]/15 text-green-200",
  info: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  danger: "border-red-400/20 bg-red-400/10 text-red-200",
  muted: "border-white/10 bg-white/5 text-white/65",
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: Props) {
  return (
    <span className={`${base} ${variants[variant]} ${className}`.trim()}>
      {children}
    </span>
  );
}
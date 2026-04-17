import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "soft";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
};

const base =
  "rounded-2xl text-sm transition disabled:cursor-not-allowed disabled:opacity-70";

const variants: Record<Variant, string> = {
  primary:
    "bg-[#E8C547] px-5 py-3 font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 hover:-translate-y-[1px] hover:bg-[#f0cf55]",
  ghost:
    "border border-white/10 px-4 py-3 font-medium text-white/85 hover:bg-white/5",
  soft:
    "border border-white/10 bg-white/[0.045] px-4 py-4 text-left font-medium text-white/85 hover:bg-white/[0.075]",
};

export default function Button({
  children,
  variant = "ghost",
  className = "",
  ...props
}: Props) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
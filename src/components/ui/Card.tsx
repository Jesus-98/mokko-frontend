import type { ReactNode } from "react";

type CardVariant =
  | "panel"
  | "panelWarm"
  | "panelGreen"
  | "subtle"
  | "dark"
  | "metricGreen"
  | "metricNeutral"
  | "metricWarm";

type Props = {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
};

const base =
  "rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.24)] backdrop-blur-sm";

const variants: Record<CardVariant, string> = {
  panel:
    "border border-white/9 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(26,26,20,0.96))]",
  panelWarm:
    "border border-[#E8C547]/14 bg-[linear-gradient(180deg,rgba(232,197,71,0.11),rgba(26,26,20,0.95))]",
  panelGreen:
    "border border-[#2D5A27]/16 bg-[linear-gradient(180deg,rgba(45,90,39,0.07),rgba(26,26,20,0.96))]",
  subtle:
    "border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(20,20,16,0.98))] shadow-[0_10px_26px_rgba(0,0,0,0.16)] rounded-[24px]",
  dark: "border border-white/8 bg-[#141410] rounded-[24px]",
  metricGreen:
    "border border-[#2D5A27]/28 bg-[linear-gradient(180deg,rgba(45,90,39,0.14),rgba(26,26,20,0.96))] rounded-[28px] shadow-[0_14px_36px_rgba(0,0,0,0.22)]",
  metricNeutral:
    "border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(26,26,20,0.96))] rounded-[28px] shadow-[0_14px_36px_rgba(0,0,0,0.2)]",
  metricWarm:
    "border border-[#E8C547]/14 bg-[linear-gradient(180deg,rgba(232,197,71,0.11),rgba(26,26,20,0.96))] rounded-[28px] shadow-[0_14px_36px_rgba(0,0,0,0.2)]",
};

export default function Card({
  children,
  className = "",
  variant = "panel",
}: Props) {
  return <div className={`${base} ${variants[variant]} ${className}`}>{children}</div>;
}
import Card from "../ui/Card";

type Props = {
  title: string;
  value: string | number;
  subtitle: string;
  variant?: "metricGreen" | "metricNeutral" | "metricWarm";
  loading?: boolean;
};

export default function AdminMetricCard({
  title,
  value,
  subtitle,
  variant = "metricNeutral",
  loading = false,
}: Props) {
  return (
    <Card variant={variant} className="p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">
        {title}
      </div>

      <div className="mt-4 text-[2rem] font-semibold leading-none text-[#F5F0E8]">
        {loading ? "..." : value}
      </div>

      <p className="mt-3 text-sm leading-7 text-white/64">{subtitle}</p>
    </Card>
  );
}
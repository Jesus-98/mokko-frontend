type Props = {
  items: { label: string; value: number }[];
  valueFormatter?: (value: number) => string;
};

export default function AdminBarChart({ items, valueFormatter }: Props) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = `${(item.value / max) * 100}%`;

        return (
          <div key={item.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/72">{item.label}</span>
              <span className="font-medium text-[#F5F0E8]">
                {valueFormatter ? valueFormatter(item.value) : item.value}
              </span>
            </div>

            <div className="h-2.5 rounded-full bg-white/8">
              <div
                className="h-2.5 rounded-full bg-[#E8C547] transition-all duration-500"
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
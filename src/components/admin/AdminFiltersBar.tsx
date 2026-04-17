import type { FiltersOption } from "../../types/admin";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  city?: string;
  onCityChange?: (value: string) => void;
  status?: string;
  onStatusChange?: (value: string) => void;
  cityOptions?: FiltersOption[];
  statusOptions?: FiltersOption[];
  searchPlaceholder?: string;
};

export default function AdminFiltersBar({
  search,
  onSearchChange,
  city = "",
  onCityChange,
  status = "",
  onStatusChange,
  cityOptions = [],
  statusOptions = [],
  searchPlaceholder = "Buscar...",
}: Props) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:grid-cols-3">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="rounded-xl border border-white/10 bg-[#12120F] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
      />

      <select
        value={city}
        onChange={(e) => onCityChange?.(e.target.value)}
        className="rounded-xl border border-white/10 bg-[#12120F] px-4 py-3 text-sm text-white outline-none"
      >
        <option value="">Todas las ciudades</option>
        {cityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange?.(e.target.value)}
        className="rounded-xl border border-white/10 bg-[#12120F] px-4 py-3 text-sm text-white outline-none"
      >
        <option value="">Todos los estados</option>
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
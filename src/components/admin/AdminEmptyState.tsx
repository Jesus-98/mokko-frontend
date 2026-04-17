type Props = {
  title: string;
  description?: string;
};

export default function AdminEmptyState({ title, description }: Props) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-8 text-center">
      <div className="text-base font-semibold text-[#F5F0E8]">{title}</div>
      {description && (
        <p className="mt-2 text-sm leading-7 text-white/60">{description}</p>
      )}
    </div>
  );
}
type Props = {
  title: string;
  description?: string;
};

export default function SectionTitle({ title, description }: Props) {
  return (
    <div>
      <h2 className="text-[1.7rem] font-semibold text-[#F5F0E8]">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-7 text-white/68">{description}</p>
      ) : null}
    </div>
  );
}
import Card from "../ui/Card";
import Button from "../ui/Button";

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function AdminModuleCard({
  title,
  description,
  actionLabel = "Abrir",
  onClick,
  disabled = false,
}: Props) {
  return (
    <Card variant="panel" className="p-5">
      <div className="flex h-full flex-col justify-between gap-5">
        <div>
          <div className="text-xl font-semibold text-[#F5F0E8]">{title}</div>
          <p className="mt-3 text-sm leading-7 text-white/65">{description}</p>
        </div>

        <Button
          variant={disabled ? "ghost" : "primary"}
          onClick={onClick}
          disabled={disabled}
        >
          {actionLabel}
        </Button>
      </div>
    </Card>
  );
}
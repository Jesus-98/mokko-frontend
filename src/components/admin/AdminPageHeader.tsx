import Button from "../ui/Button";

type Props = {
  badge?: string;
  title: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  disabled?: boolean;
};

export default function AdminPageHeader({
  badge = "Panel admin",
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  disabled = false,
}: Props) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <span className="mokko-badge mokko-badge-primary w-fit">{badge}</span>

        <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
          {title}
        </h1>

        {description && (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
            {description}
          </p>
        )}
      </div>

      {(primaryActionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap gap-3">
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="ghost"
              onClick={onSecondaryAction}
              disabled={disabled}
            >
              {secondaryActionLabel}
            </Button>
          )}

          {primaryActionLabel && onPrimaryAction && (
            <Button
              variant="primary"
              onClick={onPrimaryAction}
              disabled={disabled}
              className="px-5 py-3"
            >
              {primaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
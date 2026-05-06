type AdminFlashMessagesProps = {
  success?: string;
  error?: string;
  warning?: string;
  className?: string;
};

type FlashTone = "success" | "error" | "warning";

function getToneClasses(tone: FlashTone) {
  switch (tone) {
    case "success":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-100";
    case "warning":
      return "border-amber-500/30 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/10 bg-white/5 text-[#F5F0E8]";
  }
}

function FlashMessage({
  tone,
  children,
}: {
  tone: FlashTone;
  children: string;
}) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 shadow-sm ${getToneClasses(
        tone
      )}`}
    >
      {children}
    </div>
  );
}

export default function AdminFlashMessages({
  success,
  error,
  warning,
  className = "",
}: AdminFlashMessagesProps) {
  if (!success && !error && !warning) return null;

  return (
    <div className={`mb-6 space-y-3 ${className}`}>
      {success ? <FlashMessage tone="success">{success}</FlashMessage> : null}
      {warning ? <FlashMessage tone="warning">{warning}</FlashMessage> : null}
      {error ? <FlashMessage tone="error">{error}</FlashMessage> : null}
    </div>
  );
}
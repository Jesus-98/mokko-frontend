import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

const labelClass = "mb-2 block text-sm text-white/80";

const baseControlClass =
  "w-full rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#E8C547]/50 disabled:cursor-not-allowed disabled:opacity-60 read-only:text-white/70";

const darkDateClass = "[color-scheme:dark]";

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

function shouldUseDarkDateScheme(type?: InputHTMLAttributes<HTMLInputElement>["type"]) {
  return (
    type === "date" ||
    type === "time" ||
    type === "datetime-local" ||
    type === "month" ||
    type === "week"
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className={labelClass}>{children}</label>;
}

export function TextInput({
  className,
  type,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      type={type}
      className={joinClasses(
        baseControlClass,
        shouldUseDarkDateScheme(type) && darkDateClass,
        className
      )}
    />
  );
}

export function DateInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      {...props}
      type="date"
      className={joinClasses(baseControlClass, darkDateClass, className)}
    />
  );
}

export function SelectInput({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={joinClasses(
          baseControlClass,
          "appearance-none pr-11",
          className
        )}
      >
        {children}
      </select>

      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-white/55">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={joinClasses(
        baseControlClass,
        "min-h-[120px] resize-none",
        className
      )}
    />
  );
}
import { Link } from "react-router-dom";

type AdminAccessDeniedProps = {
  title?: string;
  message?: string;
  backTo?: string;
  backLabel?: string;
};

export default function AdminAccessDenied({
  title = "Acceso restringido",
  message = "No tienes permisos para ingresar a esta sección del panel administrativo.",
  backTo = "/dashboard",
  backLabel = "Volver a mi panel",
}: AdminAccessDeniedProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur md:p-8">
        <span className="inline-flex items-center rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-200">
          Acceso denegado
        </span>

        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#F5F0E8] md:text-3xl">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F5F0E8]/78 md:text-base">
          {message}
        </p>

        <div className="mt-6">
          <Link
            to={backTo}
            className="inline-flex items-center justify-center rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] transition hover:brightness-105"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
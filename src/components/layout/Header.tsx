import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { navLinks } from "../../data/navigation";
import { useAuth } from "../../context/AuthContext";

type AccountAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(112);

  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const { user, profile, role, loading } = useAuth();

  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection("");
      return;
    }

    const ids = navLinks
      .filter((link) => link.type === "section" && link.href)
      .map((link) => link.href!.replace("#", ""));

    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry?.isIntersecting) {
            setActiveSection(id);
          }
        },
        { threshold: 0.35 }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      const nextHeight = headerRef.current?.getBoundingClientRect().height;

      if (nextHeight) {
        setHeaderHeight(nextHeight);

        document.documentElement.style.setProperty(
          "--mokko-header-height",
          `${nextHeight}px`
        );
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setAccountMenuOpen(false);
  };

  const goTo = (path: string) => {
    closeMenus();
    navigate(path);
  };

  const scrollToElement = (id: string, attempt = 0) => {
    const element = document.getElementById(id);

    if (!element) {
      if (attempt < 10) {
        window.setTimeout(() => {
          scrollToElement(id, attempt + 1);
        }, 50);
      }

      return;
    }

    const currentHeaderHeight =
      headerRef.current?.getBoundingClientRect().height || headerHeight;

    const targetTop =
      element.getBoundingClientRect().top +
      window.scrollY -
      currentHeaderHeight;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  };

  const scrollTo = (href: string) => {
    const id = href.replace("#", "");

    closeMenus();

    if (location.pathname !== "/") {
      navigate("/");

      window.setTimeout(() => {
        scrollToElement(id);
      }, 180);

      return;
    }

    window.setTimeout(() => {
      scrollToElement(id);
    }, 40);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Header logout error:", err);
    } finally {
      closeMenus();
      navigate("/");
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = role === "admin";

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    profile?.email?.split("@")[0] ||
    "Mi cuenta";

  const displayEmail = user?.email || profile?.email || "";

  const displayRole =
    role === "admin"
      ? "Admin"
      : role === "partner"
        ? "Aliado"
        : role === "customer"
          ? "Cliente"
          : "";

  const accountActions: AccountAction[] = [
    { label: "Mi panel", onClick: () => goTo("/dashboard") },
    { label: "Mis mascotas", onClick: () => goTo("/mis-mascotas") },
    { label: "Mis placas", onClick: () => goTo("/mis-placas") },
    { label: "Mis reportes", onClick: () => goTo("/mis-reportes") },
    { label: "Mis pedidos", onClick: () => goTo("/mis-pedidos") },
    { label: "Mis datos", onClick: () => goTo("/my-account") },
  ];

  if (isAdmin) {
    accountActions.splice(5, 0, {
      label: "Panel de administración",
      onClick: () => goTo("/admin"),
    });
  }

  accountActions.push({
    label: "Cerrar sesión",
    onClick: handleLogout,
    danger: true,
  });

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-50 border-b border-white/10 bg-[#1A1A14]/90 backdrop-blur transition-shadow ${
        scrolled ? "shadow-[0_4px_24px_rgba(0,0,0,0.3)]" : ""
      }`}
    >
      <div className="bg-[#E8C547] py-2 text-center text-xs font-semibold text-[#1A1A14]">
        🐾 Lanzamiento en Lima · Primeras 50 placas a precio especial
      </div>

      <div className="mokko-container flex h-20 items-center justify-between">
        <Link to="/" onClick={closeMenus} className="flex items-center gap-3">
          <img
            src="/logo-mokko.png"
            alt="Mokko"
            className="h-10 w-auto object-contain sm:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => {
            if (link.type === "external" && link.url) {
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenus}
                  className="relative rounded-xl px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              );
            }

            if (link.type === "section" && link.href) {
              const id = link.href.replace("#", "");
              const isActive = location.pathname === "/" && activeSection === id;

              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => scrollTo(link.href!)}
                  className={`relative rounded-xl px-4 py-2 text-sm transition ${
                    isActive
                      ? "text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-[#E8C547]" />
                  )}
                </button>
              );
            }

            return null;
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {loading ? (
            <>
              <div className="h-11 w-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
              <div className="h-12 w-36 animate-pulse rounded-2xl bg-[#E8C547]/50" />
            </>
          ) : !isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => goTo("/login")}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5"
              >
                Ingresar
              </button>

              <button
                type="button"
                onClick={() => goTo("/activar")}
                className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
              >
                Activar mi placa
              </button>
            </>
          ) : (
            <>
              <div className="relative" ref={accountMenuRef}>
                <button
                  type="button"
                  onClick={() => setAccountMenuOpen((prev) => !prev)}
                  aria-expanded={accountMenuOpen}
                  aria-haspopup="menu"
                  className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5"
                >
                  {displayName}
                </button>

                {accountMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-3 w-64 rounded-2xl border border-white/10 bg-[#141410] p-2 shadow-2xl"
                  >
                    <div className="border-b border-white/10 px-3 py-3">
                      <div className="text-sm font-semibold text-white">
                        {displayName}
                      </div>

                      {displayEmail && (
                        <div className="mt-1 text-xs text-white/50">
                          {displayEmail}
                        </div>
                      )}

                      {displayRole && (
                        <div className="mt-2 inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-2 py-1 text-[11px] text-[#E8C547]">
                          {displayRole}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-col">
                      {accountActions.map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          role="menuitem"
                          onClick={action.onClick}
                          className={`rounded-xl px-3 py-3 text-left text-sm transition ${
                            action.danger
                              ? "text-red-200 hover:bg-red-400/10"
                              : "text-white/80 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => goTo("/activar")}
                className="rounded-2xl bg-[#E8C547] px-5 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px] hover:bg-[#f0cf55]"
              >
                Activar mi placa
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
        >
          <div className="flex flex-col gap-1.5">
            <span
              className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${
                mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block h-[2px] w-5 rounded-full bg-white transition-all duration-300 ${
                mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      <div
        id="mobile-navigation"
        aria-hidden={!mobileMenuOpen}
        className={`absolute inset-x-0 top-full z-50 border-t border-white/10 bg-[#141410]/[0.98] shadow-[0_24px_60px_rgba(0,0,0,0.45)] transition-all duration-300 lg:hidden ${
          mobileMenuOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: `calc(100dvh - ${headerHeight}px)`,
          }}
        >
          <div className="mokko-container flex min-h-full flex-col gap-1 py-4 pb-6">
          {navLinks.map((link) => {
            if (link.type === "external" && link.url) {
              return (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenus}
                  className="rounded-2xl px-4 py-3 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              );
            }

            if (link.type === "section" && link.href) {
              const id = link.href.replace("#", "");
              const isActive = location.pathname === "/" && activeSection === id;

              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => scrollTo(link.href!)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? "bg-white/5 text-white"
                      : "text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#E8C547]" />
                  )}
                  {link.label}
                </button>
              );
            }

            return null;
          })}

          <div className="mt-3 grid gap-3 border-t border-white/10 pt-2">
            {loading ? (
              <>
                <div className="h-12 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
                <div className="h-12 animate-pulse rounded-2xl bg-[#E8C547]/50" />
              </>
            ) : !isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => goTo("/login")}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                >
                  Ingresar
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/activar")}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px]"
                >
                  Activar mi placa
                </button>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-sm font-semibold text-white">
                    {displayName}
                  </div>

                  {displayEmail && (
                    <div className="mt-1 text-xs text-white/50">
                      {displayEmail}
                    </div>
                  )}

                  {displayRole && (
                    <div className="mt-2 inline-flex rounded-full border border-[#E8C547]/20 bg-[#E8C547]/10 px-2 py-1 text-[11px] text-[#E8C547]">
                      {displayRole}
                    </div>
                  )}
                </div>

                {accountActions
                  .filter((action) => action.label !== "Cerrar sesión")
                  .map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-medium text-white/85 transition hover:bg-white/5"
                    >
                      {action.label}
                    </button>
                  ))}

                <button
                  type="button"
                  onClick={() => goTo("/activar")}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#E8C547] px-4 py-3 text-sm font-semibold text-[#1A1A14] shadow-lg shadow-[#E8C547]/20 transition hover:-translate-y-[1px]"
                >
                  Activar mi placa
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-2xl border border-red-400/20 px-4 py-3 text-sm font-medium text-red-200 transition hover:bg-red-400/10"
                >
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  );
}
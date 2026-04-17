import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  emptyText?: string;
  name?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "top" | "bottom";
};

const OPEN_EVENT_NAME = "mokko-custom-select-open";

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Selecciona una opción",
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
  emptyText = "No hay opciones disponibles",
  name,
}: CustomSelectProps) {
  const instanceId = useId();
  const listboxId = useId();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) ?? null;
  }, [options, value]);

  const firstEnabledIndex = useMemo(() => {
    return options.findIndex((option) => !option.disabled);
  }, [options]);

  const selectedIndex = useMemo(() => {
    return options.findIndex((option) => option.value === value);
  }, [options, value]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 8;
    const safeMargin = 8;

    const spaceBelow = viewportHeight - rect.bottom - safeMargin;
    const spaceAbove = rect.top - safeMargin;

    const shouldOpenUp =
      spaceBelow < 220 && spaceAbove > spaceBelow;

    const rawMaxHeight = shouldOpenUp
      ? spaceAbove - gap
      : spaceBelow - gap;

    const maxHeight = Math.max(140, Math.min(320, rawMaxHeight));
    const width = Math.min(rect.width, viewportWidth - safeMargin * 2);

    const left = Math.min(
      Math.max(safeMargin, rect.left),
      viewportWidth - width - safeMargin
    );

    const top = shouldOpenUp
      ? Math.max(safeMargin, rect.top - maxHeight - gap)
      : Math.min(
          viewportHeight - maxHeight - safeMargin,
          rect.bottom + gap
        );

    setMenuPosition({
      top,
      left,
      width,
      maxHeight,
      placement: shouldOpenUp ? "top" : "bottom",
    });
  }, []);

  useEffect(() => {
    const handleAnotherOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id !== instanceId) {
        setOpen(false);
      }
    };

    window.addEventListener(OPEN_EVENT_NAME, handleAnotherOpen);

    return () => {
      window.removeEventListener(OPEN_EVENT_NAME, handleAnotherOpen);
    };
  }, [instanceId]);

  useEffect(() => {
    if (!open) return;

    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;

      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;

      setOpen(false);
    };

    const handleWindowKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleViewportChange = () => {
      updateMenuPosition();
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleWindowKey);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleWindowKey);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    if (selectedIndex >= 0 && !options[selectedIndex]?.disabled) {
      setHighlightedIndex(selectedIndex);
      return;
    }

    setHighlightedIndex(firstEnabledIndex);
  }, [open, selectedIndex, firstEnabledIndex, options]);

  useEffect(() => {
    if (!open) return;
    if (highlightedIndex < 0) return;

    const node = optionRefs.current[highlightedIndex];
    node?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  const openMenu = () => {
    if (disabled) return;

    window.dispatchEvent(
      new CustomEvent(OPEN_EVENT_NAME, {
        detail: { id: instanceId },
      })
    );

    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
  };

  const toggleMenu = () => {
    if (disabled) return;

    if (open) {
      closeMenu();
      return;
    }

    openMenu();
  };

  const selectIndex = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;

    onChange(option.value);
    setOpen(false);
  };

  const getNextEnabledIndex = (startIndex: number, direction: 1 | -1) => {
    if (options.length === 0) return -1;

    let index = startIndex;

    for (let step = 0; step < options.length; step += 1) {
      index += direction;

      if (index < 0) index = options.length - 1;
      if (index >= options.length) index = 0;

      if (!options[index]?.disabled) {
        return index;
      }
    }

    return -1;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openMenu();
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMenu();
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        getNextEnabledIndex(current < 0 ? -1 : current, 1)
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        getNextEnabledIndex(current < 0 ? options.length : current, -1)
      );
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (highlightedIndex >= 0) {
        selectIndex(highlightedIndex);
      }
      return;
    }

    if (event.key === "Tab") {
      closeMenu();
    }
  };

  const menuStyle: CSSProperties | undefined = menuPosition
    ? {
        position: "fixed",
        top: menuPosition.top,
        left: menuPosition.left,
        width: menuPosition.width,
        maxHeight: menuPosition.maxHeight,
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={joinClasses("relative", className)}
      onKeyDown={handleKeyDown}
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={toggleMenu}
        className={joinClasses(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/8 bg-[#141410] px-4 py-3 text-left text-white outline-none transition focus:border-[#E8C547]/50 disabled:cursor-not-allowed disabled:opacity-60",
          buttonClassName
        )}
      >
        <span className={selectedOption ? "text-white" : "text-white/45"}>
          {selectedOption?.label || placeholder}
        </span>

        <span className="pointer-events-none shrink-0 text-white/55">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={joinClasses(
              "h-4 w-4 transition-transform",
              open && "rotate-180"
            )}
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
      </button>

      {mounted &&
        open &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            className={joinClasses(
              "z-[9999] overflow-auto overscroll-contain rounded-2xl border border-white/10 bg-[#141410] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]",
              menuPosition.placement === "top" ? "origin-bottom" : "origin-top",
              menuClassName
            )}
            style={menuStyle}
          >
            {options.length === 0 ? (
              <div className="rounded-xl px-3 py-3 text-sm text-white/45">
                {emptyText}
              </div>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={`${option.value}-${index}`}
                    ref={(node) => {
                      optionRefs.current[index] = node;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onMouseEnter={() => {
                      if (!option.disabled) {
                        setHighlightedIndex(index);
                      }
                    }}
                    onClick={() => selectIndex(index)}
                    className={joinClasses(
                      "w-full rounded-xl px-3 py-3 text-left transition",
                      option.disabled
                        ? "cursor-not-allowed opacity-45"
                        : "cursor-pointer",
                      isSelected
                        ? "bg-[#E8C547]/12 text-[#F5F0E8]"
                        : isHighlighted
                        ? "bg-white/6 text-white"
                        : "text-white/85 hover:bg-white/6"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{option.label}</div>

                        {option.description ? (
                          <div className="mt-1 text-xs text-white/50">
                            {option.description}
                          </div>
                        ) : null}
                      </div>

                      {isSelected ? (
                        <span className="mt-0.5 shrink-0 text-[#E8C547]">
                          <svg
                            viewBox="0 0 20 20"
                            fill="none"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              d="M4.5 10.5L8 14L15.5 6.5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
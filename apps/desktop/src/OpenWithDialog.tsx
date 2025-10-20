import { useState, useEffect, useRef, type MouseEvent } from "react";
import { type UIState, useUIStore } from "./store/uiStore";

export type BrowserProfile = {
  id: string;
  name: string;
  icon?: string;
  profile?: string | null;
};

type Props = {
  open?: boolean;
  onClose?: () => void;
  browsers: BrowserProfile[];
  onChoose: (browser: BrowserProfile, persist: "just-once" | "always") => void;
};

export default function OpenWithDialog({
  open: openProp,
  onClose: onCloseProp,
  browsers,
  onChoose,
}: Props) {
  const storeOpen = useUIStore((s: UIState) => s.isDialogOpen);
  const storeSelected = useUIStore((s: UIState) => s.selectedBrowserId);
  const setSelectedBrowser = useUIStore((s: UIState) => s.setSelectedBrowser);
  const closeDialog = useUIStore((s: UIState) => s.closeDialog);

  const open = openProp ?? storeOpen;
  const [selectedId, setSelectedId] = useState<string | null>(storeSelected ?? browsers[0]?.id ?? null);

  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setSelectedId(null);
    onCloseProp?.() ?? closeDialog();
  };

  const handleChoose = (persist: "just-once" | "always") => {
    const browser = browsers.find(b => b.id === selectedId);
    if (browser) {
      setSelectedBrowser(browser.id);
      onChoose(browser, persist);
      setSelectedId(null);
    }
  };

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) handleClose();
  };

  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dlg = dialogRef.current;

    setSelectedId(browsers[0]?.id ?? null);

    const focusFirst = () => {
      const firstRadio = dlg.querySelector<HTMLInputElement>("input[type='radio']");
      if (firstRadio) {
        try {
          firstRadio.focus({ preventScroll: true });
        } catch {
          firstRadio.focus();
        }
        return;
      }
      const firstFocusable = dlg.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    };

    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => focusFirst());
    else setTimeout(() => focusFirst(), 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return handleClose();

      if (e.key === "Tab") {
        const focusable = Array.from(
          dlg.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!dlg.contains(target)) {
        const first = dlg.querySelector<HTMLElement>(
          'input[type="radio"], a[href], button:not([disabled]), textarea:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        first?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="owd-title"
        aria-describedby="owd-desc"
        className="relative w-[min(420px,calc(100vw-3rem))] rounded-[28px] border border-white/5 bg-zinc-950/90 p-6 shadow-soft"
      >
        <button
          aria-label="Close dialog"
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-zinc-400 hover:border-red-400/40 hover:text-red-200"
          onClick={handleClose}
        >
          Esc
        </button>

        <header>
          <h2 id="owd-title" className="text-lg font-semibold text-zinc-100">
            Open with
          </h2>
          <p id="owd-desc" className="mt-1 text-sm text-zinc-400">
            Choose the browser profile that should receive this launch request.
          </p>
        </header>

        <div className="mt-6 space-y-3" role="radiogroup" aria-label="Browser options">
          {browsers.map(({ id, name, icon, profile }) => {
            const selected = id === selectedId;
            return (
              <label
                key={id}
                className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 cursor-pointer transition ${
                  selected
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 shadow-soft-sm"
                    : "border-white/5 bg-black/30 text-zinc-200 hover:border-emerald-300/30 hover:text-emerald-100"
                }`}
              >
                <input
                  type="radio"
                  name="browser"
                  value={id}
                  checked={selected}
                  onChange={() => setSelectedId(id)}
                  className="sr-only"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-white/10 bg-black/40">
                  {icon ? (
                    <img src={icon} alt="" className="h-8 w-8 rounded-[12px] object-contain" />
                  ) : (
                    name[0].toUpperCase()
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold">{name}</span>
                  <span className="text-xs text-zinc-500">{profile ?? "Default profile"}</span>
                </div>
                <span
                  className={`h-3 w-3 rounded-full border ${
                    selected ? "border-emerald-300 bg-emerald-400 shadow-soft-sm" : "border-white/15 bg-black/20"
                  }`}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-between">
          <button
            data-testid="owd-just-once"
            onClick={() => handleChoose("just-once")}
            className="flex-1 rounded-[18px] border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-zinc-200 shadow-soft-sm hover:border-amber-400/40 hover:text-amber-200"
          >
            Just once
          </button>
          <button
            data-testid="owd-always"
            onClick={() => handleChoose("always")}
            className="flex-1 rounded-[18px] border border-emerald-400/60 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-soft-sm hover:border-emerald-300/70"
          >
            Always
          </button>
        </div>
      </div>
    </div>
  );
}

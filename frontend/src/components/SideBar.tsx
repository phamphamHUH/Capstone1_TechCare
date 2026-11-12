import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import SidebarUserMenu from "./sidebar/SidebarUserMenu";
import type { NavItem } from "./sidebar/utils/sidebarNav";

const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 224;
const MAX_WIDTH = 420;
const STORAGE_KEY = "sidebar-width";

const clampWidth = (width: number) =>
  Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));

function readSavedWidth() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved ? clampWidth(saved) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

type SideBarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  page: string;
  setPage: (page: string) => void;
  navItems: NavItem[];
};

// Below lg (1024px) the sidebar is a drawer over the page; at lg and up it
// sits beside the page.
const isMobile = () => window.innerWidth < 1024;

function SideBar({ open, setOpen, page, setPage, navItems }: SideBarProps) {
  const [width, setWidth] = useState(readSavedWidth);
  const [resizing, setResizing] = useState(false);
  const [mobile, setMobile] = useState(isMobile);
  const aside = useRef<HTMLElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      setMobile(query.matches);
      if (query.matches) setOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [setOpen]);

  // Drag the right edge to resize (desktop only; mobile stays w-64).
  useEffect(() => {
    if (!resizing) return;

    const onMove = (event: PointerEvent) => {
      const left = aside.current?.getBoundingClientRect().left ?? 0;
      setWidth(clampWidth(event.clientX - left));
    };
    const onUp = () => setResizing(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [resizing]);

  // Remember the width once a drag (or reset) finishes.
  useEffect(() => {
    if (resizing) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // Storage blocked: the width just won't be remembered.
    }
  }, [resizing, width]);

  function resizeWithKeys(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === "ArrowLeft") setWidth((w) => clampWidth(w - step));
    else if (event.key === "ArrowRight") setWidth((w) => clampWidth(w + step));
    else return;
    event.preventDefault();
  }

  // Keep touch scrolling and keyboard focus inside the open phone drawer.
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(
      aside.current?.querySelectorAll<HTMLElement>('button, [href], [tabindex="0"]') ?? [],
    ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, mobile, setOpen]);

  return (
    <>
    {/* Phone: dim the page behind the open drawer; tap it to close. */}
    {open && (
      <button
        type="button"
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
      />
    )}
    <aside
      ref={aside}
      role={mobile && open ? "dialog" : undefined}
      aria-modal={mobile && open ? true : undefined}
      aria-label="Navigation"
      style={{ "--sidebar-width": `${width}px` } as CSSProperties}
      className={`select-none fixed inset-y-0 left-0 z-50 flex h-dvh shrink-0 flex-col overflow-y-auto bg-white text-black lg:overflow-visible lg:sticky lg:top-0 lg:z-auto lg:h-screen ${
        resizing ? "" : "transition-all duration-300"
      } ${
        open
          ? "w-64 max-w-[85vw] border-r border-gray-300 lg:w-(--sidebar-width) lg:max-w-none"
          : "w-0 p-0"
      }`}
    >
      {open && (
        <>
          <div className="relative flex shrink-0 items-center justify-start gap-2 h-24 border-b border-gray-300 px-2 mb-6">
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setOpen(false)}
              className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-md bg-white text-gray-600 hover:bg-gray-100 lg:hidden"
            >
              <X size={20} />
            </button>
            <img
              src="/assets/images/reyna-g-logo.png"
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
            <div className="flex min-w-0 flex-col text-sky-400">
              <p className="font-extrabold text-2xl tracking-wide">Reyna G</p>
              <p className="font-bold text-xs tracking-wider">
                Diagnostic Laboratory
              </p>
            </div>
          </div>

          <nav className="flex flex-col px-5 gap-1">
            {navItems.map((item) => (
              <button
                type="button"
                aria-current={page === item.page ? "page" : undefined}
                key={item.page}
                className={`min-h-11 text-left hover:scale-101 active:scale-100 active:bg-sky-200 active:text-sky-700 rounded-md py-2 px-3 transition-all cursor-pointer ${
                  page === item.page ? "bg-sky-100 text-sky-600 " : ""
                }`}
                onClick={() => {
                  setPage(item.page);
                  if (isMobile()) setOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </div>
              </button>
            ))}
          </nav>

          {/* Profile + logout menu pinned to the bottom */}
          <div className="mt-auto border-t border-gray-300 px-3 py-3">
            <SidebarUserMenu />
          </div>

          {/* Resize handle: drag the right edge, double-click to reset. */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuenow={width}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            tabIndex={0}
            title="Drag to resize · double-click to reset"
            onPointerDown={(event) => {
              event.preventDefault();
              setResizing(true);
            }}
            onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
            onKeyDown={resizeWithKeys}
            className="absolute inset-y-0 -right-1.5 z-10 hidden w-3 cursor-col-resize lg:block group/handle focus-visible:outline-none"
          >
            <div
              className={`mx-auto h-full w-0.5 transition-colors ${
                resizing
                  ? "bg-sky-500"
                  : "bg-transparent group-hover/handle:bg-sky-400 group-focus-visible/handle:bg-sky-500"
              }`}
            />
          </div>
        </>
      )}
    </aside>
    </>
  );
}

export default SideBar;

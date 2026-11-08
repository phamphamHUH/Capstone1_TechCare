import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

type LoadingSpinnerProps = {
  size?: number;
  className?: string;
};

/** Decorative spinner for buttons that already have a visible action label. */
export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return (
    <LoaderCircle
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      className={cn(
        "shrink-0 animate-spin motion-reduce:animate-none",
        className,
      )}
    />
  );
}

/** Repeating color reveal indicates activity while the caller waits for its request. */
export function LoadingLogo({ size = 96, className }: LoadingSpinnerProps) {
  const fillRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = fillRef.current;
    if (!image) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;

    function updateAnimation() {
      animation?.cancel();
      animation = undefined;
      if (reducedMotion.matches || !image?.animate) return;

      animation = image.animate(
        [
          { clipPath: "inset(100% 0 0 0)", opacity: 1, offset: 0 },
          { clipPath: "inset(0 0 0 0)", opacity: 1, offset: 0.3 },
          { clipPath: "inset(0 0 0 0)", opacity: 1, offset: 0.94 },
          { clipPath: "inset(0 0 0 0)", opacity: 0, offset: 0.98 },
          { clipPath: "inset(100% 0 0 0)", opacity: 0, offset: 1 },
        ].map((frame) => ({ ...frame, easing: "ease-in-out" })),
        { duration: 2000, iterations: Infinity },
      );
    }

    updateAnimation();
    reducedMotion.addEventListener("change", updateAnimation);
    return () => {
      animation?.cancel();
      reducedMotion.removeEventListener("change", updateAnimation);
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0 align-middle", className)}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/images/reyna-g-logo.png"
        alt=""
        draggable={false}
        className="block h-full w-full select-none object-contain opacity-[0.22] grayscale"
      />
      <img
        ref={fillRef}
        src="/assets/images/reyna-g-logo.png"
        alt=""
        draggable={false}
        className="absolute inset-0 block h-full w-full select-none object-contain"
      />
    </span>
  );
}

export type LoadingScreenProps = {
  message?: string;
  description?: string;
  /** Page fills the content area; section fits a card; inline fits beside controls. */
  variant?: "page" | "section" | "inline";
  className?: string;
};

/** Mount only while the real request is pending; the caller owns data and errors. */
export default function LoadingScreen({
  message = "Loading...",
  description,
  variant = "section",
  className,
}: LoadingScreenProps) {
  const inline = variant === "inline";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "font-sans text-[#5c7b9f]",
        inline
          ? "inline-flex items-center gap-2 text-sm"
          : "flex w-full flex-col items-center justify-center gap-4 px-4 text-center",
        variant === "section" && "min-h-40 py-8",
        variant === "page" && "min-h-[60vh] py-12",
        className,
      )}
    >
      <LoadingLogo size={inline ? 28 : variant === "page" ? 144 : 96} />
      <div className="min-w-0">
        <p className={cn(!inline && "text-sm font-semibold text-[#0b4278]")}>
          {message}
        </p>
        {description && (
          <p className="mt-1 text-xs leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

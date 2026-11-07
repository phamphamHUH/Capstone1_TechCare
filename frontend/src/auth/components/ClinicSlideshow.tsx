import { useState, useEffect, useCallback } from "react";

interface SlideItem {
  src: string;
  title?: string;
  subtitle?: string;
}

const CLINIC_SLIDES: SlideItem[] = [
  {
    src: "/assets/images/clinic-reception.webp",
    title: "Reception & Waiting Area",
    subtitle: "Wait here or track your queue status on our website.",
  },
  {
    src: "/assets/images/clinic-extraction.webp",
    title: "Extraction & Triage Area",
    subtitle: "Where our staff perform procedures and collect specimens.",
  },
  {
    src: "/assets/images/clinic-consultation.webp",
    title: "Consultation Room",
    subtitle: "Meet your attending physician for check-ups and results.",
  },
  {
    src: "/assets/images/clinic-lab.webp",
    title: "Diagnostic Laboratory",
    subtitle: "Where your diagnostic tests are processed.",
  },
  {
    src: "/assets/images/clinic-xray.webp",
    title: "Radiology & Imaging",
    subtitle: "Imaging services for diagnosis.",
  },
  {
    src: "/assets/images/clinic-xray-room.webp",
    title: "X-Ray Facility",
    subtitle: "Our x-ray room and equipment.",
  },
];

interface ClinicSlideshowProps {
  slides?: SlideItem[];
  autoPlayInterval?: number;
}

function ClinicSlideshow({
  slides = CLINIC_SLIDES,
  autoPlayInterval = 6000,
}: ClinicSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (
      slides.length <= 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(nextSlide, autoPlayInterval);

    return () => clearInterval(timer);
  }, [nextSlide, autoPlayInterval, currentIndex, slides.length]);

  return (
    <div
      onClick={nextSlide}
      className="relative w-full h-full min-h-[480px] lg:min-h-[580px] rounded-md overflow-hidden bg-gray-900 select-none cursor-pointer"
    >
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none ${
              isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <img
              src={slide.src}
              alt={slide.title || `Clinic photo ${index + 1}`}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/75 to-transparent" />

            {(slide.title || slide.subtitle) && (
              <div className="absolute bottom-12 left-6 right-6 z-20 text-white">
                {slide.title && (
                  <h3 className="text-lg font-medium text-white">
                    {slide.title}
                  </h3>
                )}
                {slide.subtitle && (
                  <p className="mt-0.5 text-sm text-gray-200 line-clamp-2 max-w-md">
                    {slide.subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <div
          className="absolute bottom-5 left-0 right-0 z-30 flex justify-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`Go to slide ${idx + 1}`}
              aria-current={idx === currentIndex}
              className="cursor-pointer p-1"
            >
              <span
                className={`block h-1.5 w-1.5 rounded-full ${
                  idx === currentIndex
                    ? "bg-white"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ClinicSlideshow;

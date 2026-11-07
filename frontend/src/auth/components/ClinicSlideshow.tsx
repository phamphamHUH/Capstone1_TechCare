import { useEffect, useState } from "react";

const CLINIC_PHOTOS = [
  "/assets/images/clinic-reception.webp",
  "/assets/images/clinic-extraction.webp",
  "/assets/images/clinic-consultation.webp",
  "/assets/images/clinic-lab.webp",
  "/assets/images/clinic-xray.webp",
  "/assets/images/clinic-xray-room.webp",
];

const AUTO_PLAY_INTERVAL = 6000;

// Decorative page background for the login screen.
function ClinicSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CLINIC_PHOTOS.length);
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
    >
      {CLINIC_PHOTOS.map((src, index) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${
            index === currentIndex ? "opacity-70" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

export default ClinicSlideshow;

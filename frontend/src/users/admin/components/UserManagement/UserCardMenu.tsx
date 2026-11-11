import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

type Props = {
  onViewProfile: () => void;
  onEditDetails: () => void;
};

function UserCardMenu({ onViewProfile, onEditDetails }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the ... menu when clicking elsewhere
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const item = (label: string, action: () => void) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setMenuOpen(false);
        action();
      }}
      className="block w-full px-3 py-2 text-left hover:bg-gray-50"
    >
      {label}
    </button>
  );

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <MoreHorizontal size={18} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 top-7 z-10 w-36 overflow-hidden rounded-md border border-gray-200 bg-white text-xs shadow-lg">
          {item("View Profile", onViewProfile)}
          {item("Edit Details", onEditDetails)}
        </div>
      )}
    </div>
  );
}

export default UserCardMenu;

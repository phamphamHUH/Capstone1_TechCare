import { RotateCw } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

type HeaderProps = {
  page: string;
  loading: boolean;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  loadData: () => void | Promise<void>;
};

function Header({
  page,
  loading,
  open,
  setOpen,
  loadData,
}: HeaderProps) {
  const role = sessionStorage.getItem("role") ?? "";

  return (
    <header className="flex items-center justify-between h-24 gap-4 mb-6 px-6 border-b border-gray-300">
      <div className="flex items-center gap-5 min-w-0">
        <button
          type="button"
          onClick={() => setOpen((previous) => !previous)}
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          aria-expanded={open}
          className="text-2xl cursor-pointer hover:scale-105 active:scale-95"
        >
          ☰
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {page}
          </h1>
          <h2 className="text-sm text-gray-500 capitalize">
            {role}
          </h2>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void loadData()}
        disabled={loading}
        aria-label="Reload data"
        title="Reload data"
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-300 text-gray-600 cursor-pointer transition-colors hover:bg-gray-50 hover:text-sky-600 active:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RotateCw size={18} strokeWidth={1.75} className={loading ? "animate-spin" : ""} />
      </button>
    </header>
  );
}

export default Header;

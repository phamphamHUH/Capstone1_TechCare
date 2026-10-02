type SideBarProps = {
  open: boolean;
  page: string;
  setPage: (page: string) => void;
  navItems: { page: string; label: string; icon: React.ReactNode }[];
};

function SideBar({ open, page, setPage, navItems }: SideBarProps) {
  return (
    <aside
      className={`bg-white border-r border-gray-300 text-black h-screen overflow-hidden transition-all duration-300 ${
        open ? "w-64" : "w-0 p-0"
      }`}
    >
      {open && (
        <>
          <div className="flex items-center justify-start gap-2 h-24 border-b border-gray-300  px-2 mb-6">
            <img
              src="/assets/reyna-g-logo.png"
              alt="Logo"
              className="w-20 h-20 object-contain"
            />
            <div className="flex flex-col text-sky-400">
              <p className="font-extrabold text-2xl tracking-wide">Reyna G</p>
              <p className="font-bold text-xs tracking-wider">
                Diagnostic Laboratory
              </p>
            </div>
          </div>

          <nav className="flex flex-col px-5 gap-1">
            {navItems.map((item) => (
              <a
                key={item.page}
                className={`hover:scale-101 active:scale-100 active:bg-sky-200 active:text-sky-700 rounded-xl py-2 px-3 transition-all cursor-pointer ${
                  page === item.page ? "bg-sky-100 text-sky-600 " : ""
                }`}
                onClick={() => setPage(item.page)}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
              </a>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}

export default SideBar;

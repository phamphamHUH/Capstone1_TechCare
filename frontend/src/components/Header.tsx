import { Bell, LogOut } from "lucide-react";
import UserHeader from "./Header/UserHeader";
import api from "../lib/axios";

type HeaderProps = {
  page: string;
  loading: boolean;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => void;
};

function Header({ page, loading, open, setOpen, loadData }: HeaderProps) {
  const role = sessionStorage.getItem("role");
  const handleLogout = async () => {
    try {
      const user_id = JSON.parse(
        sessionStorage.getItem("user") || "{}",
      ).user_id;
      const result = await api.patch("/api/auth/logout", { user_id });
      console.log("LOGOUT RESULT:", result.data.message);
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="select-none flex items-center justify-between h-24 gap-4 mb-6 px-6 border-b border-gray-300">
      <div className="flex gap-5">
        <button
          onClick={() => setOpen(!open)}
          className="text-2xl cursor-pointer hover:scale-105 active:scale-95"
        >
          ☰
        </button>

        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">{page}</h1>
          <h2 className="text-gray-500">{role}</h2>
        </div>
      </div>

      <div className="flex gap-5 items-center">
        <div
          onClick={loadData}
          className="bg-sky-500 rounded-lg text-white py-2 px-4 cursor-pointer w-28 h-10 text-center transition-all hover:bg-sky-600 hover:scale-103 active:scale-100 active:bg-sky-700"
        >
          {loading ? "Loading..." : "Load Data"}
        </div>

        <button className="flex items-center border p-2 rounded-md text-gray-400 border-gray-300 cursor-pointer">
          <Bell size={20} strokeWidth={1} />
        </button>

        <UserHeader />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border border-red-300 text-red-700 px-3 py-2 rounded-md cursor-pointer transition-all duration-200 hover:bg-red-50 hover:scale-105 active:scale-95"
        >
          <LogOut size={18} strokeWidth={1.5} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Header;

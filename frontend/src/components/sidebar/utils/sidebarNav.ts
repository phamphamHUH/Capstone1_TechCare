import { createContext, useContext, type ReactNode } from "react";

export type NavItem = { page: string; label: string; icon: ReactNode };

export type SidebarNav = {
  navItems: NavItem[];
  page: string;
  setPage: (page: string) => void;
};

// Each role layout provides its nav items once; the SideBar shows them when
// open and the Header shows them when the sidebar is collapsed.
export const SidebarNavContext = createContext<SidebarNav | null>(null);

export const useSidebarNav = () => useContext(SidebarNavContext);

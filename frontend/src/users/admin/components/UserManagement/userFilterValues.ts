import type { User } from "../../../../interface/User";

export type StatusFilter = "all" | "active" | "inactive";

export type UserFilterValues = {
  role: string; // "all" or a role key
  department: string; // "all", "none" (unassigned), or a department name
  status: StatusFilter;
};

export const DEFAULT_USER_FILTERS: UserFilterValues = {
  role: "all",
  department: "all",
  status: "all",
};

export const isFiltered = (filters: UserFilterValues) =>
  filters.role !== "all" ||
  filters.department !== "all" ||
  filters.status !== "all";

export function matchesFilters(user: User, filters: UserFilterValues) {
  if (filters.role !== "all" && user.role !== filters.role) return false;
  if (filters.department === "none") {
    if (user.department) return false;
  } else if (
    filters.department !== "all" &&
    user.department !== filters.department
  ) {
    return false;
  }
  if (filters.status === "active" && !user.active) return false;
  if (filters.status === "inactive" && user.active) return false;
  return true;
}

export function matchesSearch(user: User, search: string) {
  const value = search.toLowerCase().trim();
  if (!value) return true;
  const fullName = [user.first_name, user.middle_name, user.last_name]
    .filter(Boolean)
    .join(" ");
  return [
    fullName,
    user.user_id,
    user.username,
    user.email,
    user.role,
    user.contact_number,
  ].some((field) => field?.toLowerCase().includes(value));
}

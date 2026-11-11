import { ChevronDown, X } from "lucide-react";
import { roleLabel } from "./userCardUtils";
import {
  DEFAULT_USER_FILTERS,
  isFiltered,
  type StatusFilter,
  type UserFilterValues,
} from "./userFilterValues";

type Props = {
  filters: UserFilterValues;
  setFilters: (filters: UserFilterValues) => void;
  roleOptions: string[];
  departmentOptions: string[];
  hasUnassignedDepartment: boolean;
};

const selectClass =
  "h-9 appearance-none rounded-md border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-600 outline-none focus:border-gray-500 cursor-pointer";

function FilterSelect({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectClass} ${value !== "all" ? "border-gray-500 text-gray-900" : ""}`}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
      />
    </label>
  );
}

function UserFilters({
  filters,
  setFilters,
  roleOptions,
  departmentOptions,
  hasUnassignedDepartment,
}: Props) {
  const update = (patch: Partial<UserFilterValues>) =>
    setFilters({ ...filters, ...patch });

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 px-4 sm:px-6">
      <FilterSelect
        label="Role"
        value={filters.role}
        onChange={(role) => update({ role })}
      >
        <option value="all">Role: All</option>
        {roleOptions.map((role) => (
          <option key={role} value={role}>
            {roleLabel(role)}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        label="Department"
        value={filters.department}
        onChange={(department) => update({ department })}
      >
        <option value="all">Department: All</option>
        {departmentOptions.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
        {hasUnassignedDepartment && <option value="none">Not assigned</option>}
      </FilterSelect>

      <FilterSelect
        label="Status"
        value={filters.status}
        onChange={(status) => update({ status: status as StatusFilter })}
      >
        <option value="all">Status: All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </FilterSelect>

      {isFiltered(filters) && (
        <button
          type="button"
          onClick={() => setFilters(DEFAULT_USER_FILTERS)}
          className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer"
        >
          <X size={14} />
          Clear filters
        </button>
      )}
    </div>
  );
}

export default UserFilters;

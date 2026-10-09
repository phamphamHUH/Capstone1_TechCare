import { ChevronDown, Search, Calendar } from "lucide-react";

type ActivityFiltersProps = {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  serviceFilter: string;
  setServiceFilter: (value: string) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
};

function HistoryFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  serviceFilter,
  setServiceFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}: ActivityFiltersProps) {
  return (
    <div className="mb-4 flex w-full flex-nowrap items-center gap-2 mt-5">
      <div className="relative min-w-40 flex-1">
        <Search
          size={17}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
        />
      </div>
      <label className="relative shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 min-w-25 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-8 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
        >
          <option value="all">All Status</option>
          <option value="requested">Requested</option>
          <option value="collected">Collected</option>
          <option value="waiting">Waiting</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="released">Released</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>
      <label className="relative shrink-0">
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="h-9 min-w-27.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-8 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
        >
          <option value="all">Service: All</option>
          <option value="consultation">Consultation</option>
          <option value="laboratory">Laboratory</option>
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>

      <label className="relative shrink-0">
        <input
          type="date"
          name="start-date"
          id="start-date"
          className="h-9 w-37.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20
          [&::-webkit-calendar-picker-indicator]:absolute
          [&::-webkit-calendar-picker-indicator]:inset-0
          [&::-webkit-calendar-picker-indicator]:h-full
          [&::-webkit-calendar-picker-indicator]:w-full
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
          [&::-webkit-calendar-picker-indicator]:opacity-0"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Calendar
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>

      <label className="relative shrink-0">
        <input
          type="date"
          name="end-date"
          id="end-date"
          className="h-9 w-37.5 appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 pr-9 text-sm text-gray-600 outline-none transition hover:border-gray-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20
          [&::-webkit-calendar-picker-indicator]:absolute
          [&::-webkit-calendar-picker-indicator]:inset-0
          [&::-webkit-calendar-picker-indicator]:h-full
          [&::-webkit-calendar-picker-indicator]:w-full
          [&::-webkit-calendar-picker-indicator]:cursor-pointer
          [&::-webkit-calendar-picker-indicator]:opacity-0"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <Calendar
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </label>
    </div>
  );
}

export default HistoryFilters;

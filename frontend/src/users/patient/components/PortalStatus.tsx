const colors: Record<string, string> = {
  released: "bg-green-100 text-green-700",
  "awaiting release": "bg-sky-100 text-sky-700",
  completed: "bg-sky-100 text-sky-700",
  serving: "bg-sky-100 text-sky-700",
  waiting: "bg-amber-100 text-amber-700",
  requested: "bg-amber-100 text-amber-700",
  skipped: "bg-orange-100 text-orange-700",
  "in progress": "bg-indigo-100 text-indigo-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PortalStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-medium capitalize ${colors[status.toLowerCase()] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

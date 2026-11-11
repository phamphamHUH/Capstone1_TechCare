import EmptyState from "../../../../components/EmptyState";
import type { Service } from "../../../../interface/Service";

// Services the clinic offers, per type: how many are active vs. turned off.
function ServiceSummary({
  services,
  loadFailed,
}: {
  services: Service[];
  loadFailed: boolean;
}) {
  const types = new Map<string, { active: number; inactive: number }>();
  for (const service of services) {
    const type = (service.service_type || "other").toLowerCase();
    const current = types.get(type) ?? { active: 0, inactive: 0 };
    if (service.active) current.active += 1;
    else current.inactive += 1;
    types.set(type, current);
  }

  if (types.size === 0) {
    return (
      <EmptyState
        compact
        message={loadFailed ? "Services are unavailable." : "No services yet."}
      />
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto overscroll-contain pr-1 space-y-3">
      {[...types.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, counts]) => (
          <li key={type} className="flex items-center justify-between gap-3 text-sm">
            <span className="capitalize text-gray-700">{type}</span>
            <span className="flex items-center gap-3 tabular-nums">
              <span className="text-gray-900">{counts.active} active</span>
              {counts.inactive > 0 && (
                <span className="text-gray-400">{counts.inactive} off</span>
              )}
            </span>
          </li>
        ))}
    </ul>
  );
}

export default ServiceSummary;

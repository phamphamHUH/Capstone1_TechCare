import { useEffect, useState } from "react";
import { FlaskRound } from "lucide-react";
import api from "../../../../lib/axios";
import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import { browserTimeZone } from "../../../../utils/formats";
import type { AnalyticsRange, DrugTestAnalytics } from "../../../../interface/Analytics";

// Times from analytics have no offset: they are already the viewer's local time.
const formatDate = (value: string, withTime = false) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

// Drug tests are billed at the front desk but never queued. The owner wants
// to see how many people took one each week, and who.
function DrugTestsReport({ range, periodLabel }: { range: AnalyticsRange; periodLabel: string }) {
  const [data, setData] = useState<DrugTestAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get<DrugTestAnalytics>("/api/admin/analytics/drug-tests", {
          params: { range, tz: browserTimeZone() },
        });
        if (!ignore) setData(response.data);
      } catch (loadError) {
        console.error("Error loading drug tests:", loadError);
        if (!ignore) setError("Drug tests could not be loaded. Use the reload button to try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [range]);

  return (
    <section className="min-w-0 overflow-hidden rounded-md border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-300 px-4 py-5 sm:px-6">
        <FlaskRound size={20} strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">Drug Tests</h2>
          <p className="mt-1 text-sm text-gray-500">
            Paid drug tests · {periodLabel}
          </p>
        </div>
        {loading ? (
          <LoadingSpinner size={18} />
        ) : (
          data && (
            <span className="text-2xl font-semibold tabular-nums">{data.total}</span>
          )
        )}
      </div>

      <div className="p-4 sm:p-6">
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {!error && data && data.total === 0 && (
          <EmptyState compact message="No drug tests in this period." />
        )}
        {!error && data && data.total > 0 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Count per week */}
            <div className="min-w-0">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Per week</h3>
              <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto overscroll-contain pr-1">
                {data.weeks.map((week) => (
                  <li key={week.week_start} className="flex justify-between gap-3 py-2 text-sm">
                    <span className="text-gray-700">Week of {formatDate(week.week_start)}</span>
                    <span className="font-semibold tabular-nums">{week.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Who took one */}
            <div className="min-w-0 lg:col-span-2">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Who</h3>
              <div className="max-h-80 overflow-auto overscroll-contain rounded-md border border-gray-200">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Patient</th>
                      <th className="px-3 py-2 font-medium">Test</th>
                      <th className="px-3 py-2 font-medium">Paid</th>
                      <th className="px-3 py-2 font-medium">Bill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.drug_tests.map((test) => (
                      <tr key={test.item_id} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">
                            {test.patient_name || "Unknown patient"}
                          </div>
                          <div className="text-xs text-gray-400">{test.patient_id}</div>
                        </td>
                        <td className="px-3 py-2 text-gray-700">{test.service_name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                          {formatDate(test.paid_at, true)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500">
                          {test.bill_id}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default DrugTestsReport;

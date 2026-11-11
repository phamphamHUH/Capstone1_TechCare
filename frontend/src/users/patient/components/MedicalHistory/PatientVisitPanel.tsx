import { useEffect, useState } from "react";
import { FlaskConical, MousePointerClick, Stethoscope } from "lucide-react";
import axios from "axios";
import EmptyState from "../../../../components/EmptyState";
import ErrorMessage from "../../../../components/ErrorMessage";
import LoadingScreen from "../../../../components/LoadingScreen";
import { fetchPatientVisit } from "../utils/patientApi";
import type { HistoryRecord, PatientVisitDetails } from "../../../../interface/PatientPortal";
import PortalStatus from "../PortalStatus";
import PatientLaboratoryPrint from "./PatientVisitPanel/PatientLaboratoryPrint";
import { reportComponents, toReportTemplate } from "../../../laboratory_staff/components/LaboratoryResults/utils/reportTemplates";

function ClinicalValue({ value }: { value: unknown }) {
  if (value == null || value === "" || (Array.isArray(value) && !value.length))
    return <span className="text-gray-400">Not recorded</span>;
  if (typeof value === "string") {
    if (value.trim().startsWith("[") || value.trim().startsWith("{")) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(value);
      } catch {
        /* Plain clinical text. */
      }
      if (parsed !== undefined) return <ClinicalValue value={parsed} />;
    }
    return <span className="whitespace-pre-wrap break-words">{value}</span>;
  }
  if (Array.isArray(value))
    return (
      <div className="space-y-2">
        {value.map((item, i) => (
          <ClinicalValue key={i} value={item} />
        ))}
      </div>
    );
  if (typeof value === "object") {
    const entries = Object.entries(value).filter(
      ([, v]) => v != null && v !== "",
    );
    if (
      entries.length === 1 &&
      ["chief_complaint", "diagnosis"].includes(entries[0][0])
    ) {
      return <ClinicalValue value={entries[0][1]} />;
    }
    if (!entries.length)
      return <span className="text-gray-400">Not recorded</span>;
    return (
      <dl className="space-y-2">
        {entries.map(([key, item]) => (
          <div key={key}>
            <dt className="text-xs capitalize text-gray-400">
              {key.replace(/_/g, " ")}
            </dt>
            <dd className="mt-0.5">
              <ClinicalValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

export function LaboratoryReportValue({ value }: { value: unknown }) {
  if (!Array.isArray(value))
    return <p className="text-gray-500">No test values recorded.</p>;
  const tests = value.filter(
    (test): test is Record<string, unknown> =>
      Boolean(test) && typeof test === "object",
  );
  if (!tests.length)
    return <p className="text-gray-500">No test values recorded.</p>;
  let labels = new Map<string, string>();
  const snapshot = tests.find((test) => test.template_snapshot)?.template_snapshot;
  if (snapshot) {
    try {
      const template = toReportTemplate(snapshot, []);
      labels = new Map(
        reportComponents(template).map((component) => [component.fieldKey, component.label]),
      );
    } catch {
      // Older results without a readable snapshot retain their stored names.
    }
  }
  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="w-full min-w-[440px] table-fixed border-collapse text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
          <tr>
            <th
              scope="col"
              className="w-[38%] border-b border-gray-200 px-3 py-2"
            >
              Test
            </th>
            <th
              scope="col"
              className="w-[27%] border-b border-gray-200 px-3 py-2"
            >
              Result
            </th>
            <th
              scope="col"
              className="w-[35%] border-b border-gray-200 px-3 py-2"
            >
              Reference
            </th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test, i) => (
            <tr key={i} className="even:bg-gray-50">
              <th
                scope="row"
                className="border-b border-gray-100 px-3 py-2 font-medium text-gray-800"
              >
                {String(
                  (typeof test.field_key === "string" ? labels.get(test.field_key) : undefined) ||
                  test.name || test.test || test.parameter || "Test " + (i + 1),
                )}
              </th>
              <td className="border-b border-gray-100 px-3 py-2">
                <ClinicalValue
                  value={test.result ?? test.value ?? test.result_value}
                />
                {typeof test.unit === "string" && test.unit && ` ${test.unit}`}
              </td>
              <td className="border-b border-gray-100 px-3 py-2 text-gray-600">
                {String(test.reference_range ?? test.referenceRange ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function PrescriptionSummary({ value }: { value: unknown }) {
  let items = value;
  if (typeof value === "string") {
    try {
      items = JSON.parse(value);
    } catch {
      /* Use the saved text. */
    }
  }
  if (!Array.isArray(items)) return <ClinicalValue value={items} />;
  if (!items.length)
    return <span className="text-gray-400">No medication items recorded.</span>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index}>
          {String(
            item.medication_name ||
              item.medicine_name ||
              item.medication ||
              item.name ||
              "Medication",
          )}
          {(item.dosage || item.dose) && (
            <span className="text-gray-500">
              {" "}
              — {String(item.dosage || item.dose)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function PatientVisitPanel({
  record,
  refreshKey,
  onPrescriptions,
}: {
  record: HistoryRecord | null;
  refreshKey: number;
  onPrescriptions: (consultationId?: string) => void;
}) {
  const [fetched, setFetched] = useState<{
    key: string;
    details?: PatientVisitDetails;
    error?: string;
  } | null>(null);
  const recordKey = record
    ? `${record.record_type}:${record.record_id}:${record.status}:${refreshKey}`
    : "";
  const recordType = record?.record_type;
  const recordId = record?.record_id;
  useEffect(() => {
    if (!recordType || !recordId) return;
    const controller = new AbortController();
    fetchPatientVisit(recordType, recordId, controller.signal)
      .then((details) => setFetched({ key: recordKey, details }))
      .catch((error) => {
        if (!axios.isCancel(error))
          setFetched({
            key: recordKey,
            error: "Visit details could not be loaded. Please try refreshing.",
          });
      });
    return () => controller.abort();
  }, [recordType, recordId, recordKey]);
  const current = fetched?.key === recordKey ? fetched : null;
  const details = current?.details;
  const isLab = record?.record_type === "laboratory";
  const Icon = isLab ? FlaskConical : Stethoscope;
  return (
    <aside className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Visit Details</h2>
        {record && (
          <PortalStatus status={details?.status ?? record.status} />
        )}
      </div>
      {!record ? (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-400">
          <MousePointerClick size={28} strokeWidth={1.5} />
          <EmptyState message="Select a record to view its details." />
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 border-b border-gray-100 py-4">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${isLab ? "bg-gray-100 text-gray-500" : "bg-sky-50 text-sky-500"}`}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">
                {record.service_name}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {record.service_category}
              </p>
            </div>
          </div>
          {!current ? (
            <LoadingScreen message="Loading visit details..." />
          ) : current.error ? (
            <ErrorMessage className="mt-4">{current.error}</ErrorMessage>
          ) : (
            details && (
              <>
                <dl className="space-y-3 border-b border-gray-100 py-4 text-xs">
                  {[
                    [
                      isLab ? "Laboratory ID" : "Consultation ID",
                      record.record_id,
                    ],
                    [
                      "Date & Time",
                      new Date(record.occurred_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                    ],
                    ["Requested By", details.requested_by],
                    ["Processed By", details.processed_by],
                    ["Room", details.room],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="shrink-0 text-gray-400">{label}</dt>
                      <dd className="min-w-0 break-words text-right font-medium text-gray-700">
                        {value || "Not recorded"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {isLab ? (
                  <section className="pt-4">
                    <h3 className="mb-3 text-sm font-bold">Released Results</h3>
                    {!details.results?.length ? (
                      <EmptyState
                        compact
                        message="No released result was returned for this record."
                      />
                    ) : (
                      details.results.map((result) => (
                        <div
                          key={result.result_id}
                          className="mb-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700"
                        >
                          <LaboratoryReportValue value={result.results} />
                          {result.remarks && (
                            <p className="border-t border-gray-200 pt-2">
                              {result.remarks}
                            </p>
                          )}
                          <PatientLaboratoryPrint resultId={result.result_id} />
                        </div>
                      ))
                    )}
                  </section>
                ) : (
                  <>
                    {[
                      ["Patient Vitals", details.vital_signs],
                      ["Chief Complaint", details.presenting_complaint],
                      ["Diagnosis", details.diagnosis],
                    ].map(([title, value]) => (
                      <section
                        key={String(title)}
                        className="border-b border-gray-100 py-4"
                      >
                        <h3 className="mb-2 text-sm font-bold">
                          {String(title)}
                        </h3>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                          <ClinicalValue value={value} />
                        </div>
                      </section>
                    ))}
                    <section className="border-b border-gray-100 py-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold">Prescription</h3>
                        <button
                          type="button"
                          onClick={() => onPrescriptions(record.record_id)}
                          className="cursor-pointer text-xs text-sky-600 underline underline-offset-2"
                        >
                          View full prescription
                        </button>
                      </div>
                      {!details.prescriptions?.length ? (
                        <p className="text-sm text-gray-400">
                          No prescription recorded.
                        </p>
                      ) : (
                        details.prescriptions.map((rx) => (
                          <div
                            key={rx.prescription_id}
                            className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"
                          >
                            <PrescriptionSummary
                              value={rx.prescription_items}
                            />
                          </div>
                        ))
                      )}
                    </section>
                    <section className="pt-4">
                      <h3 className="mb-2 text-sm font-bold">Doctor’s Notes</h3>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <ClinicalValue value={details.notes} />
                      </div>
                    </section>
                  </>
                )}
              </>
            )
          )}
        </>
      )}
    </aside>
  );
}

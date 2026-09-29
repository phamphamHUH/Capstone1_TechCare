import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FlaskConical, Search, Stethoscope } from "lucide-react";
import api from "../../../lib/axios";
import Header from "../../../components/Header";

type MedicalHistoryProps = {
  loadData: () => Promise<void>;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

type PatientRecord = {
  id: number;
  patient_id: string;
  username: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  suffix?: string | null;
  sex: string;
  email: string;
  address: string;
  contact_number: string;
  civil_status: string;
  blood_type?: string | null;
  birthdate: string;
  emergency_contact_name?: string | null;
  emergency_contact?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
};

type ConsultationRecord = {
  consultation_record_id: string;
  queue_id: string | null;
  findings: Record<string, string | null> | null;
  status: string;
  consulted_at: string;
  updated_at: string;
  doctor: {
    user_id: string | null;
    full_name: string;
    department: string | null;
    role: string | null;
  };
  visit: {
    queue_id: string | null;
    queue_number: number | null;
    is_priority: boolean | null;
    status: string | null;
    service: {
      service_id: string | null;
      service_name: string | null;
      service_type: string | null;
      room: string | null;
    };
  };
};

type LabResult = {
  result_id: string;
  lab_item_id: string;
  result_value: string;
  unit: string | null;
  reference_range: string | null;
  flag: string | null;
  remarks: string | null;
  verified_by: string | null;
  image_url: string | null;
  verified_at: string | null;
  created_at: string;
};

type LabItem = {
  lab_item_id: string;
  request_id: string;
  service_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  queue_id?: string | null;
  service_name: string;
  service_type: string;
  room: string;
  results: LabResult[];
};

type LabRequest = {
  request_id: string;
  consultation_record_id: string | null;
  doctor_id: string | null;
  status: string;
  is_paid: boolean;
  requested_at: string;
  updated_at: string;
  doctor: {
    user_id: string | null;
    full_name: string;
    department: string | null;
    role: string | null;
  };
  items: LabItem[];
};

type MedicalHistoryResponse = {
  patient: PatientRecord;
  consultations: ConsultationRecord[];
  labRequests: LabRequest[];
  summary: {
    consultations: number;
    labRequests: number;
    labItems: number;
  };
};

function MedicalHistory({
  loadData,
  open,
  setOpen,
  loading,
}: MedicalHistoryProps) {
  const [patientIdInput, setPatientIdInput] = useState("");
  const [activePatientId, setActivePatientId] = useState("");
  const [history, setHistory] = useState<MedicalHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const patientId = searchParams.get("patient_id") ?? "";

    setPatientIdInput(patientId);
    setActivePatientId(patientId);
  }, []);

  useEffect(() => {
    if (!activePatientId) {
      setHistory(null);
      setError(null);
      return;
    }

    const loadHistory = async () => {
      try {
        setHistoryLoading(true);
        setError(null);

        const response = await api.get<MedicalHistoryResponse>(
          `/api/fdstaff/patients/${activePatientId}/medical-history`,
        );

        setHistory(response.data);
      } catch (requestError) {
        console.error("Unable to load patient medical history:", requestError);
        setHistory(null);
        setError("Unable to load patient medical history.");
      } finally {
        setHistoryLoading(false);
      }
    };

    void loadHistory();
  }, [activePatientId]);

  const patientAge = useMemo(() => {
    if (!history?.patient.birthdate) {
      return null;
    }

    const birthdate = new Date(history.patient.birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const hasHadBirthdayThisYear =
      today.getMonth() > birthdate.getMonth() ||
      (today.getMonth() === birthdate.getMonth() &&
        today.getDate() >= birthdate.getDate());

    if (!hasHadBirthdayThisYear) {
      age -= 1;
    }

    return age;
  }, [history?.patient.birthdate]);

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getPatientName(patient: PatientRecord | undefined) {
    if (!patient) {
      return "Patient medical history";
    }

    return [
      patient.first_name,
      patient.middle_name,
      patient.last_name,
      patient.suffix,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextPatientId = patientIdInput.trim();
    setActivePatientId(nextPatientId);

    const url = new URL(window.location.href);
    if (nextPatientId) {
      url.searchParams.set("patient_id", nextPatientId);
    } else {
      url.searchParams.delete("patient_id");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  return (
    <main className="flex-1 min-w-0 bg-slate-50">
      <Header
        open={open}
        loading={loading}
        setOpen={setOpen}
        loadData={loadData}
        page="Medical History"
      />

      <div className="px-6 py-6 space-y-6">
        <form
          onSubmit={handleSearch}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Search patient history
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">
                Lookup consultations and laboratory records
              </h2>
              <p className="text-sm text-slate-600">
                Enter a patient ID to pull the full clinical timeline.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 md:w-[28rem] md:flex-row">
              <input
                value={patientIdInput}
                onChange={(event) => setPatientIdInput(event.target.value)}
                placeholder="P-26-0929-0001"
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-red-500"
              />
              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-800 px-5 text-sm font-semibold text-white transition hover:bg-red-900"
              >
                <Search size={18} />
                Load History
              </button>
            </div>
          </div>
        </form>

        {historyLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading medical history...
          </div>
        )}

        {error && !historyLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {history && !historyLoading && (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-900 px-6 py-8 text-white">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl font-semibold uppercase">
                      {history.patient.image_url ? (
                        <img
                          src={history.patient.image_url}
                          alt={getPatientName(history.patient)}
                          className="h-full w-full rounded-2xl object-cover"
                        />
                      ) : (
                        `${history.patient.first_name?.charAt(0) ?? ""}${history.patient.last_name?.charAt(0) ?? ""}`
                      )}
                    </div>

                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                        Patient profile
                      </p>
                      <h3 className="mt-2 text-3xl font-semibold">
                        {getPatientName(history.patient)}
                      </h3>
                      <p className="mt-2 text-sm text-white/80">
                        Patient ID {history.patient.patient_id}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-white/70">
                        Consultations
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {history.summary.consultations}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-white/70">
                        Lab requests
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {history.summary.labRequests}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs uppercase tracking-wide text-white/70">
                        Lab items
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {history.summary.labItems}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 px-6 py-6 lg:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Age</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {patientAge ?? "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Sex</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {history.patient.sex}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Blood type</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {history.patient.blood_type || "N/A"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 lg:col-span-2">
                  <p className="text-sm text-slate-500">Contact</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {history.patient.contact_number}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 break-all">
                    {history.patient.email}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Birthdate</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatDate(history.patient.birthdate)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <Stethoscope size={18} className="text-red-800" />
                  <h4 className="text-lg font-semibold">Consultation history</h4>
                </div>

                <div className="mt-5 space-y-4">
                  {history.consultations.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No consultation records found for this patient.
                    </p>
                  ) : (
                    history.consultations.map((consultation) => (
                      <article
                        key={consultation.consultation_record_id}
                        className="rounded-2xl border border-slate-200 p-5 transition hover:border-red-200 hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {consultation.visit.service.service_name || "Consultation"}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {consultation.doctor.full_name || "Unassigned doctor"}
                              {consultation.doctor.department
                                ? ` • ${consultation.doctor.department}`
                                : ""}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                {formatDateTime(consultation.consulted_at)}
                              </span>
                              {consultation.visit.queue_number !== null && (
                                <span className="rounded-full bg-slate-100 px-3 py-1">
                                  Queue #{consultation.visit.queue_number}
                                </span>
                              )}
                              {consultation.visit.service.service_type && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                                  {consultation.visit.service.service_type}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                            {consultation.status}
                          </span>
                        </div>

                        {consultation.findings && (
                          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                            {Object.entries(consultation.findings).map(([label, value]) =>
                              value ? (
                                <div
                                  key={`${consultation.consultation_record_id}-${label}`}
                                  className="rounded-xl bg-slate-50 p-3"
                                >
                                  <dt className="text-xs uppercase tracking-wide text-slate-500">
                                    {label.replace(/_/g, " ")}
                                  </dt>
                                  <dd className="mt-1 text-sm font-medium text-slate-900">
                                    {value}
                                  </dd>
                                </div>
                              ) : null,
                            )}
                          </dl>
                        )}
                      </article>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-slate-900">
                  <FlaskConical size={18} className="text-red-800" />
                  <h4 className="text-lg font-semibold">Laboratory requests</h4>
                </div>

                <div className="mt-5 space-y-4">
                  {history.labRequests.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                      No laboratory requests found for this patient.
                    </p>
                  ) : (
                    history.labRequests.map((request) => (
                      <article
                        key={request.request_id}
                        className="rounded-2xl border border-slate-200 p-5 transition hover:border-red-200 hover:shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Laboratory request {request.request_id}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {request.doctor.full_name || "Unassigned doctor"}
                              {request.doctor.department
                                ? ` • ${request.doctor.department}`
                                : ""}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                              <span className="rounded-full bg-slate-100 px-3 py-1">
                                <CalendarDays size={12} className="mr-1 inline-block" />
                                {formatDateTime(request.requested_at)}
                              </span>
                              <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                                {request.is_paid ? "Paid" : "Unpaid"}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                            {request.status}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {request.items.length === 0 ? (
                            <p className="text-sm text-slate-500">
                              No lab items were attached to this request.
                            </p>
                          ) : (
                            request.items.map((item) => (
                              <div
                                key={item.lab_item_id}
                                className="rounded-2xl bg-slate-50 p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {item.service_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Item {item.lab_item_id}
                                    </p>
                                  </div>
                                  <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                    {item.status}
                                  </span>
                                </div>

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <p className="text-xs text-slate-500">
                                    Requested: {formatDateTime(item.created_at)}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    Updated: {formatDateTime(item.updated_at)}
                                  </p>
                                </div>

                                {item.results.length > 0 && (
                                  <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                                    {item.results.map((result) => (
                                      <div
                                        key={result.result_id}
                                        className="rounded-xl bg-white p-3"
                                      >
                                        <p className="text-sm font-medium text-slate-900">
                                          {result.result_value}
                                          {result.unit ? ` ${result.unit}` : ""}
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                          {result.reference_range && (
                                            <span>{result.reference_range}</span>
                                          )}
                                          {result.flag && <span>Flag: {result.flag}</span>}
                                          {result.verified_by && (
                                            <span>Verified by {result.verified_by}</span>
                                          )}
                                        </div>
                                        {result.remarks && (
                                          <p className="mt-2 text-xs text-slate-600">
                                            {result.remarks}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {!history && !historyLoading && !error && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Enter a patient ID to view medical history.
          </div>
        )}
      </div>
    </main>
  );
}

export default MedicalHistory;

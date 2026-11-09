import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid,
  UserPlus,
  Users,
  ListOrdered,
  Syringe,
  Receipt,
} from "lucide-react";
import api from "../../lib/axios";
import SideBar from "../../components/SideBar";
import Billing from "./pages/Billing";
import FrontdeskDashboard from "./pages/FrontdeskDashboard";
import PatientRecords from "./pages/PatientRecords";
import PatientRegistration from "./pages/PatientRegistration";
import ServiceRequest from "./pages/ServiceRequest";
import Header from "../../components/Header";
import Queues from "./pages/Queues";
import type { QueueEntry, QueueRequests } from "../../interface/Queue";
import type { Bill } from "../../interface/Billing";
import type { Service } from "../../interface/Service";
import MedicalHistory from "./pages/MedicalHistory";
import type { Patient } from "../../interface/Patient";

function FrontdeskStaff() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [queueRequests, setQueueRequests] = useState<QueueRequests[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const latestLoad = useRef(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient_id");

  const page = searchParams.get("page") ?? "dashboard";

  function setPage(newPage: string) {
    if (newPage === page) return;
    setSearchParams({ page: newPage });
  }

  const loadData = useCallback(async () => {
    // Only the newest refresh may update state, so a slow response cannot overwrite a newer one.
    const load = ++latestLoad.current;
    setLoading(true);
    const sources = [
      {
        url: "/api/fdstaff/services",
        key: "services",
        label: "services",
        set: setServices,
      },
      {
        url: "/api/fdstaff/patients",
        key: "patients",
        label: "patients",
        set: setPatients,
      },
      {
        url: "/api/fdstaff/queues",
        key: "queueEntries",
        label: "queues",
        set: setQueues,
      },
      {
        url: "/api/fdstaff/queue-requests",
        key: "requests",
        label: "queue requests",
        set: setQueueRequests,
      },
      {
        url: "/api/fdstaff/billings",
        key: "bills",
        label: "bills",
        set: setBills,
      },
    ];
    const responses = await Promise.allSettled(
      sources.map((source) => api.get(source.url)),
    );
    if (load !== latestLoad.current) return;
    const failed: string[] = [];
    responses.forEach((response, index) => {
      const source = sources[index];
      if (
        response.status === "fulfilled" &&
        Array.isArray(response.value.data?.[source.key])
      ) {
        source.set(response.value.data[source.key]);
      } else failed.push(source.label);
    });
    setFailedSources(failed);
    setLoading(false);
  }, []);

  // Each page receives only the failures for the data it actually uses.
  const billingError = failedSources.includes("bills")
    ? "Bills could not be loaded."
    : "";
  const patientError = failedSources.includes("patients")
    ? "Patient records could not be loaded."
    : "";
  const serviceError = failedSources.includes("services")
    ? "Available services could not be loaded."
    : "";
  const queueError = [
    failedSources.includes("queues") && "Queue entries could not be loaded.",
    failedSources.includes("queue requests") &&
      "Pending service requests could not be loaded.",
  ]
    .filter(Boolean)
    .join(" ");
  const dashboardError = [
    failedSources.includes("patients") &&
      "Patient registration totals could not be loaded.",
    failedSources.includes("bills") &&
      "Pending bill totals could not be loaded.",
    failedSources.includes("queues") && "Queue statistics could not be loaded.",
  ]
    .filter(Boolean)
    .join(" ");

  const navItems = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: <LayoutGrid size={20} />,
    },
    {
      page: "patient-registration",
      label: "Patient Registration",
      icon: <UserPlus size={20} />,
    },
    {
      page: "patient-records",
      label: "Patient Records",
      icon: <Users size={20} />,
    },
    {
      page: "service-request",
      label: "Service Request",
      icon: <Syringe size={20} />,
    },
    {
      page: "queues",
      label: "Queues",
      icon: <ListOrdered size={20} />,
    },
    {
      page: "billing",
      label: "Billing",
      icon: <Receipt size={20} />,
    },
  ];
  const currentPage =
    navItems.find((item) => item.page === page)?.label ?? "Dashboard";

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  return (
    <div className="flex min-h-screen">
      <SideBar open={open} page={page} setPage={setPage} navItems={navItems} />
      <div className="flex-1 min-w-0">
        <Header
          page={currentPage}
          loading={loading}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
        />

        <div className="pb-6">
          {page === "dashboard" && (
            <FrontdeskDashboard
              error={dashboardError}
              patients={patients}
              bills={bills}
              queues={queues}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
              setPage={setPage}
            />
          )}

          {page === "patient-registration" && (
            <PatientRegistration
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}

          {page === "patient-records" && (
            <PatientRecords
              error={patientError}
              patients={patients}
              loadFailed={failedSources.includes("patients")}
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}

          {page === "queues" && (
            <Queues
              error={queueError}
              loadFailed={failedSources.includes("queues")}
              queues={queues}
              queueRequests={queueRequests}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}

          {page === "service-request" && (
            <ServiceRequest
              error={serviceError}
              services={services}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
              setPage={setPage}
            />
          )}

          {page === "billing" && (
            <Billing
              bills={bills}
              loading={loading}
              error={billingError}
              loadData={loadData}
            />
          )}

          {page === "patient-medical-history" && (
            <MedicalHistory
              error={patientError ? "Patient details could not be loaded." : ""}
              open={open}
              patients={patients}
              selectedPatient={patientIdParam}
              loadFailed={failedSources.includes("patients")}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FrontdeskStaff;

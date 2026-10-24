import { useCallback, useEffect, useState } from "react";
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
import type { QueueRequests } from "../../interface/Queue";
import type { UnpaidRequests } from "../../interface/Billing";
import MedicalHistory from "./pages/MedicalHistory";
import type { Patient } from "../../interface/Patient";
import "./frontdesk.css";

function FrontdeskStaff() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState([]);
  const [billing] = useState([]);
  const [queues, setQueues] = useState([]);
  const [queueRequests, setQueueRequests] = useState<QueueRequests[]>([]);
  const [unpaidRequests, setUnpaidRequests] = useState<UnpaidRequests[]>([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 1024);
  const [loadError, setLoadError] = useState("");

  const [searchParams, setSearchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient_id");

  const page = searchParams.get("page") ?? "dashboard"; // this  looks at the URL
  // "Look at the URL and check if there is a page value.
  // If there is one, use it. If there is no page value, use dashboard as the default."

  // searchParams.get("page")       // Get the value of "page"
  // searchParams.has("page")       // Check if "page" exists
  // searchParams.set("page", "billing") // Set a value (used internally)
  // searchParams.delete("page")    // Remove a parameter
  // searchParams.entries()         // Get all key-value pairs

  function setPage(newPage: string) {
    setSearchParams({ page: newPage });
  }
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const sources = [
        { url: "/api/fdstaff/services", key: "services", label: "services", set: setServices },
        { url: "/api/fdstaff/patients", key: "patients", label: "patients", set: setPatients },
        { url: "/api/fdstaff/queues", key: "queueEntries", label: "queues", set: setQueues },
        { url: "/api/fdstaff/queue-requests", key: "requests", label: "queue requests", set: setQueueRequests },
        { url: "/api/fdstaff/billing/unpaid-lab", key: "unpaidLabRequests", label: "billing requests", set: setUnpaidRequests },
      ];
      const responses = await Promise.allSettled(sources.map((source) => api.get(source.url)));
      const failed: string[] = [];
      responses.forEach((response, index) => {
        const source = sources[index];
        if (response.status === "fulfilled" && Array.isArray(response.value.data?.[source.key])) {
          source.set(response.value.data[source.key]);
        } else failed.push(source.label);
      });
      if (failed.length) setLoadError(`Could not refresh ${failed.join(", ")}. Use Load Data to try again.`);
    } catch (error) {
      console.log("Error fetching queue entries data:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  
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
    navItems.find((item) => item.page === page)?.label ??
    "Dashboard";

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  useEffect(() => {
    const viewport = window.matchMedia("(min-width: 1024px)");
    const closeMobileNavigation = (event: MediaQueryListEvent) => {
      if (!event.matches) setOpen(false);
    };
    viewport.addEventListener("change", closeMobileNavigation);
    return () => viewport.removeEventListener("change", closeMobileNavigation);
  }, []);

  return (
    <div className="frontdesk-shell flex min-h-screen">
      {open && <button type="button" className="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <SideBar
        open={open}
        page={page}
        setPage={setPage} 
        navItems={navItems}
      />
      <div className="frontdesk-workspace">
        <Header
          page={currentPage}
          loading={loading}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
        />

        <div className="pb-6">
          {loadError && <p role="alert" className="mx-6 mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-base text-amber-900">{loadError}</p>}
          {page === "dashboard" && (
            <FrontdeskDashboard
              patients={patients}
              billing={billing}
              queues={queues}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
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
              patients={patients}
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
              services={services}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}

          {page === "billing" && (
            <Billing
              unpaidRequests={unpaidRequests}
              queueRequests={queueRequests}
              patients={patients}
              services={services}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              loading={loading}
            />
          )}

          {page === "patient-medical-history" && (
            <MedicalHistory
              open={open}
              patients={patients}
              selectedPatient={patientIdParam}
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

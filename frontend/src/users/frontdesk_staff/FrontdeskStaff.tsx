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
import QueueManagement from "./pages/QueueManagement";
import PatientMedicalHistory from "./pages/PatientMedicalHistory";
import ServiceRequest from "./pages/ServiceRequest";

function FrontdeskStaff() {
  const [patients, setPatients] = useState([]);
  const [billing] = useState([]);
  const [queues, setQueues] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();

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
      const serviceResponse = await api.get("/api/fdstaff/services");
      const patientsResponse = await api.get("/api/fdstaff/patients");
      const queuesResponse = await api.get("/api/fdstaff/queues");

      setServices(serviceResponse.data.services);
      setPatients(patientsResponse.data.patients);
      setQueues(queuesResponse.data.queueEntries);
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
      page: "queue-management",
      label: "Queue Management",
      icon: <ListOrdered size={20} />,
    },
    {
      page: "billing",
      label: "Billing",
      icon: <Receipt size={20} />,
    },
  ];

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  return (
    <div className="flex min-h-screen">
      <SideBar open={open} page={page} setPage={setPage} navItems={navItems} />

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
          open={open}
          setOpen={setOpen}
          loadData={loadData}
          loading={loading}
        />
      )}

      {page === "queue-management" && (
        <QueueManagement
          patients={patients}
          services={services}
          queues={queues}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
          loading={loading}
        />
      )}

      {page === "service-request" && (
        <ServiceRequest
          open={open}
          setOpen={setOpen}
          loadData={loadData}
          loading={loading}
        />
      )}

      {page === "billing" && (
        <Billing
          billing={billing}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
          loading={loading}
        />
      )}

      {page === "patient-medical-history" && (
        <PatientMedicalHistory
          open={open}
          setOpen={setOpen}
          loadData={loadData}
          loading={loading}
        />
      )}
    </div>
  );
}

export default FrontdeskStaff;

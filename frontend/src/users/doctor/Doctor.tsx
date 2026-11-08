import SideBar from "#components/SideBar";
import Header from "#components/Header";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutGrid,
  ListOrdered,
  FileText,
  FileClock,
  Stethoscope,
} from "lucide-react";
import { useSearchParams } from "react-router";
import DigitizedDocument from "./pages/DigitizedDocument";
import ConsultationQueue from "./pages/ConsultationQueue";
import MedicalHistory from "./pages/MedicalHistory";
import LaboratoryRequest from "./pages/LaboratoryRequest";
import DoctorDashboard from "./pages/DoctorDashboard";
import Consultation from "./pages/Consultation";
import type { Service } from "../../interface/Service";
import type { QueueEntry } from "../../interface/Queue";
import api from "#lib/axios";
import ActiveConsultation from "./pages/ActiveConsultation";

function Doctor() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<QueueEntry | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const room = "Consultation Room";

  const page = searchParams.get("page") ?? "dashboard";

  function setPage(newPage: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", newPage);
      return next;
    });
  }

  const navItems = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: <LayoutGrid size={20} />,
    },
    {
      page: "consultation",
      label: "Consultation",
      icon: <Stethoscope size={20} />,
    },
    {
      page: "digitized-document",
      label: "Digitized Document",
      icon: <FileText size={20} />,
    },
    {
      page: "consultation-queue",
      label: "Consultation Queue",
      icon: <ListOrdered size={20} />,
    },
    {
      page: "active-consultation",
      label: "Active Consultation",
      icon: <Stethoscope size={20} />,
    },
    {
      page: "medical-history",
      label: "Medical History",
      icon: <FileClock size={20} />,
    },
    {
      page: "laboratory-request",
      label: "Laboratory Request",
      icon: <FileText size={20} />,
    },
  ];

  const currentPage =
    navItems.find((item) => item.page === page)?.label ?? "Dashboard";

  // FETCH SERVICES AND CONSULTATION QUEUES
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const servicesRes = await api.get(
        `/api/doctor/services/${encodeURIComponent(room)}`,
      );

      setServices(servicesRes.data?.services ?? []);

      const queuesRes = await api.get(
        `/api/doctor/consultation-queues/room/${encodeURIComponent(room)}`,
      );

      const fetchedQueues: QueueEntry[] = queuesRes.data?.queueEntries ?? [];

      setQueues(fetchedQueues);

      // RESTORE THE CURRENTLY SERVING CONSULTATION
      const servingQueue = fetchedQueues.find(
        (queue) => queue.status?.toLowerCase() === "serving",
      );

      setSelectedQueue(servingQueue ?? null);
    } catch (err) {
      console.error("Error loading doctor data:", err);
      setError("Could not load consultation data.");
    } finally {
      setLoading(false);
    }
  }, [room]);

  // FETCH DATA WHEN DOCTOR PAGE MOUNTS
  useEffect(() => {
    const initialize = async () => {
      await loadData();
    };

    void initialize();
  }, [loadData]);

  return (
    <div className="flex min-h-screen bg-gray-50">
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
          {page === "dashboard" && <DoctorDashboard />}

          {(page === "consultation" || page === "prescription") && (
            <Consultation
              loading={loading}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}

          {page === "digitized-document" && (
            <DigitizedDocument
              loading={loading}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}

          {page === "consultation-queue" && (
            <ConsultationQueue
              services={services}
              queues={queues}
              room={room}
              loading={loading}
              error={error}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
              setSelectedQueue={setSelectedQueue}
            />
          )}

          {page === "active-consultation" && (
            <ActiveConsultation selectedQueue={selectedQueue} room={room} />
          )}

          {page === "medical-history" && (
            <MedicalHistory
              loading={loading}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}

          {page === "laboratory-request" && (
            <LaboratoryRequest
              loading={loading}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Doctor;

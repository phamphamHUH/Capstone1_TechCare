import SideBar from "#components/SideBar";
import { SidebarNavContext } from "../../components/sidebar/utils/sidebarNav";
import Header from "#components/Header";
import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid, ListOrdered, FileText, Stethoscope } from "lucide-react";
import { useSearchParams } from "react-router";
import ConsultationQueue from "./pages/ConsultationQueue";
import MedicalHistory from "./pages/MedicalHistory";
import DoctorDashboard from "./pages/DoctorDashboard";
import type { Service } from "../../interface/Service";
import type { QueueEntry } from "../../interface/Queue";
import api from "#lib/axios";
import ActiveConsultation from "./pages/ActiveConsultation";
import TestRequest from "./pages/TestRequest";

function Doctor() {
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueLoadFailed, setQueueLoadFailed] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [roomServices, setRoomServices] = useState<Service[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const latestLoad = useRef(0);
  const [selectedQueue, setSelectedQueue] = useState<QueueEntry | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [findingsSavedForRecord, setFindingsSavedForRecord] = useState<
    string | null
  >(null);
  const [overviewStep, setOverviewStep] = useState<
    "findings" | "prescription" | "preview"
  >("findings");

  const findingsSaved =
    findingsSavedForRecord === selectedQueue?.consultation_record_id;

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
      page: "test-request",
      label: "Test Request",
      icon: <FileText size={20} />,
    },
  ];

  const currentPage =
    navItems.find((item) => item.page === page)?.label ?? "Dashboard";

  const loadData = useCallback(async () => {
    const request = ++latestLoad.current;

    setLoading(true);
    setError(null);

    const [roomServicesRes, servicesRes, queuesRes] = await Promise.allSettled([
      api.get(`/api/doctor/services/${encodeURIComponent(room)}`),
      api.get("/api/doctor/services"),
      api.get(
        `/api/doctor/consultation-queues/room/${encodeURIComponent(room)}`,
      ),
    ]);

    if (request !== latestLoad.current) return;

    const errors: string[] = [];

    if (
      roomServicesRes.status === "fulfilled" &&
      Array.isArray(roomServicesRes.value.data?.services)
    ) {
      setRoomServices(roomServicesRes.value.data.services);
    } else {
      errors.push("Room services could not be loaded.");
    }

    if (
      servicesRes.status === "fulfilled" &&
      Array.isArray(servicesRes.value.data?.services)
    ) {
      setServices([
        ...(servicesRes.value.data.services ?? []),
        ...(servicesRes.value.data.packages ?? []),
      ]);
    } else {
      errors.push("Consultation services could not be loaded.");
    }

    const queuesLoaded =
      queuesRes.status === "fulfilled" &&
      Array.isArray(queuesRes.value.data?.queueEntries);

    setQueueLoadFailed(!queuesLoaded);

    if (queuesLoaded) {
      const fetchedQueues: QueueEntry[] = queuesRes.value.data.queueEntries;

      setQueues(fetchedQueues);

      setSelectedQueue(
        fetchedQueues.find(
          (queue) => queue.status?.toLowerCase() === "serving",
        ) ?? null,
      );
    } else {
      errors.push("Consultation queue entries could not be loaded.");
    }

    setError(errors.join(" ") || null);
    setLoading(false);
  }, [room]);

  useEffect(() => {
    const initialize = async () => {
      await loadData();
    };

    void initialize();
  }, [loadData]);

  const handleCompleted = useCallback(async () => {
    setFindingsSavedForRecord(null);
    setOverviewStep("findings");

    await loadData();
  }, [loadData]);

  return (
    <SidebarNavContext.Provider value={{ navItems, page, setPage }}>
      <div className="flex min-h-screen ">
        <SideBar open={open} setOpen={setOpen} page={page} setPage={setPage} navItems={navItems} />

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

            {page === "consultation-queue" && (
              <ConsultationQueue
                services={roomServices}
                queues={queues}
                room={room}
                loading={loading}
                error={error}
                queueLoadFailed={queueLoadFailed}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
                setSelectedQueue={setSelectedQueue}
              />
            )}

            {page === "active-consultation" && (
              <ActiveConsultation
                selectedQueue={selectedQueue}
                setSelectedQueue={setSelectedQueue}
                room={room}
                loading={loading}
                error={
                  queueLoadFailed
                    ? "The active consultation could not be refreshed."
                    : null
                }
                findingsSaved={findingsSaved}
                setFindingsSavedForRecord={setFindingsSavedForRecord}
                overviewStep={overviewStep}
                setOverviewStep={setOverviewStep}
                onCompleted={handleCompleted}
              />
            )}

            {page === "medical-history" && (
              <MedicalHistory
                loading={loading}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
              />
            )}

            {page === "test-request" && (
              <TestRequest
                services={services}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
                loading={loading}
                setPage={setPage}
                selectedQueue={selectedQueue}
              />
            )}
          </div>
        </div>
      </div>
    </SidebarNavContext.Provider>
  );
}

export default Doctor;

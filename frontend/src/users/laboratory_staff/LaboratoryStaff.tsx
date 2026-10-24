import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid, ClipboardList, FileCheck } from "lucide-react";
import api from "../../lib/axios";
import LaboratoryRequests from "./pages/LaboratoryRequests";
import SideBar from "../../components/SideBar";
import { useSearchParams } from "react-router";
import LabstaffDashboard from "./pages/LabstaffDashboard";
import LaboratoryResults from "./pages/LaboratoryResults";
import type { QueueEntry } from "../../interface/Queue";
import type { Service } from "../../interface/Service";

function LaboratoryStaff() {
  const [open, setOpen] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [requestItems, setRequestItems] = useState<Request[]>([]);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef(false);

  const page = searchParams.get("page") ?? "dashboard";
  function setPage(newPage: string) {
    setSearchParams({ page: newPage });
  }

  const room = "Laboratory Room 2";

  const loadData = useCallback(async (background = false) => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (!background) setLoading(true);
    setError(null);

    try {
      const queueResponse = await api.get(
        `/api/labstaff/laboratory-queues/room/${room}`,
      );
      const serviceResponse = await api.get(`/api/labstaff/services/${room}`);
      setQueues(queueResponse.data ?? []);
      setServices(serviceResponse.data ?? []);
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Unable to fetch data.";
      setError(message);
      if (!background) {
        setQueues([]);
        setServices([]);
      }
    } finally {
      refreshing.current = false;
      if (!background) setLoading(false);
    }
  }, []);
  const navItems = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: <LayoutGrid size={20} />,
    },
    {
      page: "laboratory-requests",
      label: "Laboratory Requests",
      icon: <ClipboardList size={20} />,
    },
    {
      page: "laboratory-results",
      label: "Laboratory Results",
      icon: <FileCheck size={20} />,
    },
  ];

  useEffect(() => {
    // Laboratory Results loads its own accepted, sample-collected requests.
    if (page === "laboratory-results") return;
    (async () => {
      await loadData();
    })();
  }, [loadData, page]);

  useEffect(() => {
    if (page !== "laboratory-requests") return;
    const refresh = () => { if (document.visibilityState === "visible") void loadData(true); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(timer);
    };
  }, [loadData, page]);

  return (
    <div className="flex min-h-screen cursor-default">
      <SideBar open={open} page={page} setPage={setPage} navItems={navItems} />
      {page === "dashboard" && (
        <LabstaffDashboard
          open={open}
          setOpen={setOpen}
          loading={loading}
          loadData={() => loadData()}
        />
      )}

      {page === "laboratory-requests" && (
        <LaboratoryRequests
          open={open}
          setOpen={setOpen}
          queues={queues}
          services={services}
          loading={loading}
          error={error}
          loadData={() => loadData()}
          room={room}
        />
      )}

      {page === "laboratory-results" && (
        <LaboratoryResults
          open={open}
          setOpen={setOpen}
          room={room}
        />
      )}
    </div>
  );
}

export default LaboratoryStaff;

import { useCallback, useEffect, useRef, useState } from "react";
import { LayoutGrid, ClipboardList, FileCheck } from "lucide-react";
import api from "../../lib/axios";
import LaboratoryRequests from "./pages/LaboratoryRequests";
import SideBar from "../../components/SideBar";
import ConfirmDialog from "../../components/ConfirmDialog";
import { SidebarNavContext } from "../../components/sidebar/utils/sidebarNav";
import { useSearchParams } from "react-router";
import LabstaffDashboard from "./pages/LabstaffDashboard";
import LaboratoryResults from "./pages/LaboratoryResults";
import type { QueueEntry } from "../../interface/Queue";
import type { Service } from "../../interface/Service";

function LaboratoryStaff() {
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueLoadFailed, setQueueLoadFailed] = useState(false);
  const refreshing = useRef(false);

  const page = searchParams.get("page") ?? "dashboard";
  // Unsaved laboratory result entry: ask before leaving the page.
  const [unsavedResult, setUnsavedResult] = useState(false);
  const [pendingPage, setPendingPage] = useState<string | null>(null);

  function setPage(newPage: string) {
    if (newPage !== page && page === "laboratory-results" && unsavedResult) {
      setPendingPage(newPage);
      return;
    }
    setSearchParams({ page: newPage });
  }

  // Each lab staff member's room is the department on their account.
  const room: string =
    JSON.parse(sessionStorage.getItem("user") || "{}").department ||
    "Laboratory Room 2";

  const loadData = useCallback(
    async (background = false) => {
      if (refreshing.current) return;
      refreshing.current = true;
      if (!background) setLoading(true);
      try {
        const [queueResponse, serviceResponse] = await Promise.allSettled([
          api.get(
            `/api/labstaff/laboratory-queues/room/${encodeURIComponent(room)}`,
          ),
          api.get(`/api/labstaff/services/${encodeURIComponent(room)}`),
        ]);
        const errors: string[] = [];
        const queuesLoaded =
          queueResponse.status === "fulfilled" &&
          Array.isArray(queueResponse.value.data);
        setQueueLoadFailed(!queuesLoaded);
        if (queuesLoaded) {
          setQueues(queueResponse.value.data);
        } else {
          errors.push("Laboratory queue entries could not be loaded.");
        }
        if (
          serviceResponse.status === "fulfilled" &&
          Array.isArray(serviceResponse.value.data)
        ) {
          setServices(serviceResponse.value.data);
        } else {
          errors.push("Laboratory services could not be loaded.");
        }
        setError(errors.join(" ") || null);
      } finally {
        refreshing.current = false;
        if (!background) setLoading(false);
      }
    },
    [room],
  );
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
    if (page === "laboratory-results") return;
    (async () => {
      await loadData();
    })();
  }, [loadData, page]);

  return (
    <SidebarNavContext.Provider value={{ navItems, page, setPage }}>
      <div className="flex min-h-screen cursor-default">
        <SideBar open={open} setOpen={setOpen} page={page} setPage={setPage} navItems={navItems} />
        {page === "dashboard" && (
          <LabstaffDashboard
            error={error}
            open={open}
            setOpen={setOpen}
            loading={loading}
            loadData={loadData}
            room={room}
            queues={queues}
            serviceCount={services.length}
            queueLoadFailed={queueLoadFailed}
            setPage={setPage}
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
            loadData={loadData}
            room={room}
            queueLoadFailed={queueLoadFailed}
          />
        )}

        {page === "laboratory-results" && (
          <LaboratoryResults
            open={open}
            setOpen={setOpen}
            room={room}
            onUnsavedChange={setUnsavedResult}
          />
        )}
      </div>

      {pendingPage && (
        <ConfirmDialog
          title="Leave result entry?"
          description="You have results that aren't saved yet. They're kept as a draft on this computer and will be restored when you open the request again."
          confirmLabel="Leave page"
          cancelLabel="Keep editing"
          tone="warning"
          onCancel={() => setPendingPage(null)}
          onConfirm={() => {
            setSearchParams({ page: pendingPage });
            setPendingPage(null);
          }}
        />
      )}
    </SidebarNavContext.Provider>
  );
}

export default LaboratoryStaff;

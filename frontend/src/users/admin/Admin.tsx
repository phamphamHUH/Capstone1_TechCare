import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import {
  LayoutGrid,
  Users,
  BadgeDollarSign,
  FileText,
  SquareActivity,
  Tv,
} from "lucide-react";

import SideBar from "../../components/SideBar";
import { SidebarNavContext } from "../../components/sidebar/sidebarNav";
import Header from "../../components/Header";

import UserManagement from "./pages/UserManagement";
import AdminDashboard from "./pages/AdminDashboard";
import ServicePricingManagement from "./pages/ServicePricing";
import ActivityMonitoring from "./pages/ActivityMonitoring";
import FormTemplate from "./pages/FormTemplate";
import QueueingMonitor from "./pages/QueueingMonitor";

import api from "../../lib/axios";

import type { User } from "../../interface/User";
import type { Service } from "../../interface/Service";
import { browserTimeZone } from "../../utils/formats";
import type { Activity } from "../../interface/Activity";
import type {
  AnalyticsRange,
  SalesAnalytics,
  ServiceAnalytics,
} from "../../interface/Analytics";

function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Dashboard analytics, reloaded whenever the date range changes.
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>("30d");
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(
    null,
  );
  const [serviceAnalytics, setServiceAnalytics] =
    useState<ServiceAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const latestAnalyticsRequest = useRef(0);

  const [loading, setLoading] = useState(true);
  const [dataErrors, setDataErrors] = useState({
    users: "",
    services: "",
    activities: "",
  });
  const [templateRefresh, setTemplateRefresh] = useState(0);
  const latestDataRequest = useRef(0);
  const [open, setOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("page") ?? "dashboard";

  function setPage(newPage: string) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
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
      page: "user-management",
      label: "User Management",
      icon: <Users size={20} />,
    },
    {
      page: "service-management",
      label: "Service Management",
      icon: <BadgeDollarSign size={20} />,
    },
    {
      page: "activity-monitoring",
      label: "Activity Monitoring",
      icon: <SquareActivity size={20} />,
    },
    {
      page: "form-template",
      label: "Form Template",
      icon: <FileText size={20} />,
    },
    {
      page: "queueing-monitor",
      label: "Queueing Monitor",
      icon: <Tv size={20} />,
    },
  ];

  const currentPage =
    navItems.find((item) => item.page === page)?.label ?? "Dashboard";

  const loadData = useCallback(async () => {
    const request = ++latestDataRequest.current;
    setLoading(true);
    const [serviceResponse, userResponse, activityResponse] =
      await Promise.allSettled([
        api.get("/api/admin/services"),
        api.get("/api/admin/users"),
        api.get("/api/admin/activities"),
      ]);
    if (request !== latestDataRequest.current) return;
    const errors = { users: "", services: "", activities: "" };

    if (
      serviceResponse.status === "fulfilled" &&
      Array.isArray(serviceResponse.value.data?.services) &&
      (serviceResponse.value.data.packages === undefined ||
        Array.isArray(serviceResponse.value.data.packages))
    ) {
      setServices([
        ...serviceResponse.value.data.services,
        ...(serviceResponse.value.data.packages ?? []),
      ]);
    } else {
      errors.services = "Services and packages could not be loaded.";
    }
    if (
      userResponse.status === "fulfilled" &&
      Array.isArray(userResponse.value.data?.users)
    ) {
      setUsers(userResponse.value.data.users);
    } else {
      errors.users = "User accounts could not be loaded.";
    }
    if (
      activityResponse.status === "fulfilled" &&
      Array.isArray(activityResponse.value.data?.activities)
    ) {
      setActivities(activityResponse.value.data.activities);
    } else {
      errors.activities = "Activity logs could not be loaded.";
    }
    setDataErrors(errors);
    setLoading(false);
  }, []);

  // Fetch the admin data when this component mounts.
  useEffect(() => {
    async function action() {
      await loadData();
    }
    action();
  }, [loadData]);

  const loadAnalytics = useCallback(async () => {
    // Ignore answers to older requests when the range is switched quickly.
    latestAnalyticsRequest.current += 1;
    const thisRequest = latestAnalyticsRequest.current;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const params = { range: analyticsRange, tz: browserTimeZone() };
      const [salesResponse, serviceResponse] = await Promise.all([
        api.get<SalesAnalytics>("/api/admin/analytics/sales", { params }),
        api.get<ServiceAnalytics>("/api/admin/analytics/services", { params }),
      ]);
      if (thisRequest !== latestAnalyticsRequest.current) return;

      setSalesAnalytics(salesResponse.data);
      setServiceAnalytics(serviceResponse.data);
    } catch (error) {
      if (thisRequest !== latestAnalyticsRequest.current) return;
      console.error("Error loading analytics:", error);
      setAnalyticsError(
        "Could not load analytics. Use the reload button to try again.",
      );
    } finally {
      if (thisRequest === latestAnalyticsRequest.current)
        setAnalyticsLoading(false);
    }
  }, [analyticsRange]);

  // Load analytics on mount and whenever the range changes.
  useEffect(() => {
    async function action() {
      await loadAnalytics();
    }
    action();
  }, [loadAnalytics]);

  // The header's reload button refreshes everything.
  const reloadAll = useCallback(async () => {
    if (page === "form-template") setTemplateRefresh((value) => value + 1);
    await Promise.all([loadData(), loadAnalytics()]);
  }, [loadData, loadAnalytics, page]);

  return (
    <SidebarNavContext.Provider value={{ navItems, page, setPage }}>
      <div className="flex min-h-screen bg-gray-50">
        <SideBar open={open} setOpen={setOpen} page={page} setPage={setPage} navItems={navItems} />

        <div className="flex-1 min-w-0">
          <Header
            page={currentPage}
            loading={loading || analyticsLoading}
            open={open}
            setOpen={setOpen}
            loadData={reloadAll}
          />

          <div className="pb-6">
            {page === "dashboard" && (
              <AdminDashboard
                range={analyticsRange}
                setRange={setAnalyticsRange}
                sales={salesAnalytics}
                services={serviceAnalytics}
                loading={analyticsLoading}
                error={analyticsError}
              />
            )}

            {page === "user-management" && (
              <UserManagement
                loading={loading}
                users={users}
                error={dataErrors.users}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
              />
            )}

            {page === "service-management" && (
              <ServicePricingManagement
                loading={loading}
                services={services}
                error={dataErrors.services}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
              />
            )}

            {page === "activity-monitoring" && (
              <ActivityMonitoring
                loading={loading}
                activities={activities}
                error={dataErrors.activities}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
              />
            )}
            {page === "queueing-monitor" && (
              <QueueingMonitor
                loading={loading}
                open={open}
                setOpen={setOpen}
                loadData={loadData}
              />
            )}

            {page === "form-template" && (
              <FormTemplate refreshKey={templateRefresh} />
            )}

            {!navItems.some((item) => item.page === page) && (
              <div className="mx-4 sm:mx-6 rounded-md border border-gray-200 bg-white p-4 sm:p-8 text-center">
                <h2 className="font-semibold text-gray-800">Page not found</h2>
                <button
                  type="button"
                  onClick={() => setPage("dashboard")}
                  className="mt-3 text-sm text-sky-600 hover:underline"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarNavContext.Provider>
  );
}

export default Admin;

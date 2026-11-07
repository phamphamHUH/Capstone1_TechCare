import { useCallback, useEffect, useState } from "react";
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
import type { Activity } from "../../interface/Activity";

function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

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
    setLoading(true);

    try {
      const [serviceResponse, userResponse, activityResponse] =
        await Promise.all([
          api.get("/api/admin/services"),
          api.get("/api/admin/users"),
          api.get("/api/admin/activities"),
        ]);

      setServices([
        ...(serviceResponse.data.services ?? []),
        ...(serviceResponse.data.packages ?? []),
      ]);
      setUsers(userResponse.data.users ?? []);
      setActivities(activityResponse.data.activities ?? []);
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch the admin data when this component mounts.
  useEffect(() => {
    async function action() {
      await loadData();
    }
    action();
  }, [loadData]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <SideBar open={open} page={page} setPage={setPage} navItems={navItems} />

      <div className="flex-1 min-w-0">
        {page !== "queueing-monitor" && (
          <Header
            page={currentPage}
            loading={loading}
            open={open}
            setOpen={setOpen}
            loadData={loadData}
          />
        )}
        {page === "queueing-monitor" && (
          <button onClick={() => setOpen(!open)} className="text-2xl">
            ☰
          </button>
        )}

        <div className="pb-6">
          {page === "dashboard" && <AdminDashboard users={users} />}

          {page === "user-management" && (
            <UserManagement
              loading={loading}
              users={users}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}

          {page === "service-management" && (
            <ServicePricingManagement
              loading={loading}
              services={services}
              open={open}
              setOpen={setOpen}
              loadData={loadData}
            />
          )}

          {page === "activity-monitoring" && (
            <ActivityMonitoring
              loading={loading}
              activities={activities}
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

          {page === "form-template" && <FormTemplate />}

          {!navItems.some((item) => item.page === page) && (
            <div className="mx-6 rounded-xl border border-gray-200 bg-white p-8 text-center">
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
  );
}

export default Admin;

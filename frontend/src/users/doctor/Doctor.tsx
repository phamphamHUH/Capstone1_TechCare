import SideBar from "#components/SideBar";
import React, { useCallback, useEffect, useState } from "react";
import { LayoutGrid, ListOrdered, FileText, FileClock, Stethoscope } from "lucide-react";
import { useSearchParams } from "react-router";
import DigitizedDocument from "./pages/DigitizedDocument";
import ConsultationQueue from "./pages/ConsultationQueue";
import MedicalHistory from "./pages/MedicalHistory";
import LaboratoryRequest from "./pages/LaboratoryRequest";
import DoctorDashboard from "./pages/DoctorDashboard";
import Consultation from "./pages/Consultation";
import api from "../../lib/axios";
import type { Service } from "../../interface/Service";

function Doctor() {
  const [, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = searchParams.get("page") ?? "dashboard";
  function setPage(newPage: string) {
    setSearchParams({ page: newPage });
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const serviceResponse = await api.get("/api/admin/services");

      setServices(serviceResponse.data.services);
      console.log("services data:", serviceResponse.data);
    } catch (error) {
      console.log("Error fetching services:", error);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, [loadData]);

  return (
    <div className="flex min-h-screen">
      <SideBar open={open} page={page} setPage={setPage} navItems={navItems} />
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
          loading={loading}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
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
      {page === "laboratory-request" && (
        <LaboratoryRequest
          loading={loading}
          open={open}
          setOpen={setOpen}
          loadData={loadData}
        />
      )}
    </div>
  );
}

export default Doctor;

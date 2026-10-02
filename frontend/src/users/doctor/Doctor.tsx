import SideBar from "#components/SideBar";
import { useCallback, useState } from "react";
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

function Doctor() {
  const [open, setOpen] = useState(true);
  const [loading] = useState(false);
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

  const loadData = useCallback(async () => {}, []);

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

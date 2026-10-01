import Header from "../../../components/Header";
import React, { useState } from "react";
import ServiceTypeTabs from "../components/ServiceRequest/ServiceTypeTabs";
import ServiceSelectionPanel from "../components/ServiceRequest/ServiceSelectionPanel";
import ServiceList from "../components/ServiceRequest/ServiceList";

type ServiceRequestProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

function ServiceRequest({
  loading,
  open,
  setOpen,
  loadData,
}: ServiceRequestProps) {
  const [activeTab, setActiveTab] = useState("Laboratory Services");
  return (
    <main className="flex-1 min-w-0">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Service Request"
      />
      <h1 className="text-2xl font-bold px-6">Select Service Type</h1>
      <ServiceTypeTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="border rounded-xl px-5 py-2 mt-5 mx-8 grid grid-cols-5">
        <div className="col-span-3">
          <ServiceSelectionPanel />
        </div>
        <div className="col-span-2">
          <ServiceList />
        </div>
      </div>
    </main>
  );
}

export default ServiceRequest;

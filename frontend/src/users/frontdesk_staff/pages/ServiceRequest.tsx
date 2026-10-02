import Header from "../../../components/Header";
import React, { useState } from "react";
import ServiceTypeTabs from "../components/ServiceRequest/ServiceTypeTabs";
import ServiceSelectionPanel from "../components/ServiceRequest/ServiceSelectionPanel";
import ServiceList from "../components/ServiceRequest/ServiceList";
import RequestFooter from "../components/ServiceRequest/RequestFooter";
import type { SortOrder, Service } from "../../../interface/Service";
import type { Patient } from "../../../interface/Patient";

type ServiceRequestProps = {
  services: Service[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

const PAGE_SIZE = 10;

function ServiceRequest({
  services,
  loading,
  open,
  setOpen,
  loadData,
}: ServiceRequestProps) {
  const [activeTab, setActiveTab] = useState("laboratory");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // FILTERS
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("a-z");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  // reset to page 1 whenever a filter changes (in handlers, not in an effect)
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };
  const handleSort = (value: SortOrder) => {
    setSort(value);
    setPage(1);
  };
  const handleCategory = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };
  const handleTab = (tab: string) => {
    setActiveTab(tab);
    setCategoryFilter("all");
    setPage(1);
  };

  // FILTER + SORT + PAGINATE
  const filtered = services
    .filter((s) => s.service_type.toLowerCase() === activeTab.toLowerCase())
    .filter(
      (s) => categoryFilter === "all" || s.service_category === categoryFilter,
    )
    .filter((s) => s.service_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "z-a"
        ? b.service_name.localeCompare(a.service_name)
        : a.service_name.localeCompare(b.service_name),
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const pagination = {
    page: currentPage,
    limit: PAGE_SIZE,
    total: filtered.length,
    total_pages: totalPages,
  };

  // categories for the active tab only
  const categoryOptions = Array.from(
    new Set(
      services
        .filter((q) => q.service_type.toLowerCase() === activeTab.toLowerCase())
        .map((q) => q.service_category),
    ),
  ).filter(Boolean);

  const isSingleSelect = activeTab === "consultation";

  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      if (prev.includes(serviceId)) {
        return prev.filter((id) => id !== serviceId);
      }
      return isSingleSelect ? [serviceId] : [...prev, serviceId];
    });
  };
  const clearServices = () => setSelectedServices([]);

  return (
    <main className="flex-1 min-w-0 pb-8">
      <Header
        loading={loading}
        open={open}
        setOpen={setOpen}
        loadData={loadData}
        page="Service Request"
      />
      <h1 className="text-2xl font-bold px-6">Select Service Type</h1>
      <ServiceTypeTabs
        activeTab={activeTab}
        setActiveTab={handleTab}
        onClearAll={clearServices}
      />
      <div className="border border-gray-200 rounded-xl mt-5 mx-8 grid grid-cols-5 min-h-7/12 shadow-lg">
        <div className="col-span-3 border-r border-gray-200 px-8 py-5 flex flex-col justify-between">
          <ServiceSelectionPanel
            services={pageItems}
            activeTab={activeTab}
            search={search}
            setSearch={handleSearch}
            sort={sort}
            setSort={handleSort}
            categoryFilter={categoryFilter}
            setCategoryFilter={handleCategory}
            categoryOptions={categoryOptions}
            onToggleService={toggleService}
            selectedServices={selectedServices}
            pagination={pagination}
            onPageChange={setPage}
          />
        </div>
        <div className="col-span-2 px-8 py-5 flex flex-col justify-between">
          <ServiceList
            activeTab={activeTab}
            services={services}
            selectedServices={selectedServices}
            patientId={patient?.patient_id ?? null}
            onToggleService={toggleService}
            onClearAll={clearServices}
            onSubmitted={() => setPatient(null)}
          />
        </div>
      </div>
      <RequestFooter patient={patient} onSelectPatient={setPatient} />
    </main>
  );
}

export default ServiceRequest;

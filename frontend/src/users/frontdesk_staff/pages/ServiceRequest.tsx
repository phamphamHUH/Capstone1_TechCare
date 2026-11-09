import LoadingScreen from "../../../components/LoadingScreen";
import ErrorMessage from "../../../components/ErrorMessage";
import React, { useState } from "react";
import ServiceTypeTabs from "../components/ServiceRequest/ServiceTypeTabs";
import ServiceSelectionPanel from "../components/ServiceRequest/ServiceSelectionPanel";
import ServiceList from "../components/ServiceRequest/ServiceList";
import PatientSelectionHeader from "../components/ServiceRequest/PatientSelectionHeader";
import type { SortOrder, Service } from "../../../interface/Service";
import type { Patient } from "../../../interface/Patient";

type ServiceRequestProps = {
  services: Service[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  setPage: (page: string) => void;
  error?: string;
};

const PAGE_SIZE = 10;

function ServiceRequest({
  services,
  loadData,
  setPage,
  loading,
  error,
}: ServiceRequestProps) {
  const [activeTab, setActiveTab] = useState("laboratory");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // FILTERS
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("a-z");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);

  // reset to page 1 whenever a filter changes (in handlers, not in an effect)
  const handleSearch = (value: string) => {
    setSearch(value);
    setPageNumber(1);
  };
  const handleSort = (value: SortOrder) => {
    setSort(value);
    setPageNumber(1);
  };
  const handleCategory = (value: string) => {
    setCategoryFilter(value);
    setPageNumber(1);
  };
  const handleTab = (tab: string) => {
    setActiveTab(tab);
    setCategoryFilter("all");
    setPageNumber(1);
  };

  // FILTER + SORT + PAGINATE
  const filtered = services
    .filter((s) => s.active)
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
  const currentPage = Math.min(pageNumber, totalPages);
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

  if (loading && services.length === 0) {
    return (
      <LoadingScreen variant="page" message="Loading available services..." />
    );
  }

  return (
    <main className="flex-1 min-w-0 pb-5">
      <h1 className="text-2xl font-bold px-6">Select Service Type</h1>
      {error && <ErrorMessage className="mx-6 mt-5">{error}</ErrorMessage>}
      <PatientSelectionHeader
        patient={patient}
        onSelectPatient={setPatient}
        onRegister={() => setPage("patient-registration")}
      />
      <ServiceTypeTabs
        activeTab={activeTab}
        setActiveTab={handleTab}
        onClearAll={clearServices}
      />
      <div className="border border-gray-200 rounded-xl mt-5 mx-8 grid grid-cols-5 min-h-7/12 shadow-lg">
        <div className="col-span-3 border-r border-gray-200 px-8 py-5 flex flex-col justify-between">
          <ServiceSelectionPanel
            services={pageItems}
            loadFailed={Boolean(error)}
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
            onPageChange={setPageNumber}
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
            onSubmitted={async () => {
              setPatient(null);
              await loadData();
            }}
          />
        </div>
      </div>
    </main>
  );
}

export default ServiceRequest;

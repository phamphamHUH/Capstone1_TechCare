import LoadingScreen from "../../../components/LoadingScreen";
import LoadingRegion from "../../../components/LoadingRegion";
import ErrorMessage from "../../../components/ErrorMessage";
import React, { useState } from "react";
import ServiceSelectionPanel from "../components/ServiceRequest/ServiceSelectionPanel";
import ServiceList from "../components/ServiceRequest/ServiceList";
import PatientSelectionHeader from "../components/ServiceRequest/PatientSelectionHeader";
import type { SortOrder, Service } from "../../../interface/Service";
import type { Patient } from "../../../interface/Patient";
import {
  Syringe,
  Clipboard,
  BoneFracture,
  Package,
  TriangleAlert,
  FlaskRound,
} from "lucide-react";
import ConfirmDialog from "#components/ConfirmDialog";

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
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // FILTERS
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("a-z");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const isolatedTabs = ["consultation", "package"];

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

  const switchTab = (tab: string) => {
    clearServices();
    handleTab(tab);
  };

  const handleTabClick = (tab: string) => {
    if (tab === activeTab) return;

    const needsClear =
      isolatedTabs.includes(tab) || isolatedTabs.includes(activeTab);

    if (needsClear && selectedServices.length > 0) {
      setPendingTab(tab); // ask first
      return;
    }
    if (needsClear) clearServices();
    handleTab(tab);
  };

  const cards = [
    {
      service_type: "laboratory",
      mainHeading: "Laboratory Services",
      subHeading: "Request Laboratory tests and diagnosis",
      icon: Syringe,
    },
    {
      service_type: "imaging",
      mainHeading: "Imaging Services",
      subHeading: "Request Imaging tests and diagnosis",
      icon: BoneFracture,
    },
    {
      // Billed only: drug tests never join a queue (the clinic runs them on
      // its own system); the admin counts them in Reports.
      service_type: "drug test",
      mainHeading: "Drug Test",
      subHeading: "Bill a drug test (not added to any queue)",
      icon: FlaskRound,
    },
    {
      service_type: "consultation",
      mainHeading: "Consultation Services",
      subHeading: "Request Consultation or Specialist Service",
      icon: Clipboard,
    },
    {
      service_type: "package",
      mainHeading: "Packages",
      subHeading: "Request Packaged Services for lower price",
      icon: Package,
    },
  ];
  if (loading && services.length === 0) {
    return (
      <LoadingScreen variant="page" message="Loading available services..." />
    );
  }

  return (
    <main className="flex-1 min-w-0 pb-5">
      <h1 className="text-2xl font-bold px-4 sm:px-6">Select Service Type</h1>
      {error && (
        <ErrorMessage className="mx-4 sm:mx-6 mt-5">{error}</ErrorMessage>
      )}
      <PatientSelectionHeader
        patient={patient}
        onSelectPatient={setPatient}
        onRegister={() => setPage("patient-registration")}
      />
      {/* SERVICE TABS */}
      <section
        className="grid grid-cols-1 gap-3 mt-6 px-4 sm:grid-cols-2 sm:px-8 xl:grid-cols-4"
        aria-label="Service types"
      >
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <button
              type="button"
              aria-pressed={activeTab === card.service_type}
              className={`flex min-w-0 items-center gap-3 border px-3 py-3 rounded-md cursor-pointer shadow-md text-left
                hover:text-sky-600 hover:border-sky-200 hover:scale-101 active:scale-100 active:text-sky-600
                ${activeTab === card.service_type ? "text-sky-400" : "border-gray-200"}`}
              key={index}
              onClick={() => handleTabClick(card.service_type)}
            >
              <Icon size={25} className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-md font-bold">{card.mainHeading}</h1>
                <h3 className="text-xs">{card.subHeading}</h3>
              </div>
            </button>
          );
        })}
      </section>
      <LoadingRegion
        loading={loading && services.length > 0}
        message="Refreshing available services..."
      >
        <div className="border border-gray-200 rounded-md mt-5 mx-4 sm:mx-8 grid grid-cols-1 lg:grid-cols-5 min-h-7/12 shadow-lg">
          <div className="min-w-0 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-gray-200 px-4 sm:px-8 py-5 flex flex-col justify-between">
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
          <div className="min-w-0 lg:col-span-2 px-4 sm:px-8 py-5 flex flex-col justify-between">
            <ServiceList
              activeTab={activeTab}
              services={services}
              selectedServices={selectedServices}
              patientId={patient?.patient_id ?? null}
              patientMeasurements={patient}
              onToggleService={toggleService}
              onClearAll={clearServices}
              onSubmitted={async () => {
                setPatient(null);
                await loadData();
              }}
            />
          </div>
        </div>
      </LoadingRegion>
      {pendingTab && (
        <ConfirmDialog
          tone="warning"
          icon={TriangleAlert}
          title="Switch Service Type?"
          confirmLabel="Switch & Clear"
          cancelLabel="Stay Here"
          description={`Switching to ${
            cards.find((c) => c.service_type === pendingTab)?.mainHeading ??
            "this tab"
          } will clear your currently selected services. Do you want to continue?`}
          onCancel={() => setPendingTab(null)}
          onConfirm={() => {
            switchTab(pendingTab);
            setPendingTab(null);
          }}
        />
      )}
    </main>
  );
}

export default ServiceRequest;

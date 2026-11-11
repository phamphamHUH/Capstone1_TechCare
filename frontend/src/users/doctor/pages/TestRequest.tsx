import React, { useState } from "react";
import { Syringe, BoneFracture, Package, TriangleAlert } from "lucide-react";
import type { SortOrder, Service } from "../../../interface/Service";
import type { Patient } from "../../../interface/Patient";
import calculateAge from "../../../utils/calculateAge";
import { formatAge, formatDateTime } from "../../../utils/formats";
import type { QueueEntry } from "../../../interface/Queue";
import ServiceSelectionPanel from "../components/TestRequest/ServiceSelectionPanel";
import ServiceList from "../components/TestRequest/ServiceList";
import ConfirmDialog from "#components/ConfirmDialog";

type ServiceRequestProps = {
  services: Service[];
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
  setPage: (page: string) => void;
  selectedQueue: QueueEntry | null;
};

const PAGE_SIZE = 10;

function TestRequest({
  services,
  loadData,
  setPage,
  selectedQueue,
}: ServiceRequestProps) {
  const [activeTab, setActiveTab] = useState("laboratory");
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

  const initials = (selectedQueue?.patient_name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i, arr) =>
      i === 0 || i === arr.length - 1 ? word.charAt(0).toUpperCase() : "",
    )
    .join("");

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
      service_type: "package",
      mainHeading: "Packages",
      subHeading: "Request Packaged Services for lower price",
      icon: Package,
    },
  ];
  return (
    <main className="flex-1 min-w-0 pb-5 px-4 sm:px-6">
      {selectedQueue ? (
        <>
          {/* PATIENT HEADER */}
          <section className="rounded-md border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap justify-between gap-3">
              <div className="flex min-w-0 gap-3 sm:gap-5 text-xs">
                <div className="relative h-15 w-15 overflow-hidden rounded-full bg-sky-50">
                  {selectedQueue.image_url ? (
                    <img
                      src={selectedQueue.image_url}
                      alt={selectedQueue.patient_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-sky-50 text-3xl font-semibold text-gray-500">
                      {initials}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-lg sm:text-xl font-semibold">
                      {selectedQueue.patient_name}
                    </p>
                    <p className="text-gray-500 font-light">
                      ID: {selectedQueue.patient_id}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
                    <p>{selectedQueue.sex}</p>
                    <span>•</span>
                    <p>
                      {formatAge(
                        selectedQueue.birthdate,
                        calculateAge(selectedQueue.birthdate),
                      )}
                    </p>
                    <span>•</span>
                    <p>DOB: {formatDateTime(selectedQueue.birthdate)?.date}</p>
                    <span>•</span>
                    <p>{selectedQueue.contact_number}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 h-fit mt-3 text-xs">
                {selectedQueue.is_priority && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    Priority
                  </span>
                )}
                {selectedQueue.is_pwd && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    PWD
                  </span>
                )}
                {calculateAge(selectedQueue.birthdate) >= 60 && (
                  <span className="rounded-full bg-orange-100 px-3 py-0.5 text-orange-700">
                    Senior
                  </span>
                )}
              </div>
            </div>

            {/* QUEUE INFORMATION */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600 mt-3 font-semibold">
              <p>{selectedQueue.queue_id}</p>
              <span>•</span>
              <p>{selectedQueue.consultation_record_id}</p>
              <span>•</span>
              <p>{selectedQueue.room}</p>
              <span>•</span>
              <p>In Consultation</p>
            </div>
          </section>
          {/* SERVICE TABS */}
          <section className="flex flex-wrap gap-3 sm:gap-5 mt-6">
            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  className={`flex items-center border w-fit px-5 justify-center gap-3 py-3 rounded-md cursor-pointer shadow-md 
                      hover:text-sky-600 hover:border-sky-200 hover:scale-101 active:scale-100 active:text-sky-600 
                      ${activeTab === card.service_type ? "text-sky-400 " : "border-gray-200"}`}
                  key={index}
                  onClick={() => handleTabClick(card.service_type)}
                >
                  <Icon size={25} />
                  <div>
                    <h1 className="text-md font-bold">{card.mainHeading}</h1>
                    <h3 className="text-xs">{card.subHeading}</h3>
                  </div>
                </div>
              );
            })}
          </section>
          <section className="border border-gray-200 rounded-md mt-5 grid grid-cols-1 lg:grid-cols-5 min-h-7/12 shadow-lg">
            <div className="min-w-0 lg:col-span-3 border-b lg:border-b-0 lg:border-r border-gray-200 px-4 sm:px-6 py-5 flex flex-col justify-between">
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
                onPageChange={setPageNumber}
              />
            </div>
            <div className="min-w-0 lg:col-span-2 px-4 sm:px-8 py-5 flex flex-col justify-between">
              <ServiceList
                activeTab={activeTab}
                services={services}
                selectedServices={selectedServices}
                patientId={selectedQueue?.patient_id ?? null}
                onToggleService={toggleService}
                onClearAll={clearServices}
                onSubmitted={async () => {
                  await loadData();
                }}
              />
            </div>
          </section>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <span className="text-2xl text-yellow-600">!</span>
          </div>

          <h3 className="text-base font-semibold text-gray-700">
            No Active Consultation
          </h3>

          <p className="mt-1 max-w-sm text-sm text-gray-500">
            There is currently no patient being served. Accept a patient from
            the consultation queue to begin a consultation.
          </p>
        </div>
      )}
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

export default TestRequest;

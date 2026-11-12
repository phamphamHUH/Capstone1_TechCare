import ErrorMessage from "../../../../components/ErrorMessage";
import EmptyState from "../../../../components/EmptyState";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import UniversalModal from "../../../../components/UniversalModal";
import { useState } from "react";
import { X, Search, Trash } from "lucide-react";
import api from "../../../../lib/axios";
import type { Service } from "../../../../interface/Service";
import { peso } from "../../../../utils/formats";

type Props = {
  service: Service;
  services: Service[];
  onClose: () => void;
  loadData: () => void;
};

const ROOM_OPTIONS = [
  "Consultation Room",
  "Laboratory Room 1",
  "Laboratory Room 2",
];

function EditService({ service, services, onClose, loadData }: Props) {
  const isPackage = service.service_type === "package";

  const [formError, setFormError] = useState("");
  const [serviceName, setServiceName] = useState(service.service_name);
  const [price, setPrice] = useState(String(service.price));
  const [serviceType, setServiceType] = useState(service.service_type);
  const [serviceCategory, setServiceCategory] = useState(
    service.service_category,
  );
  const [room, setRoom] = useState(service.room);
  const [isActive, setIsActive] = useState(service.active);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [searchFilter, setSearchFilter] = useState("");
  const [checkedServices, setCheckedServices] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>(() =>
    services.filter((s) => service.service_ids?.includes(s.service_id)),
  );

  const originalPrice = selectedServices.reduce(
    (total, s) => total + Number(s.price),
    0,
  );

  const filteredServices = services.filter((s) =>
    s.service_name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const allSelected =
    selectedServices.length > 0 &&
    selectedServices.every((s) => checkedServices.includes(s.service_id));

  function addPackageService(s: Service) {
    if (selectedServices.some((item) => item.service_id === s.service_id))
      return;
    setSelectedServices((prev) => [...prev, s]);
    setSearchFilter("");
  }

  function toggleAllServices() {
    setCheckedServices(
      allSelected ? [] : selectedServices.map((s) => s.service_id),
    );
  }

  function removeServices(ids: string[]) {
    setSelectedServices((prev) =>
      prev.filter((item) => !ids.includes(item.service_id)),
    );
    setCheckedServices([]);
  }

  async function saveService() {
    setFormError("");
    if (isPackage) {
      if (
        !serviceName.trim() ||
        price === "" ||
        selectedServices.length === 0
      ) {
        setFormError(
          "Package name, package price, and at least one service are required.",
        );
        return;
      }
      if (isNaN(Number(price)) || Number(price) < 0) {
        setFormError("Package price must be a valid non-negative number.");
        return;
      }
      if (Number(price) > originalPrice) {
        setFormError(
          "Package price cannot be greater than the original price.",
        );
        return;
      }
    } else {
      if (
        !serviceName.trim() ||
        price === "" ||
        !serviceType ||
        !serviceCategory.trim() ||
        !room
      ) {
        setFormError("Please fill out all fields.");
        return;
      }
      if (isNaN(Number(price)) || Number(price) < 0) {
        setFormError("Price must be a valid non-negative number.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const body = isPackage
        ? {
            service_name: serviceName.trim(),
            price: Number(price),
            active: isActive,
            services: selectedServices.map((s) => s.service_id),
          }
        : {
            service_name: serviceName.trim(),
            service_type: serviceType,
            service_category: serviceCategory.trim(),
            price: Number(price),
            room,
            active: isActive,
          };

      await api.patch(
        `/api/admin/services/${encodeURIComponent(service.service_id)}/edit`,
        body,
      );

      setSaved(true);
      loadData();
    } catch (error: unknown) {
      setFormError(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message ||
          `The ${isPackage ? "package" : "service"} could not be updated.`,
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none";

  if (saved) {
    return (
      <UniversalModal
        isOpen
        type="success"
        title={isPackage ? "Package Updated" : "Service Updated"}
        description={`The ${isPackage ? "package" : "service"} has been successfully updated.`}
        onClose={onClose}
        actions={[{ label: "OK", onClick: onClose }]}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto bg-white py-4 px-4 sm:px-6 shadow-xl rounded-md">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {isPackage ? "Edit Package" : "Edit Service"}
            </h2>
            <p className="text-sm font-light">
              {isPackage
                ? "Update package details, included services and price."
                : "Update service details, pricing and status."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {formError && <ErrorMessage className="mb-4">{formError}</ErrorMessage>}
        {!isPackage && (
          <div className="w-full">
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5 mb-2">
              <div>
                <label className="text-xs font-semibold">Service Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  onChange={(e) => setServiceName(e.target.value)}
                  value={serviceName}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder=" ₱ 0.00"
                  className={inputClass}
                  onChange={(e) => setPrice(e.target.value)}
                  value={price}
                />
              </div>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-5 mb-3">
              <div>
                <label className="text-xs font-semibold">Service Type *</label>
                <select
                  className={inputClass}
                  onChange={(e) => setServiceType(e.target.value)}
                  value={serviceType}
                >
                  <option value="consultation">Consultation</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="imaging">Imaging</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold">
                  Service Category *
                </label>
                <input
                  type="text"
                  className={inputClass}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  value={serviceCategory}
                />
              </div>
            </div>

            <div className="w-full mb-3">
              <label className="text-xs font-semibold">Room *</label>
              <select
                className={inputClass}
                onChange={(e) => setRoom(e.target.value)}
                value={room}
              >
                <option value="">Select a room</option>
                {ROOM_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isPackage && (
          <div className="w-full">
            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-5 mb-2">
              <div>
                <label className="text-xs font-semibold">Package Name *</label>
                <input
                  type="text"
                  className={inputClass}
                  onChange={(e) => setServiceName(e.target.value)}
                  value={serviceName}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Original Price</label>
                <input
                  type="text"
                  className={inputClass}
                  value={peso(originalPrice)}
                  disabled
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Package Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder=" ₱ 0.00"
                  className={inputClass}
                  onChange={(e) => setPrice(e.target.value)}
                  value={price}
                />
              </div>
            </div>

            <div className="w-full mb-3">
              <h1 className="text-xs font-semibold mb-2">
                Included Services *
              </h1>

              <div className="relative">
                <Search
                  size={17}
                  strokeWidth={1.5}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search existing services..."
                  className="h-9 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                />

                {searchFilter.trim() !== "" && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((s) => (
                        <button
                          key={s.service_id}
                          type="button"
                          onClick={() => addPackageService(s)}
                          disabled={selectedServices.some(
                            (item) => item.service_id === s.service_id,
                          )}
                          className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>{s.service_name}</span>
                          <span className="text-gray-500">{peso(s.price)}</span>
                        </button>
                      ))
                    ) : (
                      <EmptyState message="No matching services found." />
                    )}
                  </div>
                )}
              </div>

              <div className="w-full max-h-60 overflow-auto rounded-md border border-gray-200 mt-5">
                <table className="min-w-[520px] w-full text-left text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAllServices}
                          className="cursor-pointer accent-sky-600"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Service Name</th>
                      <th className="px-4 py-3 font-semibold">
                        Service Category
                      </th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3 pl-7 text-center">
                        <button
                          type="button"
                          disabled={checkedServices.length === 0}
                          onClick={() => removeServices(checkedServices)}
                          className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Remove checked services"
                        >
                          <Trash size={15} />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedServices.map((s) => (
                      <tr key={s.service_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checkedServices.includes(s.service_id)}
                            onChange={() =>
                              setCheckedServices((prev) =>
                                prev.includes(s.service_id)
                                  ? prev.filter((id) => id !== s.service_id)
                                  : [...prev, s.service_id],
                              )
                            }
                            className="cursor-pointer accent-sky-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {s.service_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {s.service_category}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {peso(s.price)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              removeServices(
                                checkedServices.length > 0
                                  ? checkedServices
                                  : [s.service_id],
                              )
                            }
                            className="cursor-pointer text-gray-500 hover:text-red-500"
                          >
                            <Trash size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {selectedServices.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4">
                          <EmptyState compact message="No services added." />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-300 mt-5 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((prev) => !prev)}
              className={`relative h-6 w-10 rounded-full transition-colors duration-200 cursor-pointer ${
                isActive ? "bg-sky-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isActive ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-xs text-gray-700">
              {isActive ? "Active Status" : "Inactive Status"}
            </span>
          </div>

          <div className="flex justify-end items-center gap-3">
            <button
              className="border px-4 py-2 cursor-pointer rounded-md text-xs border-gray-300"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="cursor-pointer rounded-md border text-xs border-blue-600 bg-sky-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-300"
              onClick={saveService}
              disabled={submitting}
            >
              {submitting && (
                <LoadingSpinner
                  size={16}
                  className="mr-2 inline-block align-middle"
                />
              )}
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditService;

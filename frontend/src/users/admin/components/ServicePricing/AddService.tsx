import { useState } from "react";
import api from "../../../../lib/axios";
import { X, PackagePlus, FlaskConical, Search, Trash } from "lucide-react";
import type { Service } from "../../../../interface/Service";
import { peso } from "../../../../utils/formats";

type Props = {
  onClose: () => void;
  loadData: () => void;
  services: Service[];
};

const ROOM_OPTIONS = [
  "Consultation Room",
  "Laboratory Room 1",
  "Laboratory Room 2",
];

function AddService({ loadData, onClose, services }: Props) {
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [serviceTab, setServiceTab] = useState("single-service");
  const [isActive, setIsActive] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [checkedServices, setCheckedServices] = useState<string[]>([]);

  async function addService() {
    if (
      !serviceName ||
      price === "" ||
      !serviceType ||
      !serviceCategory ||
      !room
    ) {
      alert("Please fill out all fields.");
      return;
    }

    if (isNaN(Number(price))) {
      alert("Price must be a number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post("/api/admin/services", {
        service_type: serviceType,
        service_name: serviceName,
        service_category: serviceCategory,
        price: Number(price),
        room,
      });
      alert(response.data.message);
      loadData();
      onClose();
    } catch (error: unknown) {
      alert(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Something went wrong",
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function addPackage() {
    if (!serviceName.trim() || price === "" || selectedServices.length === 0) {
      alert(
        "Package name, package price, and at least one service are required.",
      );
      return;
    }

    if (isNaN(Number(price)) || Number(price) < 0) {
      alert("Package price must be a valid non-negative number.");
      return;
    }

    if (Number(price) > originalPrice) {
      alert("Package price cannot be greater than the original price.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post("/api/admin/packages", {
        package_name: serviceName.trim(),
        price: Number(price),
        services: selectedServices.map((service) => service.service_id),
      });

      alert(response.data.message);
      loadData();
      onClose();
    } catch (error: unknown) {
      alert(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Something went wrong",
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredServices = services.filter((service) =>
    service.service_name.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  function addPackageService(service: Service) {
    const alreadyAdded = selectedServices.some(
      (item) => item.service_id === service.service_id,
    );

    if (alreadyAdded) return;

    setSelectedServices((prev) => [...prev, service]);
    setSearchFilter("");
  }

  const allSelected =
    selectedServices.length > 0 &&
    selectedServices.every((service) =>
      checkedServices.includes(service.service_id),
    );

  function toggleAllServices() {
    if (allSelected) {
      setCheckedServices([]);
    } else {
      setCheckedServices(selectedServices.map((service) => service.service_id));
    }
  }

  const originalPrice = selectedServices.reduce(
    (total, service) => total + Number(service.price),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-4/11 bg-white py-4 px-6 shadow-xl rounded-lg">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Add Service</h2>
            <p className="text-sm font-light">
              Create a new laboratory service or package.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm hover:bg-gray-100 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <label
              className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${
                serviceTab === "single-service"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="service-type"
                value="single-service"
                checked={serviceTab === "single-service"}
                onChange={() => {
                  setServiceTab("single-service");
                  setPrice("");
                  setServiceName("");
                  setSelectedServices([]);
                  setCheckedServices([]);
                }}
              />
              <FlaskConical size={25} />
              <div>
                <h3 className="font-semibold">Single Service</h3>
                <p className="text-xs font-light">
                  Create individual laboratory, imaging, and consultation
                  services
                </p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-2 rounded border-2 px-3 py-2 text-sm ${
                serviceTab === "package"
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment-method"
                value="Instapay/QRpH"
                checked={serviceTab === "package"}
                onChange={() => {
                  setServiceTab("package");
                  setPrice("");
                  setServiceName("");
                }}
              />
              <PackagePlus size={25} />
              <div>
                <h3 className="font-semibold">Package</h3>
                <p className="text-xs font-light">
                  Create a group of multiple services for a discounted price
                </p>
              </div>
            </label>
          </div>
        </div>
        {serviceTab === "single-service" && (
          <div className="w-full">
            <div className="w-full grid grid-cols-2 gap-5 mb-2">
              <div>
                <label className="text-xs font-semibold">Service Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  onChange={(e) => setServiceName(e.target.value)}
                  value={serviceName}
                />
              </div>
              <div>
                <label className=" text-xs font-semibold">Price *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder=" ₱ 0.00"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  onChange={(e) => setPrice(e.target.value)}
                  value={price}
                />
              </div>
            </div>
            <div className="w-full grid grid-cols-2 gap-5 mb-3">
              <div>
                <label className="text-xs font-semibold">Service Type *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  onChange={(e) => setServiceType(e.target.value)}
                  value={serviceType}
                >
                  <option value="">Select a service type</option>
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
                  placeholder="e.g. Blood Chemistry, Enzymes, Electrolytes"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  onChange={(e) => setServiceCategory(e.target.value)}
                  value={serviceCategory}
                />
              </div>
            </div>
            <div className="w-full  mb-3">
              <div>
                <label className="text-xs font-semibold">Room *</label>
                <select
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
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
          </div>
        )}

        {serviceTab === "package" && (
          <div className="w-full">
            <div className="w-full grid grid-cols-3 gap-5 mb-2">
              <div>
                <label className="text-xs font-semibold">Package Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Complete Blood Count"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  onChange={(e) => setServiceName(e.target.value)}
                  value={serviceName}
                />
              </div>
              <div>
                <label className=" text-xs font-semibold">
                  Original Price *
                </label>
                <input
                  type="text"
                  placeholder=" ₱ 0.00"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
                  value={peso(originalPrice)}
                  disabled
                />
              </div>
              <div>
                <label className=" text-xs font-semibold">
                  Package Price *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder=" ₱ 0.00"
                  className="w-full rounded-lg border border-gray-300 py-2 px-3 text-xs focus:border-gray-900 focus:outline-none"
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
                  className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-100"
                />

                {searchFilter.trim() !== "" && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                    {filteredServices.length > 0 ? (
                      filteredServices.map((service) => (
                        <button
                          key={service.service_id}
                          type="button"
                          onClick={() => addPackageService(service)}
                          disabled={selectedServices.some(
                            (item) => item.service_id === service.service_id,
                          )}
                          className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span>{service.service_name}</span>
                          <span className="text-gray-500">
                            {peso(service.price)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-xs text-gray-400">
                        No matching services found.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="w-full overflow-x-auto rounded-lg border border-gray-200 mt-3">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-1">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleAllServices}
                          className="cursor-pointer accent-sky-600"
                        />
                      </th>
                      <th className="px-4 py-1 font-semibold">Service Name</th>
                      <th className="px-4 py-1 font-semibold">
                        Service Category
                      </th>
                      <th className="px-4 py-1 font-semibold">Price</th>
                      <th className="px-4 py-1 pl-7 text-center">
                        <button type="button">
                          <Trash size={15} />
                        </button>
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {selectedServices.map((service) => (
                      <tr
                        key={service.service_id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checkedServices.includes(
                              service.service_id,
                            )}
                            onChange={() => {
                              setCheckedServices((prev) =>
                                prev.includes(service.service_id)
                                  ? prev.filter(
                                      (id) => id !== service.service_id,
                                    )
                                  : [...prev, service.service_id],
                              );
                            }}
                            className="cursor-pointer accent-sky-600"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {service.service_name}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {service.service_category}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          ₱{Number(service.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const idsToDelete =
                                checkedServices.length > 0
                                  ? checkedServices
                                  : [service.service_id];

                              setSelectedServices((prev) =>
                                prev.filter(
                                  (item) =>
                                    !idsToDelete.includes(item.service_id),
                                ),
                              );

                              setCheckedServices([]);
                            }}
                            className="cursor-pointer text-gray-500 hover:text-red-500"
                          >
                            <Trash size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {selectedServices.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-2 text-center text-gray-400"
                        >
                          Search services to include.
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
          <div className=" border-gray-200">
            <div className="flex items-center gap-2 ">
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
              onClick={
                serviceTab === "single-service" ? addService : addPackage
              }
              disabled={submitting}
            >
              {submitting
                ? "Adding..."
                : serviceTab === "single-service"
                  ? "Add Service"
                  : "Add Package"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddService;

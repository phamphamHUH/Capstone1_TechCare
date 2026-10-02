import { useState } from "react";
import api from "../../../../lib/axios";

type Props = {
  onClose: () => void;
  loadData: () => void;
};

const ROOM_OPTIONS = [
  "Consultation Room",
  "Laboratory Room 1",
  "Laboratory Room 2",
];

function AddService({ loadData, onClose }: Props) {
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [serviceCategory, setServiceCategory] = useState("");
  const [room, setRoom] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Add New Service</h2>
          <button
            onClick={onClose}
            className="border px-3 py-1 text-sm hover:bg-gray-100"
          >
            X
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Service name
            </label>
            <input
              type="text"
              placeholder="e.g. Complete Blood Count"
              className="w-full border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
              onChange={(e) => setServiceName(e.target.value)}
              value={serviceName}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
              onChange={(e) => setPrice(e.target.value)}
              value={price}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Service type
            </label>
            <select
              className="w-full border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
              onChange={(e) => setServiceType(e.target.value)}
              value={serviceType}
            >
              <option value="">Select a service type</option>
              <option value="consultation">Consultation</option>
              <option value="laboratory">Laboratory</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">
              Service Category
            </label>
            <input
              type="text"
              placeholder="e.g. Blood Chemistry, Enzymes, Electrolytes"
              className="w-full border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
              onChange={(e) => setServiceCategory(e.target.value)}
              value={serviceCategory}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Room</label>
            <select
              className="w-full border border-gray-300 p-2 text-sm focus:border-gray-900 focus:outline-none"
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

          <button
            className="w-full border border-gray-900 py-2 text-sm font-medium hover:bg-gray-900 hover:text-white disabled:opacity-40"
            onClick={addService}
            disabled={submitting}
          >
            {submitting ? "Adding..." : "Add service"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddService;

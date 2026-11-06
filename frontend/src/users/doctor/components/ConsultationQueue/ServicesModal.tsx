import { X } from "lucide-react";
import type { Service } from "../../../../interface/Service";

type ServiceModalProps = {
  services: Service[];
  room: string;
  onClose: () => void;
};

function ServiceModal({ services, room, onClose }: ServiceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <main
        className="shadow-lg w-6/11 absolute rounded-2xl bg-gray-100 overflow-hidden flex flex-col gap-5 items-center
      "
      >
        <div className="flex w-full justify-between items-center px-6 py-3 bg-white shadow-xs">
          <div>
            <h1 className="font-semibold text-xl">Services List</h1>
            <h2 className="font-light text-sm">{room}</h2>
          </div>
          <X
            size={20}
            className="cursor-pointer text-gray-500"
            onClick={onClose}
          />
        </div>
        <div className="py-2 rounded-xl w-19/20 mb-5 bg-white shadow-sm">
          <table className="table-fixed w-full">
            <colgroup>
              <col className="w-3/16" />
              <col className="w-4/16" />
              <col className="w-7/16" />
              <col className="w-2/16" />
            </colgroup>
            <thead>
              <tr className="bg-gray-100 ">
                <th className="px-1 py-3">Service ID</th>
                <th className="px-1 py-3">Service Name</th>
                <th className="px-1 py-3">Service Type</th>
                <th className="px-1 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id} className="border-b border-gray-300">
                  <td className="px-1 py-2 text-center text-sm">
                    {service.service_id}
                  </td>
                  <td className="px-1 py-2 text-center text-sm">
                    {service.service_name}
                  </td>
                  <td className="px-1 py-2 text-center text-sm">
                    {service.service_type}
                  </td>
                  <td className="px-1 py-2 text-center text-sm">
                    {service.active === true ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default ServiceModal;

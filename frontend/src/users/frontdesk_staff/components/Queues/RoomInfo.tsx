import React from "react";
import { FlaskConical } from "lucide-react";

function RoomInfo() {
  return (
    <div className="px-3 flex flex-col gap-5">
      <div className="border p-3 rounded-xl border-gray-200">
        <h1 className="font-bold  text-lg">Laboratory Rooms</h1>
        <div className="flex border justify-between px-5 py-2 mt-3 rounded-lg border-green-600 bg-green-100 text-green-600">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} />
            <h1>Laboratory Room 1</h1>
          </div>
          <div className="flex flex-col justify-center items-center text-xs">
            <h1 className="font-bold">Available</h1>
            <h3>Vacant</h3>
          </div>
        </div>
        <div className="flex border justify-between px-5 py-2 mt-3 rounded-lg border-green-600 bg-green-100 text-green-600">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} />
            <h1>Laboratory Room 1</h1>
          </div>
          <div className="flex flex-col justify-center items-center text-xs">
            <h1 className="font-bold">Available</h1>
            <h3>Vacant</h3>
          </div>
        </div>
        <div className="flex border justify-between px-5 py-2 mt-3 rounded-lg border-yellow-600 bg-yellow-100 text-yellow-600">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} />
            <h1>Laboratory Room 1</h1>
          </div>
          <div className="flex flex-col justify-center items-center text-xs">
            <h1 className="font-bold">In Service</h1>
            <h3>Serving</h3>
          </div>
        </div>
      </div>
      <div className="border p-3 rounded-xl border-gray-200">
        <h1 className="font-bold  text-lg">Consultation Rooms</h1>
        <div className="flex border justify-between px-5 py-2 mt-3 rounded-lg border-green-600 bg-green-100 text-green-600">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} />
            <h1>Consultation Room 1</h1>
          </div>
          <div className="flex flex-col justify-center items-center text-xs">
            <h1 className="font-bold">Available</h1>
            <h3>Vacant</h3>
          </div>
        </div>
        <div className="flex border justify-between px-5 py-2 mt-3 rounded-lg border-yellow-600 bg-yellow-100 text-yellow-600">
          <div className="flex items-center gap-2">
            <FlaskConical size={15} />
            <h1>Consultation Room 1</h1>
          </div>
          <div className="flex flex-col justify-center items-center text-xs">
            <h1 className="font-bold">In Service</h1>
            <h3>Serving</h3>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomInfo;

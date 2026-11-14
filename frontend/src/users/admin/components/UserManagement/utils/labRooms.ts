export const LAB_STAFF_ROLE = "laboratory-staff";

// A lab staff member's room is saved in users.department. Each value must match
// services.room exactly, because the lab queues are loaded by that room name.
export const LAB_ROOMS = [
  { value: "Laboratory Room 1", label: "Room 1" },
  { value: "Laboratory Room 2", label: "Room 2" },
  { value: "Imaging Room", label: "Imaging" },
];

export const isLabRoom = (department: string) =>
  LAB_ROOMS.some((room) => room.value === department);

// Free-text departments and rooms don't carry over when the role changes.
export const departmentAfterRoleChange = (
  currentRole: string,
  nextRole: string,
  department: string,
) =>
  (currentRole === LAB_STAFF_ROLE) === (nextRole === LAB_STAFF_ROLE)
    ? department
    : "";

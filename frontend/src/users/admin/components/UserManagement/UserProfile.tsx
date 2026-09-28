import api from "#lib/axios";
import { useState } from "react";
import type { User } from "../../../../interface/User";
import { ConfirmationModal } from "./ConfirmationModal";
import { X, Mail, Phone, MapPin, Calendar, Clock, Pencil } from "lucide-react";

type Props = {
  loadData: () => Promise<void>;
  user: User;
  onBack: () => void;
  setShowUpdateUser: () => void;
  setSelectedUser: React.Dispatch<React.SetStateAction<User>>;
};

function UserProfile({
  loadData,
  user,
  onBack,
  setShowUpdateUser,
  setSelectedUser,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fullName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.suffix,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = `${user.first_name?.charAt(0) || ""}${
    user.last_name?.charAt(0) || ""
  }`;

  const handleEdit = () => {
    // Close User Profile first.
    onBack();

    // Then open Update User.
    setShowUpdateUser();
  };

  async function updateAccountStatus() {
    setIsModalOpen(false); // Close modal first
    setUpdating(true);

    try {
      const newStatus = !user.account_status;
      const response = await api.patch(
        `api/admin/users/status/${user.user_id}`,
        { account_status: newStatus },
      );

      setSelectedUser((currentUser) => ({
        ...currentUser,
        account_status: newStatus,
      }));

      alert(response.data.message);
      await loadData();
    } catch (error: unknown) {
      alert(
        (
          error as {
            response?: {
              data?: {
                message?: string;
              };
            };
          }
        ).response?.data?.message || "Something went wrong",
      );
    } finally {
      setUpdating(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onBack}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-[94%] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              User Profile
            </h2>

            <p className="mt-0.5 text-sm text-gray-500">
              View user information
            </p>
          </div>

          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[82vh] overflow-y-auto p-6">
          {/* Profile Hero */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="h-36 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100" />

            <div className="px-8 pb-8">
              <div className="-mt-16 flex items-end justify-between">
                {/* Profile Image */}
                <div>
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt={fullName}
                      className="h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white bg-gray-200 text-4xl font-bold text-gray-500 shadow-lg">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Status + Edit */}
                <div className="flex items-center gap-3">
                  {/* Active Status */}
                  <span
                    className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      user.active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        user.active ? "bg-green-500" : "bg-gray-400"
                      }`}
                    />

                    {user.active ? "Active" : "Not Active"}
                  </span>

                  {/* Edit */}
                  <button
                    onClick={handleEdit}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                  >
                    <Pencil size={16} />
                    Edit
                  </button>

                  <button
                    onClick={() => setIsModalOpen(true)}
                    disabled={updating}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition disabled:opacity-50 ${
                      user.account_status
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {updating
                      ? "Updating..."
                      : user.account_status
                        ? "Deactivate"
                        : "Activate"}
                  </button>

                  <ConfirmationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onConfirm={updateAccountStatus}
                    title={
                      user.account_status
                        ? "Deactivate Account"
                        : "Activate Account"
                    }
                    message={
                      user.account_status
                        ? `Are you sure you want to deactivate ${user.first_name}'s account? They will lose system access.`
                        : `Are you sure you want to activate ${user.first_name}'s account?`
                    }
                    isDangerous={user.account_status}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="mt-5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {fullName}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  <span className="capitalize">{user.role}</span>

                  {user.department && ` • ${user.department}`}
                </p>
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Contact Information
              </h2>

              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Mail size={18} className="text-gray-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">Email</p>

                    <p className="truncate text-sm font-medium text-gray-900">
                      {user.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <Phone size={18} className="text-gray-600" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Contact Number</p>

                    <p className="text-sm font-medium text-gray-900">
                      {user.contact_number || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <MapPin size={18} className="text-gray-600" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Address</p>

                    <p className="text-sm font-medium text-gray-900">
                      {user.address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Employment Information
              </h2>

              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-400">Employee ID</p>

                  <p className="text-sm font-medium text-gray-900">
                    {user.user_id}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Username</p>

                  <p className="text-sm font-medium text-gray-900">
                    {user.username}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Department</p>

                  <p className="text-sm font-medium text-gray-900">
                    {user.department || "Not assigned"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Employment Status</p>

                  <p className="text-sm font-medium capitalize text-gray-900">
                    {user.employment_status || "Active"}
                  </p>
                </div>

                <div className="flex gap-10">
                  <div>
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={13} />
                      Date Hired
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {user.date_hired ? user.date_hired.substring(0, 10) : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock size={13} />
                      Shift
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {user.shift_start && user.shift_end
                        ? `${user.shift_start.substring(
                            0,
                            5,
                          )} - ${user.shift_end.substring(0, 5)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal */}
            <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-400">First Name</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.first_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Middle Name</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.middle_name || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Last Name</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.last_name}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Suffix</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.suffix || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Sex</p>

                  <p className="mt-1 text-sm font-medium capitalize text-gray-900">
                    {user.sex}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Birthdate</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.birthdate ? user.birthdate.substring(0, 10) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency */}
            <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Emergency Contact
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-400">Contact Name</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.emergency_contact_name || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Contact Number</p>

                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {user.emergency_contact || "Not provided"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserProfile;

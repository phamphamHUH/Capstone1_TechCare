import ErrorMessage from "../../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import { useRef, useState } from "react";
import type { User } from "../../../../interface/User";
import {
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Save,
  ArrowLeft,
  Camera,
} from "lucide-react";
import api from "../../../../lib/axios";
import {
  departmentAfterRoleChange,
  isLabRoom,
  LAB_ROOMS,
  LAB_STAFF_ROLE,
} from "./labRooms";
import { DOCTOR_FIELDS } from "./doctorField";
import UniversalModal from "../../../../components/UniversalModal";

type Props = {
  user: User;
  onClose: () => void;
  loadData: () => void;
};

function UpdateUserModal({ user, onClose, loadData }: Props) {
  const [formError, setFormError] = useState("");
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [firstName, setFirstName] = useState(user.first_name);
  const [middleName, setMiddleName] = useState(user.middle_name || "");
  const [lastName, setLastName] = useState(user.last_name);
  const [suffix, setSuffix] = useState(user.suffix || "");

  const [sex, setSex] = useState(user.sex);
  const [birthdate, setBirthdate] = useState(
    user.birthdate?.substring(0, 10) || "",
  );

  const [email, setEmail] = useState(user.email);
  const [contactNumber, setContactNumber] = useState(user.contact_number || "");
  const [address, setAddress] = useState(user.address);

  const [role, setRole] = useState(user.role);
  // A lab account with an unrecognized department must pick a real room on save.
  const [department, setDepartment] = useState(
    user.role === LAB_STAFF_ROLE && !isLabRoom(user.department || "")
      ? ""
      : user.department || "",
  );
  const [employmentStatus, setEmploymentStatus] = useState(
    user.employment_status || "active",
  );

  const [dateHired, setDateHired] = useState(
    user.date_hired?.substring(0, 10) || "",
  );

  const [shiftStart, setShiftStart] = useState(user.shift_start || "");
  const [shiftEnd, setShiftEnd] = useState(user.shift_end || "");

  const [emergencyContactName, setEmergencyContactName] = useState(
    user.emergency_contact_name || "",
  );
  const [emergencyContact, setEmergencyContact] = useState(
    user.emergency_contact || "",
  );

  // Doctor information (only used when role === "doctor")
  const [doctor, setDoctor] = useState({
    prc_license_number: user.prc_license_number ?? "",
    ptr_number: user.ptr_number ?? "",
    s2_license: user.s2_license ?? "",
    medical_specialty: user.medical_specialty ?? "",
    subspecialty: user.subspecialty ?? "",
    board_certification: user.board_certification ?? "",
  });

  const [hiddenPassword, setHiddenPassword] = useState(true);
  const [saving, setSaving] = useState(false);

  // PFP
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(
    user.profile_photo || "",
  );

  const [notice, setNotice] = useState<{
    title: string;
    message: string;
    after?: () => void;
  } | null>(null);

  const closeNotice = () => {
    const after = notice?.after;
    setNotice(null);
    after?.();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fullName = [firstName, middleName, lastName, suffix]
    .filter(Boolean)
    .join(" ");

  const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`;

  const handleProfilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError("Profile photo must be less than 5MB.");
      return;
    }

    // Only revoke previews created in the browser, not the saved image URL
    if (profilePhoto && profilePhotoPreview) {
      URL.revokeObjectURL(profilePhotoPreview);
    }
    setProfilePhoto(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const editUser = async () => {
    setFormError("");
    if (password && password !== confirmPassword) {
      setFormError("Your passwords do not match.");
      return;
    }

    if (role === LAB_STAFF_ROLE && !department) {
      setFormError("Please select a room for the laboratory staff.");
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("username", username.trim());
      formData.append("first_name", firstName.trim());
      formData.append("middle_name", middleName.trim());
      formData.append("last_name", lastName.trim());
      formData.append("suffix", suffix.trim());
      formData.append("sex", sex);
      formData.append("birthdate", birthdate);
      formData.append("email", email.trim());
      formData.append("contact_number", contactNumber.trim());
      formData.append("address", address.trim());
      formData.append("role", role);
      formData.append("department", department.trim());
      formData.append("employment_status", employmentStatus);
      formData.append("date_hired", dateHired);
      formData.append("shift_start", shiftStart);
      formData.append("shift_end", shiftEnd);

      formData.append("emergency_contact_name", emergencyContactName.trim());
      formData.append("emergency_contact", emergencyContact.trim());

      if (role === "doctor") {
        DOCTOR_FIELDS.forEach(({ key }) =>
          formData.append(key, doctor[key].trim()),
        );
      }

      if (password.trim()) {
        formData.append("password", password);
      }

      // MUST be "image" because the backend uses:
      // upload.single("image")
      if (profilePhoto) {
        formData.append("image", profilePhoto);
      }

      const response = await api.patch(
        `/api/admin/users/${user.user_id}`,
        formData,
      );

      loadData();
      setNotice({
        title: "User updated",
        message: response.data.message,
        after: onClose,
      });
    } catch (error) {
      console.error("UPDATE USER ERROR:", error);
      setFormError(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to update user.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100";

  const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex w-[94%] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Update User
              </h2>

              <p className="mt-0.5 text-sm text-gray-500">
                Edit account and personal information
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[82dvh] overflow-y-auto p-4 sm:p-6">
          {formError && (
            <ErrorMessage className="mb-4">{formError}</ErrorMessage>
          )}

          {/* Profile Hero */}
          <div className="overflow-hidden rounded-md bg-white shadow-sm">
            <div className="h-36 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100" />

            <div className="px-4 pb-6 sm:px-8 sm:pb-8">
              <div className="-mt-16 flex items-end justify-between">
                {/* Profile photo */}
                <div className="relative">
                  {profilePhotoPreview ? (
                    <img
                      src={profilePhotoPreview}
                      alt={fullName}
                      className="h-32 w-32 rounded-md border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-md border-4 border-white bg-gray-200 text-4xl font-bold text-gray-500 shadow-lg">
                      {initials}
                    </div>
                  )}

                  {/* Camera button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-md border-2 border-white bg-gray-900 text-white shadow-lg transition hover:bg-gray-800"
                  >
                    <Camera size={18} />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhoto}
                    className="hidden"
                  />
                </div>

                <span className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Active
                </span>
              </div>

              <div className="mt-5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {fullName}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  <span className="capitalize">{role}</span>

                  {department && ` • ${department}`}
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                  Change profile photo
                </button>

                {profilePhoto && (
                  <p className="mt-1 text-xs text-gray-400">
                    {profilePhoto.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Contact */}
            <div className="rounded-md bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Contact Information
              </h2>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <Mail size={18} className="text-gray-600" />
                  </div>

                  <div className="flex-1">
                    <label className={labelClass}>Email</label>

                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <Phone size={18} className="text-gray-600" />
                  </div>

                  <div className="flex-1">
                    <label className={labelClass}>Contact Number</label>

                    <input
                      type="text"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <MapPin size={18} className="text-gray-600" />
                  </div>

                  <div className="flex-1">
                    <label className={labelClass}>Address</label>

                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Employment */}
            <div className="rounded-md bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Employment Information
              </h2>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Employee ID</label>

                  <div className="rounded-md bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">
                    {user.user_id}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Username</label>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Role</label>

                  <select
                    value={role}
                    onChange={(e) => {
                      setDepartment(
                        departmentAfterRoleChange(
                          role,
                          e.target.value,
                          department,
                        ),
                      );
                      setRole(e.target.value);
                    }}
                    className={inputClass}
                  >
                    <option value="admin">Admin</option>
                    <option value="doctor">Doctor</option>
                    <option value="laboratory-staff">Laboratory Staff</option>
                    <option value="frontdesk-staff">Front Desk Staff</option>
                    <option value="patient">Patient</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    {role === LAB_STAFF_ROLE ? "Room" : "Department"}
                  </label>

                  {role === LAB_STAFF_ROLE ? (
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select Room</option>
                      {LAB_ROOMS.map((room) => (
                        <option key={room.value} value={room.value}>
                          {room.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Not assigned"
                      className={inputClass}
                    />
                  )}
                </div>

                <div>
                  <label className={labelClass}>Employment Status</label>

                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>

                {/* Date Hired */}
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1">
                      <Calendar size={13} />
                      Date Hired
                    </span>
                  </label>

                  <input
                    type="date"
                    value={dateHired}
                    onChange={(e) => setDateHired(e.target.value)}
                    className={inputClass}
                  />
                </div>

                {/* Shift */}
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      Shift
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={shiftStart}
                      onChange={(e) => setShiftStart(e.target.value)}
                      className={inputClass}
                    />

                    <input
                      type="time"
                      value={shiftEnd}
                      onChange={(e) => setShiftEnd(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal */}
            <div className="rounded-md bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className={labelClass}>First Name</label>

                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Middle Name</label>

                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Last Name</label>

                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Suffix</label>

                  <input
                    type="text"
                    value={suffix}
                    onChange={(e) => setSuffix(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Sex</label>

                  {/* Make these values match the casing stored in your database */}
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className={inputClass}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Birthdate</label>

                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Doctor */}
            {role === "doctor" && (
              <div className="rounded-md bg-white p-6 shadow-sm lg:col-span-2">
                <h2 className="mb-6 text-base font-semibold text-gray-900">
                  Doctor Information
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {DOCTOR_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>

                      <input
                        type="text"
                        value={doctor[key]}
                        onChange={(e) =>
                          setDoctor((d) => ({ ...d, [key]: e.target.value }))
                        }
                        placeholder="Not provided"
                        className={inputClass}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency */}
            <div className="rounded-md bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Emergency Contact
              </h2>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Contact Name</label>

                  <input
                    type="text"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                    placeholder="Not provided"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Contact Number</label>

                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Not provided"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="rounded-md bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-2 text-base font-semibold text-gray-900">
                Change Password
              </h2>

              <p className="mb-6 text-sm text-gray-500">
                Leave the password fields blank to keep the current password.
              </p>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>New Password</label>

                  <div className="flex overflow-hidden rounded-md border border-gray-200 bg-white focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-100">
                    <input
                      type={hiddenPassword ? "password" : "text"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full px-3 py-2.5 text-sm outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setHiddenPassword(!hiddenPassword)}
                      className="px-3 text-gray-400 transition hover:text-gray-700"
                    >
                      {hiddenPassword ? (
                        <Eye size={18} />
                      ) : (
                        <EyeOff size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Confirm New Password</label>

                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Back to Profile
            </button>

            <button
              onClick={editUser}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}

              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
      <UniversalModal
        isOpen={notice !== null}
        type="success"
        title={notice?.title ?? ""}
        description={notice?.message}
        onClose={closeNotice}
        actions={[{ label: "OK", onClick: closeNotice }]}
      />
    </>
  );
}

export default UpdateUserModal;

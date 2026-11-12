import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import UniversalModal from "../../../../components/UniversalModal";
import ErrorMessage from "../../../../components/ErrorMessage";
import api from "../../../../lib/axios";
import {
  Field,
  SelectField,
  Section,
  fieldClass,
} from "./AddUserModal/FormFields";
import { DOCTOR_FIELDS } from "./utils/doctorField";
import {
  departmentAfterRoleChange,
  LAB_ROOMS,
  LAB_STAFF_ROLE,
} from "./utils/labRooms";

type Props = {
  onClose: () => void;
  loadData: () => void;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "doctor", label: "Doctor" },
  { value: LAB_STAFF_ROLE, label: "Laboratory Staff" },
  { value: "frontdesk-staff", label: "Front Desk Staff" },
];
const SEX_OPTIONS = ["Male", "Female"];
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on-leave", label: "On Leave" },
];

const DOCTOR_KEYS = new Set<string>(DOCTOR_FIELDS.map((f) => f.key));

// Local date as YYYY-MM-DD. toISOString() uses UTC, which gives
// yesterday's date before 8 AM in Manila.
const today = () => new Date().toLocaleDateString("en-CA");

const getInitialForm = () => ({
  // Account
  username: "",
  // Only used when the admin chooses to set the password.
  password: "",
  confirm_password: "",
  // Personal
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  sex: "",
  birthdate: "",
  email: "",
  contact_number: "",
  address: "",
  emergency_contact: "",
  emergency_contact_name: "",
  // Employment
  role: "",
  department: "",
  employment_status: "active",
  date_hired: today(),
  shift_start: "08:00",
  shift_end: "17:00",
  // Doctor
  prc_license_number: "",
  ptr_number: "",
  s2_license: "",
  medical_specialty: "",
  subspecialty: "",
  board_certification: "",
});
type FormState = ReturnType<typeof getInitialForm>;

// Same rule as the backend (utils/password.ts).
const MIN_PASSWORD_LENGTH = 8;

function AddUserModal({ onClose, loadData }: Props) {
  const [form, setForm] = useState<FormState>(getInitialForm);
  // "link": the employee creates their own password from an emailed link.
  // "admin": the admin sets it here and gives it to the employee.
  const [passwordMode, setPasswordMode] = useState<"link" | "admin">("link");
  const [showPassword, setShowPassword] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const isDoctor = form.role === "doctor";

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

  function handleRoleChange(nextRole: string) {
    setForm((f) => ({
      ...f,
      role: nextRole,
      department: departmentAfterRoleChange(f.role, nextRole, f.department),
    }));
  }

  // Photo
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again after Remove
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Profile photo must be smaller than 5MB.");
      return;
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
  }

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    },
    [photoPreview],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    const required: (keyof FormState)[] = [
      "username",
      "first_name",
      "last_name",
      "sex",
      "birthdate",
      "email",
      "contact_number",
      "address",
      "role",
      "date_hired",
    ];
    if (required.some((key) => !form[key])) {
      setFormError("Please fill out all required fields.");
      return;
    }
    if (passwordMode === "admin") {
      if (form.password.length < MIN_PASSWORD_LENGTH) {
        setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (form.password !== form.confirm_password) {
        setFormError("The passwords don't match.");
        return;
      }
    }
    if (form.role === LAB_STAFF_ROLE && !form.department) {
      setFormError("Please select a room for the laboratory staff.");
      return;
    }
    if (
      form.shift_start &&
      form.shift_end &&
      form.shift_start >= form.shift_end
    ) {
      setFormError("Shift start time must be earlier than shift end time.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "confirm_password") return;
        if (key === "password") {
          // Sent only when the admin sets it; never trimmed.
          if (passwordMode === "admin") formData.append("password", value);
          return;
        }
        if (!isDoctor && DOCTOR_KEYS.has(key)) return; // doctor fields only for doctors
        const v = value.trim();
        if (v) formData.append(key, v);
      });
      if (photo) formData.append("image", photo); // must match upload.single("image")

      const response = await api.post("/api/admin/add-user", formData);
      loadData();
      setNotice({
        title: "Employee added",
        message: response.data.message,
        after: onClose,
      });
    } catch (error: unknown) {
      setFormError(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Unable to complete this action. Please try again.",
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92dvh] w-full max-w-5xl flex-col rounded-md bg-white p-4 sm:p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-black">Add Employee</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            X
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto pr-2">
          {/* ACCOUNT */}
          <Section title="Account Information">
            <Field
              label="Username"
              required
              value={form.username}
              onChange={set("username")}
              width="w-44"
            />

            <fieldset className="basis-full space-y-2">
              <legend className="mb-2 text-sm text-gray-500">
                Password<span className="text-red-500"> *</span>
              </legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="password-mode"
                  checked={passwordMode === "link"}
                  onChange={() => setPasswordMode("link")}
                  className="mt-0.5 accent-sky-600"
                />
                <span>
                  Email a link so the employee creates their own password
                  <span className="block text-xs text-gray-500">
                    They can log in once they've set it. The link works once and expires in 7 days.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="password-mode"
                  checked={passwordMode === "admin"}
                  onChange={() => setPasswordMode("admin")}
                  className="mt-0.5 accent-sky-600"
                />
                <span>
                  Set the password now
                  <span className="block text-xs text-gray-500">
                    You give it to the employee; they can log in right away.
                  </span>
                </span>
              </label>
            </fieldset>

            {passwordMode === "admin" && (
              <>
                <label className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500">
                  <span className="whitespace-nowrap">
                    Password<span className="text-red-500"> *</span>
                  </span>
                  <span className="flex w-44 max-w-full items-center rounded-md border border-gray-200 focus-within:border-sky-400">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) => set("password")(e.target.value)}
                      className="h-8 w-full rounded-md bg-transparent px-2 text-sm text-gray-800 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((shown) => !shown)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="px-2 text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>
                <Field
                  label="Confirm Password"
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.confirm_password}
                  onChange={set("confirm_password")}
                  width="w-44"
                />
              </>
            )}
          </Section>

          {/* PERSONAL */}
          <Section title="Personal Information">
            {/* Profile photo (replaces the Generate ID button) */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Photo</span>
                )}
              </div>
              <div className="flex flex-col items-start gap-1">
                <label className="block max-w-40 cursor-pointer truncate text-xs text-gray-500 underline hover:text-gray-800">
                  {photo ? photo.name : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photo && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
                <span className="text-[11px] text-gray-400">
                  JPG, PNG or WEBP, max 5MB
                </span>
              </div>
            </div>

            <div className="basis-full" />
            <Field
              label="First Name"
              required
              value={form.first_name}
              onChange={set("first_name")}
              width="w-36"
            />
            <Field
              label="Middle Name"
              value={form.middle_name}
              onChange={set("middle_name")}
              width="w-36"
            />
            <Field
              label="Last Name"
              required
              value={form.last_name}
              onChange={set("last_name")}
              width="w-36"
            />
            <Field
              label="Suffix"
              value={form.suffix}
              onChange={set("suffix")}
              width="w-14"
            />

            <div className="basis-full" />
            <SelectField
              label="Sex"
              required
              value={form.sex}
              onChange={set("sex")}
              options={SEX_OPTIONS}
              width="w-24"
            />
            <Field
              label="Date of Birth"
              required
              type="date"
              value={form.birthdate}
              onChange={set("birthdate")}
              width="w-36"
            />
            <Field
              label="Email Address"
              required
              type="email"
              value={form.email}
              onChange={set("email")}
              width="w-52"
            />
            <Field
              label="Mobile Number"
              required
              value={form.contact_number}
              onChange={set("contact_number")}
              width="w-36"
            />

            <div className="basis-full" />
            <Field
              label="Address"
              required
              value={form.address}
              onChange={set("address")}
              width="w-[28rem]"
            />

            <div className="basis-full" />
            <Field
              label="Emergency Contact #"
              value={form.emergency_contact}
              onChange={set("emergency_contact")}
              width="w-36"
            />
            <Field
              label="Emergency Contact Name"
              value={form.emergency_contact_name}
              onChange={set("emergency_contact_name")}
              width="w-48"
            />
          </Section>

          {/* EMPLOYMENT */}
          <Section title="Employment Information">
            <SelectField
              label="Role"
              required
              value={form.role}
              onChange={handleRoleChange}
              options={ROLE_OPTIONS}
              placeholder="Select role"
              width="w-44"
            />

            {form.role === LAB_STAFF_ROLE ? (
              <SelectField
                label="Room"
                required
                value={form.department}
                onChange={set("department")}
                options={LAB_ROOMS}
                placeholder="Select room"
                width="w-40"
              />
            ) : (
              <Field
                label="Department"
                value={form.department}
                onChange={set("department")}
                width="w-40"
              />
            )}

            <div className="basis-full" />
            <Field
              label="Date Hired"
              required
              type="date"
              value={form.date_hired}
              onChange={set("date_hired")}
              width="w-36"
            />

            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="whitespace-nowrap">Shift Schedule</span>
              <input
                type="time"
                value={form.shift_start}
                onChange={(e) => set("shift_start")(e.target.value)}
                className={`w-28 ${fieldClass}`}
              />
              <span>-</span>
              <input
                type="time"
                value={form.shift_end}
                onChange={(e) => set("shift_end")(e.target.value)}
                className={`w-28 ${fieldClass}`}
              />
            </div>
          </Section>

          {/* DOCTOR */}
          {isDoctor && (
            <Section title="Doctor Information">
              {DOCTOR_FIELDS.map(({ key, label }) => (
                <Field
                  key={key}
                  label={label}
                  value={form[key]}
                  onChange={set(key)}
                  width="w-40"
                />
              ))}
            </Section>
          )}
        </div>

        {/* Outside the scroll area so it's always visible after clicking Add */}
        {formError && <ErrorMessage className="mt-4">{formError}</ErrorMessage>}

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-sky-400 px-5 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Employee"}
          </button>
        </div>
      </form>
      <UniversalModal
        isOpen={notice !== null}
        type="success"
        title={notice?.title ?? ""}
        description={notice?.message}
        onClose={closeNotice}
        actions={[{ label: "OK", onClick: closeNotice }]}
      />
    </div>
  );
}

export default AddUserModal;

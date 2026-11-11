import ErrorMessage from "../../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../../components/LoadingScreen";
import UniversalModal from "../../../../components/UniversalModal";
import { useRef, useState } from "react";
import type { Patient } from "../../../../interface/Patient";
import { X, Mail, Phone, MapPin, Save, ArrowLeft, Camera } from "lucide-react";
import api from "../../../../lib/axios";
import calculateAge from "../../../../utils/calculateAge";

type Props = {
  selectedPatient: Patient | null;
  onClose: () => void;
  loadData: () => Promise<void>;
};

type Notice = {
  type: "success" | "danger";
  title: string;
  message: string;
  after?: () => void;
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX_OPTIONS = ["Male", "Female"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];
const SMOKING_OPTIONS = ["Yes", "No", "Former"];
const ALCOHOL_OPTIONS = ["None", "Occasional", "Regular"];

function buildForm(p: Patient | null) {
  return {
    first_name: p?.first_name ?? "",
    middle_name: p?.middle_name ?? "",
    last_name: p?.last_name ?? "",
    suffix: p?.suffix ?? "",
    sex: p?.sex ?? "",
    birthdate: p?.birthdate?.substring(0, 10) ?? "",
    civil_status: p?.civil_status ?? "",
    blood_type: p?.blood_type ?? "",
    height_cm: p?.height_cm != null ? String(p.height_cm) : "",
    weight_kg: p?.weight_kg != null ? String(p.weight_kg) : "",

    email: p?.email ?? "",
    contact_number: p?.contact_number ?? "",
    street: p?.street ?? "",
    barangay: p?.barangay ?? "",
    city: p?.city ?? "",
    province: p?.province ?? "",
    zip_code: p?.zip_code ?? "",

    guardian_name: p?.guardian_name ?? "",
    guardian_relationship: p?.guardian_relationship ?? "",
    guardian_contact: p?.guardian_contact ?? "",

    allergies: p?.allergies ?? "",
    existing_conditions: p?.existing_conditions ?? "",
    current_medications: p?.current_medications ?? "",
    previous_surgeries: p?.previous_surgeries ?? "",
    previous_hospitalizations: p?.previous_hospitalizations ?? "",
    family_medical_history: p?.family_medical_history ?? "",
    smoking_status: p?.smoking_status ?? "",
    alcohol_consumption: p?.alcohol_consumption ?? "",
  };
}
type FormState = ReturnType<typeof buildForm>;

const inputClass =
  "w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100";
const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

// Defined outside the component so inputs don't remount on every keystroke
function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "Not provided",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Card({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-md bg-white p-6 shadow-sm ${wide ? "lg:col-span-2" : ""}`}
    >
      <h2 className="mb-6 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function EditPatientRecord({ selectedPatient, onClose, loadData }: Props) {
  const [form, setForm] = useState<FormState>(() => buildForm(selectedPatient));
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(selectedPatient?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmations and results (all hooks must stay above the early return below)
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard: nothing to edit if no patient was selected
  if (!selectedPatient) return null;
  const patient = selectedPatient;

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const fullName = [
    form.first_name,
    form.middle_name,
    form.last_name,
    form.suffix,
  ]
    .filter(Boolean)
    .join(" ");
  const initials = `${form.first_name.charAt(0)}${form.last_name.charAt(0)}`;
  const age = form.birthdate
    ? String(Math.max(0, calculateAge(form.birthdate)))
    : "";

  // Anything changed compared to what was loaded?
  const original = buildForm(patient);
  const isDirty =
    image !== null ||
    (Object.keys(form) as (keyof FormState)[]).some(
      (k) => form[k] !== original[k],
    );

  const closeNotice = () => {
    const after = notice?.after;
    setNotice(null);
    after?.();
  };

  // Every way of leaving (X, back arrow, Cancel, clicking outside) comes through here
  const requestClose = () => {
    if (saving) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be smaller than 5MB.");
      return;
    }

    // Only revoke previews we created ourselves, not the saved image URL
    if (image && preview) URL.revokeObjectURL(preview);
    setError(null);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  // Runs after the person confirms "Save changes"
  async function saveChanges() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      // Send every field, including empty ones, so a cleared value actually gets cleared
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value.trim());
      });
      if (image) formData.append("image", image); // Must match upload.single("image")

      const response = await api.put(
        `/api/fdstaff/patients/${patient.patient_id}`,
        formData,
      );

      setConfirmSave(false);
      setNotice({
        type: "success",
        title: "Patient updated",
        message: response.data.message,
        after: onClose, // close the editor only after the person clicks OK
      });
      void loadData();
    } catch (err) {
      setConfirmSave(false);
      setNotice({
        type: "danger",
        title: "Couldn't save changes",
        message:
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ||
          (err instanceof Error
            ? err.message
            : "Unable to complete this action. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={requestClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex w-[94%] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-md bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              onClick={requestClose}
              disabled={saving}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-100 hover:text-red-900 disabled:opacity-50"
            >
              <ArrowLeft size={19} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Patient Record
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Update patient and contact information
              </p>
            </div>
          </div>

          <button
            onClick={requestClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-100 hover:text-red-900 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[82vh] overflow-y-auto p-6">
          {error && <ErrorMessage className="mb-4">{error}</ErrorMessage>}

          {/* Profile Hero */}
          <div className="overflow-hidden rounded-md bg-white shadow-sm">
            <div className="h-36 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100" />

            <div className="px-8 pb-8">
              <div className="-mt-16 flex items-end justify-between">
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt={fullName}
                      className="h-32 w-32 rounded-md border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-md border-4 border-white bg-gray-200 text-4xl font-bold text-gray-500 shadow-lg">
                      {initials}
                    </div>
                  )}

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
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="mt-5">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                  {fullName}
                </h1>

                <p className="mt-1 text-sm text-gray-500">
                  {patient.patient_id}
                  {form.sex && ` • ${form.sex}`}
                  {age && ` • ${age} yrs`}
                  {form.civil_status && ` • ${form.civil_status}`}
                </p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 text-sm font-medium text-gray-600 transition hover:text-gray-900"
                >
                  Change profile photo
                </button>

                {image && (
                  <p className="mt-1 text-xs text-gray-400">{image.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Personal */}
            <Card title="Personal Information" wide>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <TextInput
                  label="First Name"
                  value={form.first_name}
                  onChange={set("first_name")}
                />
                <TextInput
                  label="Middle Name"
                  value={form.middle_name}
                  onChange={set("middle_name")}
                />
                <TextInput
                  label="Last Name"
                  value={form.last_name}
                  onChange={set("last_name")}
                />
                <TextInput
                  label="Suffix"
                  value={form.suffix}
                  onChange={set("suffix")}
                />
                <SelectInput
                  label="Sex"
                  value={form.sex}
                  onChange={set("sex")}
                  options={SEX_OPTIONS}
                  placeholder="Select sex"
                />
                <TextInput
                  label="Birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={set("birthdate")}
                />
                <div>
                  <label className={labelClass}>Age</label>
                  <div className="rounded-md bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">
                    {age || "—"}
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact */}
            <Card title="Contact Information">
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <Mail size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <TextInput
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <Phone size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <TextInput
                      label="Mobile Number"
                      value={form.contact_number}
                      onChange={set("contact_number")}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100">
                    <MapPin size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}> Address</label>
                    <textarea
                      value={form.street}
                      onChange={(e) => set("street")(e.target.value)}
                      rows={3}
                      placeholder="Street"
                      className={`${inputClass} resize-none`}
                    />
                    <textarea
                      value={form.barangay}
                      onChange={(e) => set("barangay")(e.target.value)}
                      rows={2}
                      placeholder="Barangay"
                      className={`${inputClass} resize-none`}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <TextInput
                        label="City"
                        value={form.city}
                        onChange={set("city")}
                      />
                      <TextInput
                        label="Province"
                        value={form.province}
                        onChange={set("province")}
                      />
                    </div>
                    <TextInput
                      label="ZIP Code"
                      value={form.zip_code}
                      onChange={set("zip_code")}
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Record Info */}
            <Card title="Record Information">
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Patient ID</label>
                  <div className="rounded-md bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">
                    {patient.patient_id}
                  </div>
                </div>

                <SelectInput
                  label="Civil Status"
                  value={form.civil_status}
                  onChange={set("civil_status")}
                  options={CIVIL_STATUS_OPTIONS}
                  placeholder="Select civil status"
                />
                <SelectInput
                  label="Blood Type"
                  value={form.blood_type}
                  onChange={set("blood_type")}
                  options={BLOOD_TYPES}
                  placeholder="Select blood type"
                />

                <div className="grid grid-cols-2 gap-5">
                  <TextInput
                    label="Height (CM)"
                    type="number"
                    value={form.height_cm}
                    onChange={set("height_cm")}
                  />
                  <TextInput
                    label="Weight (KG)"
                    type="number"
                    value={form.weight_kg}
                    onChange={set("weight_kg")}
                  />
                </div>
              </div>
            </Card>

            {/* Guardian */}
            <Card title="Guardian Information (If Minor)" wide>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <TextInput
                  label="Full Name"
                  value={form.guardian_name}
                  onChange={set("guardian_name")}
                />
                <TextInput
                  label="Relationship"
                  value={form.guardian_relationship}
                  onChange={set("guardian_relationship")}
                />
                <TextInput
                  label="Contact Number"
                  value={form.guardian_contact}
                  onChange={set("guardian_contact")}
                />
              </div>
            </Card>

            {/* Medical */}
            <Card title="Medical Information" wide>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <TextInput
                  label="Allergies"
                  value={form.allergies}
                  onChange={set("allergies")}
                />
                <TextInput
                  label="Existing Medical Conditions"
                  value={form.existing_conditions}
                  onChange={set("existing_conditions")}
                />
                <TextInput
                  label="Current Medications"
                  value={form.current_medications}
                  onChange={set("current_medications")}
                />
                <TextInput
                  label="Previous Surgeries"
                  value={form.previous_surgeries}
                  onChange={set("previous_surgeries")}
                />
                <TextInput
                  label="Previous Hospitalizations"
                  value={form.previous_hospitalizations}
                  onChange={set("previous_hospitalizations")}
                />
                <TextInput
                  label="Family Medical History"
                  value={form.family_medical_history}
                  onChange={set("family_medical_history")}
                />
                <SelectInput
                  label="Smoking"
                  value={form.smoking_status}
                  onChange={set("smoking_status")}
                  options={SMOKING_OPTIONS}
                  placeholder="Select"
                />
                <SelectInput
                  label="Alcohol Consumption"
                  value={form.alcohol_consumption}
                  onChange={set("alcohol_consumption")}
                  options={ALCOHOL_OPTIONS}
                  placeholder="Select"
                />
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={requestClose}
              disabled={saving}
              className="flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-red-100 hover:text-red-900 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Cancel
            </button>

            <button
              onClick={() => setConfirmSave(true)}
              disabled={saving || !isDirty}
              title={isDirty ? undefined : "No changes to save"}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <LoadingSpinner size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm: save changes */}
      <UniversalModal
        isOpen={confirmSave}
        type="info"
        title="Save changes?"
        description={`This will update ${fullName}'s patient record.`}
        onClose={() => setConfirmSave(false)}
        actions={[
          { label: "Cancel", onClick: () => setConfirmSave(false) },
          {
            label: "Save changes",
            pendingLabel: "Saving...",
            onClick: saveChanges,
          },
        ]}
      />

      {/* Confirm: leave with unsaved changes */}
      <UniversalModal
        isOpen={confirmDiscard}
        type="warning"
        title="Discard changes?"
        description="You have unsaved changes. They'll be lost if you leave."
        onClose={() => setConfirmDiscard(false)}
        actions={[
          { label: "Keep editing", onClick: () => setConfirmDiscard(false) },
          {
            label: "Discard changes",
            variant: "danger",
            onClick: () => {
              setConfirmDiscard(false);
              onClose();
            },
          },
        ]}
      />

      {/* Result of saving */}
      <UniversalModal
        isOpen={notice !== null}
        type={notice?.type ?? "info"}
        title={notice?.title ?? ""}
        description={notice?.message}
        onClose={closeNotice}
        actions={[{ label: "OK", onClick: closeNotice }]}
      />
    </>
  );
}

export default EditPatientRecord;

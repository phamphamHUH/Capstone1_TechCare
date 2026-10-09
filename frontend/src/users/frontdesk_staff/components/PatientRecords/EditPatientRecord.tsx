import { useRef, useState } from "react";
import type { Patient } from "../../../../interface/Patient";
import { X, Mail, Phone, MapPin, Save, ArrowLeft, Camera } from "lucide-react";
import api from "../../../../lib/axios";

type Props = {
  selectedPatient: Patient | null;
  onClose: () => void;
  loadData: () => Promise<void>;
};

function EditPatientRecord({ selectedPatient, onClose, loadData }: Props) {
  const [firstName, setFirstName] = useState(selectedPatient?.first_name ?? "");
  const [middleName, setMiddleName] = useState(
    selectedPatient?.middle_name ?? "",
  );
  const [lastName, setLastName] = useState(selectedPatient?.last_name ?? "");
  const [suffix, setSuffix] = useState(selectedPatient?.suffix ?? "");
  const [sex, setSex] = useState(selectedPatient?.sex ?? "");
  const [birthdate, setBirthdate] = useState(
    selectedPatient?.birthdate?.substring(0, 10) ?? "",
  );
  const [civilStatus, setCivilStatus] = useState(
    selectedPatient?.civil_status ?? "",
  );
  const [bloodType, setBloodType] = useState(selectedPatient?.blood_type ?? "");

  const [email, setEmail] = useState(selectedPatient?.email ?? "");
  const [contactNumber, setContactNumber] = useState(
    selectedPatient?.contact_number ?? "",
  );
  const [address, setAddress] = useState(selectedPatient?.address ?? "");

  const [emergencyContactName, setEmergencyContactName] = useState(
    selectedPatient?.emergency_contact_name ?? "",
  );
  const [emergencyContact, setEmergencyContact] = useState(
    selectedPatient?.emergency_contact ?? "",
  );

  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState(selectedPatient?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Guard: nothing to edit if no patient was selected
  if (!selectedPatient) return null;

  // Copy into a local const so TS keeps this narrowed to `Patient`
  // (non-null) inside nested closures like handleSave below.
  const patient = selectedPatient;

  const fullName = [firstName, middleName, lastName, suffix]
    .filter(Boolean)
    .join(" ");
  const initials = `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`;

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile photo must be less than 5MB.");
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("first_name", firstName.trim());
      formData.append("middle_name", middleName.trim());
      formData.append("last_name", lastName.trim());
      formData.append("suffix", suffix.trim());
      formData.append("sex", sex);
      formData.append("birthdate", birthdate);
      formData.append("civil_status", civilStatus);
      formData.append("blood_type", bloodType.trim());
      formData.append("email", email.trim());
      formData.append("contact_number", contactNumber.trim());
      formData.append("address", address.trim());
      formData.append("emergency_contact_name", emergencyContactName.trim());
      formData.append("emergency_contact", emergencyContact.trim());

      if (image) {
        formData.append("image", image); // Must match upload.single("image")
      }

      const response = await api.put(
        `/api/fdstaff/patients/${patient.patient_id}`,
        formData,
      );
      alert(response.data.message);
      await loadData();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100";

  const labelClass = "mb-1.5 block text-xs font-medium text-gray-500";

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 flex w-[94%] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl bg-gray-50 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
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
                Edit Patient Record
              </h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Update patient and contact information
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
        <div className="max-h-[82vh] overflow-y-auto p-6">
          {error && (
            <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Profile Hero */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
            <div className="h-36 bg-linear-to-r from-gray-100 via-gray-50 to-gray-100" />

            <div className="px-8 pb-8">
              <div className="-mt-16 flex items-end justify-between">
                <div className="relative">
                  {preview ? (
                    <img
                      src={preview}
                      alt={fullName}
                      className="h-32 w-32 rounded-3xl border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-32 w-32 items-center justify-center rounded-3xl border-4 border-white bg-gray-200 text-4xl font-bold text-gray-500 shadow-lg">
                      {initials}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-gray-900 text-white shadow-lg transition hover:bg-gray-800"
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
                  {sex && ` • ${sex}`}
                  {civilStatus && ` • ${civilStatus}`}
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
            {/* Contact */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Contact Information
              </h2>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
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
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
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

            {/* Record Info */}
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-base font-semibold text-gray-900">
                Record Information
              </h2>

              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Patient ID</label>
                  <div className="rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700">
                    {patient.patient_id}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Civil Status</label>
                  <select
                    value={civilStatus}
                    onChange={(e) => setCivilStatus(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select civil status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Blood Type</label>
                  <input
                    type="text"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    placeholder="Not provided"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Personal */}
            <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
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
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
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

            {/* Emergency */}
            <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
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
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default EditPatientRecord;

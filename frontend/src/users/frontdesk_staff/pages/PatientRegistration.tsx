import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import api from "../../../lib/axios";
import calculateAge from "../../../utils/calculateAge";

type PatientRegistrationProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

const initialForm = {
  first_name: "", middle_name: "", last_name: "", suffix: "", sex: "",
  birthdate: "", civil_status: "", blood_type: "", height_cm: "", weight_kg: "",

  contact_number: "", email: "", 
  street: "", barangay: "", city: "", province: "", zip_code: "",

  guardian_name: "", guardian_relationship: "", guardian_contact: "",

  allergies: "", existing_conditions: "", current_medications: "",
  previous_surgeries: "", previous_hospitalizations: "",
  family_medical_history: "", smoking_status: "", alcohol_consumption: "",
};
type FormState = typeof initialForm;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX_OPTIONS = ["Male", "Female"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];
const SMOKING_OPTIONS = ["Yes", "No", "Former"];
const ALCOHOL_OPTIONS = ["None", "Occasional", "Regular"];

// Defined outside the component so inputs don't remount (and lose focus) on every keystroke
function Field({
  label, value, onChange, width = "w-40", type = "text", readOnly = false, placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  width?: string;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`${width} h-8 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 placeholder:text-gray-300 focus:border-sky-400 focus:outline-none read-only:bg-gray-50`}
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options, width = "w-28",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  width?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-500">
      <span className="whitespace-nowrap">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${width} h-8 rounded-lg border border-gray-200 px-1 text-sm text-gray-800 focus:border-sky-400 focus:outline-none`}
      >
        <option value=""></option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">{children}</div>
    </section>
  );
}

function PatientRegistration({ open, setOpen, loadData, loading }: PatientRegistrationProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const age = form.birthdate
    ? String(Math.max(0, calculateAge(form.birthdate)))
    : "";

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return alert("Please select an image file.");
    if (file.size > 5 * 1024 * 1024) return alert("Profile photo must be smaller than 5MB.");
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
  }

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function resetForm() {
    setForm(initialForm);
    removePhoto();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { first_name, last_name, sex, birthdate, email, contact_number, street, barangay, city, province, zip_code } = form;
    if (!first_name || !last_name || !sex || !birthdate || !email || !contact_number || !street || !barangay || !city || !province || !zip_code) {
      alert("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (image) formData.append("image", image);

      const response = await api.post("/api/fdstaff/patients", formData);
      alert(response.data.message);
      resetForm();
      await loadData();
    } catch (error: unknown) {
      alert(
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Something went wrong",
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 min-w-0">

      <div className="w-full px-6 pb-8">
        <h2 className="mb-4 text-xl font-bold text-black">Register Patient</h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-2xl border border-gray-200 p-6"
        >
          <Section title="Personal Information">
            <Field label="First Name *" value={form.first_name} onChange={set("first_name")} width="w-36" />
            <Field label="Middle Name" value={form.middle_name} onChange={set("middle_name")} width="w-36" />
            <Field label="Last Name *" value={form.last_name} onChange={set("last_name")} width="w-36" />
            <Field label="Suffix" value={form.suffix} onChange={set("suffix")} width="w-12" />
            <SelectField label="Sex *" value={form.sex} onChange={set("sex")} options={SEX_OPTIONS} width="w-20" />

            <Field label="Date of Birth *" type="date" value={form.birthdate} onChange={set("birthdate")} width="w-36" />
            <Field label="Age" value={age} readOnly width="w-14" />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Profile Photo</span>
              <label className="flex h-8 w-36 cursor-pointer items-center justify-center truncate rounded-lg border border-gray-200 px-2 text-xs text-gray-400 underline hover:text-gray-700">
                {image ? image.name : "Upload Photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {image && (
                <button type="button" onClick={removePhoto} className="text-xs hover:text-gray-900">
                  Remove
                </button>
              )}
            </div>
            <SelectField label="Civil Status *" value={form.civil_status} onChange={set("civil_status")} options={CIVIL_STATUS_OPTIONS} width="w-36" />
            <SelectField label="Blood Type *" value={form.blood_type} onChange={set("blood_type")} options={BLOOD_TYPES} width="w-20" />
            <Field label="Height(CM) *" value={form.height_cm} onChange={set("height_cm")} width="w-14" type="number" />
            <Field label="Weight(KG) *" value={form.weight_kg} onChange={set("weight_kg")} width="w-14" type="number" />
          </Section>

          <Section title="Contact Information">
            <Field label="Mobile Number *" value={form.contact_number} onChange={set("contact_number")} width="w-36" />
            <Field label="Email Address *" type="email" value={form.email} onChange={set("email")} width="w-44" />
            <div className="basis-full" />
            <Field label="Street *" value={form.street} onChange={set("street")} width="w-56" />
            <Field label="Barangay *" value={form.barangay} onChange={set("barangay")} width="w-24" />
            <Field label="City/Municipality *" value={form.city} onChange={set("city")} width="w-28" />
            <Field label="Province *" value={form.province} onChange={set("province")} width="w-28" />
            <Field label="ZIP Code *" value={form.zip_code} onChange={set("zip_code")} width="w-28" />
          </Section>

          <Section title="Guardian Information (If Minor)">
            <Field label="Full Name" value={form.guardian_name} onChange={set("guardian_name")} width="w-60" />
            <Field label="Relationship" value={form.guardian_relationship} onChange={set("guardian_relationship")} width="w-44" />
            <Field label="Contact Number" value={form.guardian_contact} onChange={set("guardian_contact")} width="w-40" />
          </Section>

          <Section title="Medical Information">
            <Field label="Allergies" value={form.allergies} onChange={set("allergies")} width="w-36" />
            <Field label="Existing Medical Conditions" value={form.existing_conditions} onChange={set("existing_conditions")} width="w-36" />
            <Field label="Current Medications" value={form.current_medications} onChange={set("current_medications")} width="w-36" />
            <div className="basis-full" />
            <Field label="Previous Surgeries" value={form.previous_surgeries} onChange={set("previous_surgeries")} width="w-36" />
            <Field label="Previous Hospitalizations" value={form.previous_hospitalizations} onChange={set("previous_hospitalizations")} width="w-36" />
            <div className="basis-full" />
            <Field label="Family Medical History" value={form.family_medical_history} onChange={set("family_medical_history")} width="w-36" />
            <SelectField label="Smoking" value={form.smoking_status} onChange={set("smoking_status")} options={SMOKING_OPTIONS} width="w-28" />
            <SelectField label="Alcohol Consumption" value={form.alcohol_consumption} onChange={set("alcohol_consumption")} options={ALCOHOL_OPTIONS} width="w-32" />
          </Section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-lg bg-sky-400 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            >
              <UserPlus size={16} />
              {submitting ? "Registering…" : "Register"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default PatientRegistration;
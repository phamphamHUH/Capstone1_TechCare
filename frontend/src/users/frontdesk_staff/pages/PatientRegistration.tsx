import ErrorMessage from "../../../components/ErrorMessage";
import { LoadingSpinner } from "../../../components/LoadingScreen";
import { useEffect, useState } from "react";
import { Upload, User, UserPlus } from "lucide-react";
import api from "../../../lib/axios";
import calculateAge from "../../../utils/calculateAge";
import UniversalModal from "../../../components/UniversalModal";

type PatientRegistrationProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  loadData: () => Promise<void>;
  loading: boolean;
};

type Notice = {
  type: "success" | "danger";
  title: string;
  message: string;
  after?: () => void;
};

const initialForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  sex: "",
  birthdate: "",
  civil_status: "",
  blood_type: "",
  height_cm: "",
  weight_kg: "",

  contact_number: "",
  email: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  zip_code: "",

  guardian_name: "",
  guardian_relationship: "",
  guardian_contact: "",

  allergies: "",
  existing_conditions: "",
  current_medications: "",
  previous_surgeries: "",
  previous_hospitalizations: "",
  family_medical_history: "",
  smoking_status: "",
  alcohol_consumption: "",
};
type FormState = typeof initialForm;

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const SEX_OPTIONS = ["Male", "Female"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];
const SMOKING_OPTIONS = ["Yes", "No", "Former"];
const ALCOHOL_OPTIONS = ["None", "Occasional", "Regular"];
const RELATIONSHIP_OPTIONS = [
  "Mother",
  "Father",
  "Sibling",
  "Grandparent",
  "Nephew",
  "Others",
];
const ALLERGY_CHOICES = ["Penicillin", "Sulfa Drugs", "Latex", "Shellfish"];
const CONDITION_CHOICES = [
  "Hypertension",
  "Diabetes",
  "Asthma",
  "Heart Disease",
];

const joinList = (checked: string[], other: string) =>
  [...checked, other.trim()].filter(Boolean).join(", ");

// Components are defined outside so inputs don't remount (and lose focus) on every keystroke
function LabelText({ text }: { text: string }) {
  const required = text.endsWith("*");
  return (
    <span>
      {required ? text.slice(0, -1).trimEnd() : text}
      {required && <span className="ml-1 text-red-500">*</span>}
    </span>
  );
}

const inputCls =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-normal text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 read-only:bg-slate-100";

function Field({
  label,
  value,
  onChange,
  className = "",
  type = "text",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  className?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label
      className={`flex min-w-0 flex-col gap-1.5 text-sm font-medium text-black-700 ${className}`}
    >
      <LabelText text={label} />
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={inputCls}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium text-black-700">
      <LabelText text={label} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        <option value="">Select</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sm font-bold text-sky-600">
          {number}
        </span>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Quadrant({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {title}
      </h4>
      {children}
    </div>
  );
}

function CheckGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {options.map((item) => (
        <label
          key={item}
          className="flex h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:border-sky-300"
        >
          <input
            type="checkbox"
            checked={selected.includes(item)}
            onChange={() => onToggle(item)}
            className="h-4 w-4 rounded border-slate-300 accent-sky-500"
          />
          {item}
        </label>
      ))}
    </div>
  );
}

const ROW_4 = "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4";
const ROW_5 = "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-5";

function PatientRegistration({ loadData }: PatientRegistrationProps) {
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relationshipChoice, setRelationshipChoice] = useState("");
  const [allergyChecks, setAllergyChecks] = useState<string[]>([]);
  const [otherAllergies, setOtherAllergies] = useState("");
  const [conditionChecks, setConditionChecks] = useState<string[]>([]);
  const [otherConditions, setOtherConditions] = useState("");

  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const closeNotice = () => {
    const after = notice?.after;
    setNotice(null);
    after?.();
  };

  const set = (key: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  const toggle =
    (list: string[], setList: (v: string[]) => void) => (item: string) =>
      setList(
        list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
      );

  const age = form.birthdate
    ? String(Math.max(0, calculateAge(form.birthdate)))
    : "";

  // True when there is anything to lose, so Clear only asks when it matters
  const hasData =
    image !== null ||
    relationshipChoice !== "" ||
    allergyChecks.length > 0 ||
    conditionChecks.length > 0 ||
    otherAllergies.trim() !== "" ||
    otherConditions.trim() !== "" ||
    (Object.keys(form) as (keyof FormState)[]).some(
      (k) => form[k] !== initialForm[k],
    );

  // For other relationship, we need to set the guardian_relationship field to empty string if the choice is not "Others"
  function handleRelationshipChange(value: string) {
    setRelationshipChoice(value);
    set("guardian_relationship")(value === "Others" ? "" : value);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/"))
      return setFormError("Please select an image file.");
    if (file.size > 5 * 1024 * 1024)
      return setFormError("Profile photo must be smaller than 5MB.");
    if (preview) URL.revokeObjectURL(preview);
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setImage(null);
    setPreview(null);
  }

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function resetForm() {
    setForm(initialForm);
    setRelationshipChoice("");
    setAllergyChecks([]);
    setOtherAllergies("");
    setConditionChecks([]);
    setOtherConditions("");
    removePhoto();
  }

  async function handleSubmit(e: React.FormEvent) {
    setFormError("");
    e.preventDefault();

    const {
      first_name,
      last_name,
      sex,
      birthdate,
      email,
      contact_number,
      street,
      barangay,
      city,
      province,
      zip_code,
    } = form;
    if (
      !first_name ||
      !last_name ||
      !sex ||
      !birthdate ||
      !email ||
      !contact_number ||
      !street ||
      !barangay ||
      !city ||
      !province ||
      !zip_code
    ) {
      setFormError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, string> = {
        ...form,
        allergies: joinList(allergyChecks, otherAllergies),
        existing_conditions: joinList(conditionChecks, otherConditions),
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      if (image) formData.append("image", image);

      const response = await api.post("/api/fdstaff/patients", formData);
      resetForm();
      setNotice({
        type: "success",
        title: "Patient registered",
        message: response.data.message,
      });
      await loadData();
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

  const isOtherRelationship = relationshipChoice === "Others";

  return (
    <main className="min-w-0 flex-1 bg-slate-50">
      <div className="w-full space-y-6 px-6 pb-8 pt-6">
        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900">
            Register Patient
          </h2>
        </div>

        {formError && <ErrorMessage>{formError}</ErrorMessage>}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. Personal Information */}
          <Section number={1} title="Personal Information">
            {/* Upload image */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User size={28} />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Profile Photo
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-sky-400 bg-sky-50 px-4 text-sm font-semibold text-sky-600 hover:bg-sky-100">
                    <Upload size={16} />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {image && (
                    <>
                      <span className="max-w-[16rem] truncate text-sm text-slate-400">
                        {image.name}
                      </span>
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="text-sm text-slate-500 hover:text-slate-900"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* First Middle Last Suffix */}
            <div className={ROW_4}>
              <Field
                label="First Name *"
                value={form.first_name}
                onChange={set("first_name")}
              />
              <Field
                label="Middle Name"
                value={form.middle_name}
                onChange={set("middle_name")}
              />
              <Field
                label="Last Name *"
                value={form.last_name}
                onChange={set("last_name")}
              />
              <Field
                label="Suffix"
                value={form.suffix}
                onChange={set("suffix")}
              />
            </div>

            {/* Date of Birth, Age, Sex, Civil Status, Blood Type */}
            <div className={ROW_5}>
              <Field
                label="Date of Birth *"
                type="date"
                value={form.birthdate}
                onChange={set("birthdate")}
              />
              <Field label="Age" value={age} readOnly />
              <SelectField
                label="Sex *"
                value={form.sex}
                onChange={set("sex")}
                options={SEX_OPTIONS}
              />
              <SelectField
                label="Civil Status *"
                value={form.civil_status}
                onChange={set("civil_status")}
                options={CIVIL_STATUS_OPTIONS}
              />
              <SelectField
                label="Blood Type *"
                value={form.blood_type}
                onChange={set("blood_type")}
                options={BLOOD_TYPES}
              />
            </div>

            {/* Existing fields */}
            <div className={ROW_5}>
              <Field
                label="Height (cm) *"
                value={form.height_cm}
                onChange={set("height_cm")}
                type="number"
              />
              <Field
                label="Weight (kg) *"
                value={form.weight_kg}
                onChange={set("weight_kg")}
                type="number"
              />
            </div>
          </Section>

          {/* 2. Contact Information */}
          <Section number={2} title="Contact Information">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Field
                label="Mobile Number *"
                value={form.contact_number}
                onChange={set("contact_number")}
              />
              <Field
                label="Email Address *"
                type="email"
                value={form.email}
                onChange={set("email")}
              />
            </div>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_0.6fr]">
              <Field
                label="Street *"
                value={form.street}
                onChange={set("street")}
              />
              <Field
                label="Barangay *"
                value={form.barangay}
                onChange={set("barangay")}
              />
              <Field
                label="City/Municipality *"
                value={form.city}
                onChange={set("city")}
              />
              <Field
                label="Province *"
                value={form.province}
                onChange={set("province")}
              />
              <Field
                label="ZIP Code *"
                value={form.zip_code}
                onChange={set("zip_code")}
              />
            </div>
          </Section>

          {/* 3. Guardian */}
          <Section number={3} title="Guardian Information (If Minor)">
            <div
              className={`grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 ${
                isOtherRelationship ? "lg:grid-cols-4" : "lg:grid-cols-3"
              }`}
            >
              <Field
                label="Full Name"
                value={form.guardian_name}
                onChange={set("guardian_name")}
              />
              <SelectField
                label="Relationship"
                value={relationshipChoice}
                onChange={handleRelationshipChange}
                options={RELATIONSHIP_OPTIONS}
              />
              {isOtherRelationship && (
                <Field
                  label="Specify Relationship"
                  value={form.guardian_relationship}
                  onChange={set("guardian_relationship")}
                />
              )}
              <Field
                label="Contact Number"
                value={form.guardian_contact}
                onChange={set("guardian_contact")}
              />
            </div>
          </Section>

          {/* 4. Medical Information */}
          <Section number={4} title="Medical Information">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Quadrant 1 */}
              <Quadrant title="Known Allergies">
                <CheckGroup
                  options={ALLERGY_CHOICES}
                  selected={allergyChecks}
                  onToggle={toggle(allergyChecks, setAllergyChecks)}
                />
                <input
                  value={otherAllergies}
                  onChange={(e) => setOtherAllergies(e.target.value)}
                  placeholder="Other allergies (if any)"
                  className={inputCls}
                />
              </Quadrant>

              {/* Quadrant 2 */}
              <Quadrant title="Existing Conditions">
                <CheckGroup
                  options={CONDITION_CHOICES}
                  selected={conditionChecks}
                  onToggle={toggle(conditionChecks, setConditionChecks)}
                />
                <input
                  value={otherConditions}
                  onChange={(e) => setOtherConditions(e.target.value)}
                  placeholder="Other conditions or remarks"
                  className={inputCls}
                />
              </Quadrant>

              {/* Quadrant 3 */}
              <Quadrant title="Medications & Surgeries">
                <Field
                  label="Current Medications"
                  value={form.current_medications}
                  onChange={set("current_medications")}
                />
                <Field
                  label="Previous Surgeries"
                  value={form.previous_surgeries}
                  onChange={set("previous_surgeries")}
                />
                <Field
                  label="Previous Hospitalizations"
                  value={form.previous_hospitalizations}
                  onChange={set("previous_hospitalizations")}
                />
              </Quadrant>

              {/* Quadrant 4 */}
              <Quadrant title="Lifestyle & Habits">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Smoking"
                    value={form.smoking_status}
                    onChange={set("smoking_status")}
                    options={SMOKING_OPTIONS}
                  />
                  <SelectField
                    label="Alcohol Consumption"
                    value={form.alcohol_consumption}
                    onChange={set("alcohol_consumption")}
                    options={ALCOHOL_OPTIONS}
                  />
                </div>
                <Field
                  label="Family Medical History"
                  value={form.family_medical_history}
                  onChange={set("family_medical_history")}
                />
              </Quadrant>
            </div>
          </Section>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => (hasData ? setConfirmClear(true) : resetForm())}
              disabled={submitting}
              className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-md bg-sky-400 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {submitting ? (
                <LoadingSpinner size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {submitting ? "Registering…" : "Register"}
            </button>
          </div>
        </form>
      </div>

      {/* Result of registering */}
      <UniversalModal
        isOpen={notice !== null}
        type={notice?.type ?? "info"}
        title={notice?.title ?? ""}
        description={notice?.message}
        onClose={closeNotice}
        actions={[{ label: "OK", onClick: closeNotice }]}
      />

      {/* Confirm before wiping the form */}
      <UniversalModal
        isOpen={confirmClear}
        type="warning"
        title="Clear the form?"
        description="Everything you've entered, including the photo, will be removed."
        onClose={() => setConfirmClear(false)}
        actions={[
          { label: "Keep editing", onClick: () => setConfirmClear(false) },
          {
            label: "Clear form",
            variant: "danger",
            onClick: () => {
              resetForm();
              setConfirmClear(false);
            },
          },
        ]}
      />
    </main>
  );
}

export default PatientRegistration;

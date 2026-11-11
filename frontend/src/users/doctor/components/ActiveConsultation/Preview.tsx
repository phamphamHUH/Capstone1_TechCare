import { useCallback, useEffect, useState } from "react";
import { Printer, Download, ArrowLeft, CheckCircle2 } from "lucide-react";
import api from "#lib/axios";
import type { QueueEntry } from "../../../../interface/Queue";
import LoadingScreen from "../../../../components/LoadingScreen";
import ErrorMessage from "../../../../components/ErrorMessage";
import { formatDateTime } from "../../../../utils/formats";
import ConfirmDialog from "#components/ConfirmDialog";

type PrescriptionItem = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
};

type PrescriptionPreviewData = {
  prescription_id: string;
  consultation_record_id: string;
  prescribed_at: string;
  valid_until: string | null;
  status: string;
  prescription_items: PrescriptionItem[];
  notes: string | null;

  patient_id: string;
  patient_name: string;
  birthdate: string;
  sex: string;
  age: number;

  prescriber_id: string;
  prescriber_name: string;
  prc_license_number: string | null;
  medical_specialty: string | null;
};

type PreviewProps = {
  selectedQueue: QueueEntry;
  setSelectedQueue: React.Dispatch<React.SetStateAction<QueueEntry | null>>;
  onCompleted?: () => void | Promise<void>;
};

function Preview({
  selectedQueue,
  setSelectedQueue,
  onCompleted,
}: PreviewProps) {
  const [prescription, setPrescription] =
    useState<PrescriptionPreviewData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [paperSize, setPaperSize] = useState<PaperSize>("Half Long Bond");
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    clinicLogo: true,
    doctorSignature: true,
    clinicInfo: true,
    notes: true,
  });

  const loadPrescription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(
        `/api/doctor/prescriptions/preview/${encodeURIComponent(
          selectedQueue.consultation_record_id,
        )}`,
      );

      setPrescription(response.data.prescription);
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to load prescription preview.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedQueue.consultation_record_id]);

  useEffect(() => {
    const initialize = async () => {
      void loadPrescription();
    };

    void initialize();
  }, [loadPrescription]);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintOption = (option: keyof typeof printOptions) => {
    setPrintOptions((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const handleCompleteConsultation = async () => {
    try {
      setError(null);
      await api.patch(
        `/api/doctor/consultation-queues/${encodeURIComponent(selectedQueue.queue_id)}/complete`,
        { room: selectedQueue.room, action: "complete" },
      );

      const consultationKey = selectedQueue.consultation_record_id;
      sessionStorage.removeItem(
        `prescription-draft:${consultationKey}:prescriptionItems`,
      );
      sessionStorage.removeItem(`prescription-draft:${consultationKey}:notes`);
      setSelectedQueue(null);
      onCompleted?.();
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Failed to complete the consultation.",
      );
    } finally {
      setConfirmingComplete(false);
    }
  };

  if (loading) {
    return <LoadingScreen variant="page" message="Loading prescription..." />;
  }

  if (error || !prescription) {
    return (
      <div className="px-6 space-y-4">
        <ErrorMessage>
          {error || "Prescription information is unavailable."}
        </ErrorMessage>

        <button
          type="button"
          onClick={loadPrescription}
          className="rounded-md bg-blue-600 px-4 py-2 text-xs text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const prescribedDate = formatDateTime(prescription.prescribed_at);

  const printOptionsList: {
    key: keyof typeof printOptions;
    label: string;
  }[] = [
    { key: "clinicLogo", label: "Include Clinic Logo" },
    { key: "doctorSignature", label: "Include Doctor Signature" },
    { key: "clinicInfo", label: "Include Clinic Info" },
    { key: "notes", label: "Include Notes" },
  ];

  const paperDimensions = {
    A4: {
      width: 210,
      height: 297,
    },
    A5: {
      width: 148,
      height: 210,
    },
    "Half Long Bond": {
      width: 215.9,
      height: 165.1,
    },
  };

  type PaperSize = keyof typeof paperDimensions;

  const selectedPaper = paperDimensions[paperSize];

  return (
    <div className=" space-y-5">
      <style>
        {`
        @page {
        size: ${paperSize} portrait;
        margin: 12mm;
        }

        @media print {
        html,
        body,
        #root {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
        }

        /* Hide the application */
        body * {
            visibility: hidden !important;
        }

        /* Isolate the prescription from the dashboard layout */
        .prescription-paper,
        .prescription-paper * {
            visibility: visible !important;
        }

        .prescription-paper {
            position: fixed !important;
            inset: 0 !important;

            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            min-height: 0 !important;

            aspect-ratio: auto !important;

            margin: 0 !important;
            padding: 0 !important;

            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;

            background: white !important;
            overflow: visible !important;
        }

        .no-print {
            display: none !important;
        }

        .prescription-paper * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
        }

        .prescription-paper table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
        }

        .prescription-paper th,
        .prescription-paper td {
            overflow-wrap: break-word !important;
            word-break: normal !important;
        }

        .prescription-paper tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
        }
    `}
      </style>
      {/* PAGE HEADER */}
      <div className="no-print">
        <h1 className="text-xl font-bold text-gray-900">
          Prescription Preview
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Review the prescription details before saving or printing.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 items-start">
        {/* PRESCRIPTION DOCUMENT */}
        <div className="xl:col-span-7 min-w-0">
          <article
            className="prescription-paper relative w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
            style={{
              aspectRatio: `${selectedPaper.width} / ${selectedPaper.height}`,
            }}
          >
            {/* CLINIC HEADER */}
            <header className="flex justify-between items-start gap-4 border-b-2 border-gray-800 pb-5">
              <div className="flex items-center gap-4">
                {printOptions.clinicLogo && (
                  <img
                    src="../../../../../public/assets/images/reyna-g-logo.png"
                    alt="Reyna G Logo"
                    className="w-20"
                  />
                )}

                <div>
                  <h2 className="text-sm font-extrabold text-gray-900">
                    REYNA G DIAGNOSTIC MEDICAL CLINIC
                  </h2>

                  {printOptions.clinicInfo && (
                    <div className="mt-1 text-[10px] leading-relaxed text-gray-600">
                      <p>123 Health St., Manila, Philippines</p>
                      <p>Tel: (02) 8123 4567 · Email: info@reynag.com</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right text-[10px]">
                <p>
                  <span className="text-gray-400">Date: </span>
                  <strong>{prescribedDate?.date ?? "N/A"}</strong>
                </p>
                <p>
                  <span className="text-gray-400">PR No: </span>
                  <strong>{prescription.prescription_id}</strong>
                </p>
                <p>
                  <span className="text-gray-400">Consultation ID: </span>
                  <strong>{prescription.consultation_record_id}</strong>
                </p>
              </div>
            </header>

            {/* TITLE */}
            <div className="relative py-6 text-center">
              <span className="absolute left-0 top-6 text-2xl font-bold italic text-blue-900">
                ℞
              </span>

              <h1 className="text-lg font-extrabold tracking-[0.3em] text-gray-900">
                PRESCRIPTION
              </h1>
            </div>

            {/* PATIENT INFORMATION */}
            <section className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-[11px]">
              <div className="flex gap-2">
                <span className="text-gray-400">Patient Name:</span>
                <strong>{prescription.patient_name}</strong>
              </div>

              <div className="flex gap-2">
                <span className="text-gray-400">Age / Sex:</span>
                <strong>
                  {prescription.age} years old / {prescription.sex}
                </strong>
              </div>

              <div className="flex gap-2">
                <span className="text-gray-400">Patient ID:</span>
                <strong>{prescription.patient_id}</strong>
              </div>

              <div className="flex gap-2">
                <span className="text-gray-400">Date of Birth:</span>
                <strong>
                  {formatDateTime(prescription.birthdate)?.date ?? "N/A"}
                </strong>
              </div>
            </section>

            {/* MEDICATION TABLE */}
            <section className="mt-6 w-full overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full table-fixed border-collapse text-left text-[10px]">
                <colgroup>
                  <col className="w-[5%]" />
                  <col className="w-[24%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[24%]" />
                </colgroup>

                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Medication</th>
                    <th className="p-2">Dosage</th>
                    <th className="p-2">Frequency</th>
                    <th className="p-2">Duration</th>
                    <th className="p-2">Instructions</th>
                  </tr>
                </thead>

                <tbody>
                  {prescription.prescription_items.map((item, index) => (
                    <tr
                      key={`${item.name}-${index}`}
                      className="border-t border-gray-100"
                    >
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-bold wrap-break-words">
                        {item.name}
                      </td>
                      <td className="p-2 wrap-break-words">{item.dosage}</td>
                      <td className="p-2 wrap-break-words">{item.frequency}</td>
                      <td className="p-2 wrap-break-words">{item.duration}</td>
                      <td className="p-2 wrap-break-words">
                        {item.instructions || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ADDITIONAL NOTES */}
            {printOptions.notes && prescription.notes && (
              <section className="mt-6 rounded-lg bg-gray-50 p-4 text-[10px]">
                <h3 className="mb-2 font-bold">Additional Notes:</h3>
                <p className="whitespace-pre-wrap italic leading-relaxed text-gray-600">
                  {prescription.notes}
                </p>
              </section>
            )}

            {/* PRESCRIBER SIGNATURE */}
            {printOptions.doctorSignature && (
              <section className="mt-20 ml-auto w-56 text-center text-[10px]">
                <div className="mb-2 border-b border-gray-800" />

                <p className="font-bold text-gray-900">
                  Dr. {prescription.prescriber_name}
                </p>

                <p className="text-gray-600">
                  License No. {prescription.prc_license_number || "N/A"}
                </p>

                <p className="text-gray-400">
                  {prescription.medical_specialty || "Physician"}
                </p>
              </section>
            )}
          </article>
        </div>

        {/* PRINT OPTIONS */}
        <aside className="no-print xl:col-span-3">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-sm font-bold">Print Options</h2>

            <div className="space-y-2">
              <label
                htmlFor="paper-size"
                className="text-xs font-medium text-gray-600"
              >
                Paper Size
              </label>

              <select
                id="paper-size"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as PaperSize)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-blue-500"
              >
                <option value="Half Long Bond">Half Long Bond</option>
                <option value="A4">A4 (Recommended)</option>
                <option value="A5">A5</option>
              </select>
            </div>

            <div className="my-5 border-t border-gray-100" />

            <div className="space-y-3">
              {printOptionsList.map((option) => (
                <label
                  key={option.key}
                  className="flex cursor-pointer items-center gap-2 text-xs text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={printOptions[option.key]}
                    onChange={() => handlePrintOption(option.key)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>

            <div className="my-5 border-t border-gray-100" />

            <button
              type="button"
              onClick={handlePrint}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Printer size={15} />
              Print Prescription
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} />
              Download PDF
            </button>
          </section>
        </aside>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="no-print flex items-center justify-between border-t border-gray-200 pt-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmingComplete(true)}
            className="rounded-md border cursor-pointer border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white"
          >
            Complete Consultation
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          <CheckCircle2 size={15} />
          Saved Prescription
        </div>
      </div>
      {confirmingComplete && (
        <ConfirmDialog
          tone="info"
          icon={CheckCircle2}
          title="Prescription Saved"
          confirmLabel="Complete Consultation"
          cancelLabel="Stay"
          description="Do you want to complete the consultation now, or stay on this page?"
          onCancel={() => setConfirmingComplete(false)}
          onConfirm={handleCompleteConsultation}
        />
      )}
    </div>
  );
}

export default Preview;

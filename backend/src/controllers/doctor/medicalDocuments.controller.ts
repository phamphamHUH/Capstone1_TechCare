import type { Request, Response } from "express";
import { sql } from "../../config/db.js";
import { resolveDoctorId } from "./utils/resolveDoctorId.js";

const CERTIFICATE = "\\mmedical[[:space:]_-]+certificate\\M";
const CLEARANCE = "\\mmedical[[:space:]_-]+clearance\\M";
const DOCUMENT_TYPES = ["medical_certificate", "medical_clearance"] as const;
type DocumentType = (typeof DOCUMENT_TYPES)[number];

const INPUT_TYPES = new Set([
  "text_field",
  "number_field",
  "checkbox",
  "date_field",
  "table",
]);
const MAX_TEXT = 5000;
const MAX_TABLE_ROWS = 100;

type TemplateComponent = {
  form_component_id: string;
  type_id: string;
  label: string;
  field_key: string;
  settings?: { required?: boolean; tableColumns?: { id: string }[] } | null;
  validation?: { required?: boolean } | null;
};

export async function getMedicalDocumentTemplates(_req: Request, res: Response) {
  try {
    const templates = await sql`
      WITH medical_templates AS (
        SELECT ft.*, s.service_name, s.service_category,
          CASE
            WHEN CONCAT_WS(' ', ft.form_name, s.service_name, s.service_category) ~* ${CERTIFICATE}
              THEN 'medical_certificate'
            WHEN CONCAT_WS(' ', ft.form_name, s.service_name, s.service_category) ~* ${CLEARANCE}
              THEN 'medical_clearance'
          END AS document_type
        FROM form_templates ft
        JOIN services s ON s.service_id = ft.service_id
        WHERE ft.status = 'Published'
      )
      SELECT mt.*,
        COALESCE((
          SELECT jsonb_agg(to_jsonb(fc) ORDER BY fc.display_order, fc.form_component_id)
          FROM form_components fc WHERE fc.form_id = mt.form_id
        ), '[]'::jsonb) AS components
      FROM medical_templates mt
      WHERE mt.document_type IS NOT NULL
      ORDER BY mt.document_type, mt.form_name, mt.form_id
    `;

    return res.status(200).json({ templates });
  } catch (error) {
    console.error("GET MEDICAL DOCUMENT TEMPLATES ERROR:", error);
    return res.status(500).json({ message: "Medical document templates could not be loaded." });
  }
}

// GET /api/doctor/medical-document-patients?search=
export async function searchMedicalDocumentPatients(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const pattern = `%${search}%`;
  try {
    const patients = await sql`
      SELECT patient_id, first_name, middle_name, last_name, suffix, sex, birthdate,
        civil_status, contact_number,
        CONCAT_WS(' ', first_name, middle_name, last_name, suffix) AS full_name,
        CONCAT_WS(', ', NULLIF(street, ''), NULLIF(barangay, ''), NULLIF(city, ''), NULLIF(province, '')) AS address,
        DATE_PART('year', AGE(CURRENT_DATE, birthdate))::INT AS age
      FROM patients
      WHERE account_status = TRUE
        AND (${search}::text = ''
          OR patient_id ILIKE ${pattern}::text
          OR CONCAT_WS(' ', first_name, middle_name, last_name, suffix) ILIKE ${pattern}::text
          OR CONCAT_WS(' ', first_name, last_name) ILIKE ${pattern}::text
          OR CONCAT_WS(', ', last_name, first_name) ILIKE ${pattern}::text)
      ORDER BY last_name, first_name, patient_id
      LIMIT 20
    `;
    return res.status(200).json({ patients });
  } catch (error) {
    console.error("SEARCH MEDICAL DOCUMENT PATIENTS ERROR:", error);
    return res.status(500).json({ message: "Patients could not be loaded." });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isEmpty(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === false ||
    (typeof value === "string" && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Keeps only values for the template's own input fields, in plain JSON shapes.
function cleanValues(
  components: TemplateComponent[],
  raw: unknown,
): { values: Record<string, unknown> } | { error: string } {
  if (!isRecord(raw)) return { error: "Form values must be an object." };
  const values: Record<string, unknown> = {};

  for (const component of components) {
    if (!INPUT_TYPES.has(component.type_id)) continue;
    const key = component.field_key;
    const value = Object.hasOwn(raw, key) ? raw[key] : undefined;
    const required = Boolean(component.settings?.required || component.validation?.required);

    if (isEmpty(value)) {
      if (required) return { error: `${component.label || key} is required.` };
      continue;
    }

    if (component.type_id === "table") {
      if (!Array.isArray(value) || value.length > MAX_TABLE_ROWS) {
        return { error: `${component.label || key} has invalid rows.` };
      }
      const columns = (component.settings?.tableColumns ?? []).map((column) => column.id);
      values[key] = value.map((row) =>
        Object.fromEntries(
          columns.map((column) => {
            const cell = isRecord(row) ? row[column] : undefined;
            return [column, typeof cell === "string" || typeof cell === "number" ? String(cell).slice(0, MAX_TEXT) : ""];
          }),
        ),
      );
    } else if (component.type_id === "checkbox") {
      if (typeof value === "boolean") values[key] = value;
      else if (Array.isArray(value) && value.every((item) => typeof item === "string")) values[key] = value;
      else return { error: `${component.label || key} has an invalid selection.` };
    } else if (typeof value === "string") {
      if (value.length > MAX_TEXT) return { error: `${component.label || key} is too long.` };
      values[key] = value;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      values[key] = value;
    } else {
      return { error: `${component.label || key} has an invalid value.` };
    }
  }
  return { values };
}

const DOCUMENT_COLUMNS = (alias = "md") => `
  ${alias}.document_id, ${alias}.document_type, ${alias}.patient_id, ${alias}.form_id,
  ${alias}.template_snapshot, ${alias}.field_values, ${alias}.remarks, ${alias}.issued_by,
  ${alias}.physician_name, ${alias}.physician_license, ${alias}.status, ${alias}.issued_at
`;

// POST /api/doctor/medical-documents
// Fills a published certificate/clearance template for a patient and releases
// it. The attending physician is always the signed-in doctor.
export async function issueMedicalDocument(req: Request, res: Response) {
  const doctorId = resolveDoctorId(req);
  if (!doctorId) return res.status(401).json({ message: "Doctor could not be identified." });

  const { patient_id, form_id, values, remarks } = req.body ?? {};
  if (typeof patient_id !== "string" || !patient_id.trim()) {
    return res.status(400).json({ message: "Select a patient." });
  }
  if (typeof form_id !== "string" || !form_id.trim()) {
    return res.status(400).json({ message: "Select a document template." });
  }
  if (remarks != null && (typeof remarks !== "string" || remarks.length > MAX_TEXT)) {
    return res.status(400).json({ message: "Remarks must be text up to 5000 characters." });
  }

  try {
    const [doctor] = await sql`
      SELECT user_id, role, prc_license_number,
        CONCAT_WS(' ', first_name, middle_name, last_name, suffix) AS full_name
      FROM users WHERE user_id = ${doctorId}
    `;
    if (!doctor || doctor.role !== "doctor") {
      return res.status(403).json({ message: "Only doctors can issue medical documents." });
    }

    const [patient] = await sql`
      SELECT patient_id FROM patients WHERE patient_id = ${patient_id} AND account_status = TRUE
    `;
    if (!patient) return res.status(404).json({ message: "Patient not found." });

    const [template] = await sql`
      SELECT ft.form_id, ft.form_name, ft.form_description, ft.paper_size, ft.service_id,
        ft.status, ft.version, s.service_name, s.service_category,
        CASE
          WHEN CONCAT_WS(' ', ft.form_name, s.service_name, s.service_category) ~* ${CERTIFICATE}
            THEN 'medical_certificate'
          WHEN CONCAT_WS(' ', ft.form_name, s.service_name, s.service_category) ~* ${CLEARANCE}
            THEN 'medical_clearance'
        END AS document_type,
        COALESCE((
          SELECT jsonb_agg(to_jsonb(fc) ORDER BY fc.display_order, fc.form_component_id)
          FROM form_components fc WHERE fc.form_id = ft.form_id
        ), '[]'::jsonb) AS components
      FROM form_templates ft
      JOIN services s ON s.service_id = ft.service_id
      WHERE ft.form_id = ${form_id}
    `;
    if (!template || template.status !== "Published" || !DOCUMENT_TYPES.includes(template.document_type as DocumentType)) {
      return res.status(404).json({ message: "This medical document template is not available." });
    }

    const cleaned = cleanValues(template.components as TemplateComponent[], values);
    if ("error" in cleaned) return res.status(400).json({ message: cleaned.error });

    // Same numbering style as prescriptions; retry if two doctors release at once.
    for (let attempt = 0; attempt < 3; attempt++) {
      const [last] = await sql`
        SELECT document_id FROM medical_documents
        WHERE document_id LIKE 'MD-%'
        ORDER BY SPLIT_PART(document_id, '-', 2)::int DESC
        LIMIT 1
      `;
      const next = last ? Number(String(last.document_id).split("-")[1]) + 1 : 1;
      const documentId = `MD-${String(next).padStart(4, "0")}`;
      try {
        const [document] = await sql.query(
          `INSERT INTO medical_documents
            (document_id, document_type, patient_id, form_id, template_snapshot, field_values,
             remarks, issued_by, physician_name, physician_license)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10)
           RETURNING ${DOCUMENT_COLUMNS("medical_documents")}`,
          [
            documentId,
            template.document_type,
            patient_id,
            form_id,
            JSON.stringify(template),
            JSON.stringify(cleaned.values),
            typeof remarks === "string" && remarks.trim() ? remarks.trim() : null,
            doctorId,
            String(doctor.full_name).trim(),
            doctor.prc_license_number || null,
          ],
        );
        return res.status(201).json({ message: "Medical document released to the patient.", document });
      } catch (error) {
        if ((error as { code?: string }).code !== "23505" || attempt === 2) throw error;
      }
    }
    return res.status(409).json({ message: "Please try releasing the document again." });
  } catch (error) {
    console.error("ISSUE MEDICAL DOCUMENT ERROR:", error);
    return res.status(500).json({ message: "The medical document could not be released. Please try again." });
  }
}

const withPatient = `
  CONCAT_WS(' ', p.first_name, p.middle_name, p.last_name, p.suffix) AS patient_name,
  p.sex, p.birthdate, p.civil_status,
  CONCAT_WS(', ', NULLIF(p.street, ''), NULLIF(p.barangay, ''), NULLIF(p.city, ''), NULLIF(p.province, '')) AS address,
  DATE_PART('year', AGE(md.issued_at::date, p.birthdate))::INT AS age
`;

// GET /api/doctor/medical-documents — documents the signed-in doctor released.
export async function getIssuedMedicalDocuments(req: Request, res: Response) {
  const doctorId = resolveDoctorId(req);
  if (!doctorId) return res.status(401).json({ message: "Doctor could not be identified." });
  try {
    const documents = await sql.query(
      `SELECT ${DOCUMENT_COLUMNS()}, ${withPatient}
       FROM medical_documents md
       JOIN patients p ON p.patient_id = md.patient_id
       WHERE md.issued_by = $1
       ORDER BY md.issued_at DESC, md.document_id DESC
       LIMIT 100`,
      [doctorId],
    );
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("GET ISSUED MEDICAL DOCUMENTS ERROR:", error);
    return res.status(500).json({ message: "Issued medical documents could not be loaded." });
  }
}

// GET /api/patient/medical-documents — mounted behind patientMiddleware.
export async function getPatientMedicalDocuments(_req: Request, res: Response) {
  const patientId = res.locals.patientId as string;
  try {
    const documents = await sql.query(
      `SELECT ${DOCUMENT_COLUMNS()}, ${withPatient}
       FROM medical_documents md
       JOIN patients p ON p.patient_id = md.patient_id
       WHERE md.patient_id = $1 AND md.status = 'Released'
       ORDER BY md.issued_at DESC, md.document_id DESC`,
      [patientId],
    );
    return res.status(200).json({ documents });
  } catch (error) {
    console.error("GET PATIENT MEDICAL DOCUMENTS ERROR:", error);
    return res.status(500).json({ message: "Medical documents could not be loaded." });
  }
}

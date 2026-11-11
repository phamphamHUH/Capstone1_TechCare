import type {
  AnalysisRequest,
  AnalysisStatus,
  AnalysisTest,
  PatientCategory,
} from "../../../../interface/LaboratoryAnalysis";
type Row = Record<string, unknown>;
const record = (value: unknown): Row =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Row)
    : {};
const text = (...values: unknown[]) =>
  String(
    values.find((value) => typeof value === "string" && value.trim()) ?? "",
  );
const flag = (value: unknown) => value === true || value === "true";
const normal = (value: unknown) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ");

const timestamp = (...values: unknown[]) =>
  values.find(
    (value): value is string =>
      typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value) &&
      Number.isFinite(new Date(value).getTime()),
  ) ?? "";

export function collectionDay(value: string) {
  if (!value || !Number.isFinite(new Date(value).getTime())) {
    return "";
  }

  // Values without an offset are already local dates.
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(value)) {
    return value.slice(0, 10);
  }

  return new Date(value).toLocaleDateString("en-CA", {
  });
}

export function patientAge(birthdate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birthdate)) {
    return null;
  }

  const today = new Date().toLocaleDateString("en-CA", {
  });

  const [year, month, day] = birthdate.slice(0, 10).split("-").map(Number);
  const [nowYear, nowMonth, nowDay] = today.split("-").map(Number);
  const age =
    nowYear -
    year -
    (nowMonth < month || (nowMonth === month && nowDay < day) ? 1 : 0);
  return age >= 0 && age <= 130 ? age : null;
}

export function normalizeAnalysisRequests(
  payload: unknown,
  room: string,
): AnalysisRequest[] {
  const envelope = record(payload);
  const rows = Array.isArray(payload)
    ? payload
    : (envelope.requests ?? envelope.labRequests ?? envelope.data);

  if (!Array.isArray(rows)) {
    throw new Error("The laboratory request response was not a list.");
  }

  const requests = new Map<string, AnalysisRequest>();

  for (const value of rows) {
    const outer = record(value);

    const row = {
      ...outer,
      ...record(outer.request),
    };

    const patient = record(row.patient);
    const collection = record(row.sample_collection);
    const collectedAt = timestamp(
      row.sample_collected_at,
      row.collected_at,
      collection.collected_at,
      row.sample_collected,
    );
    const status = normal(
      row.analysis_status || row.result_status || row.status,
    );
    const requestStatus = normal(row.request_status || row.status);
    const sampleStatus = normal(
      row.sample_status || row.sample_collection_status,
    );
    const sampleCollected =
      Boolean(collectedAt) ||
      flag(row.samples_collected) ||
      flag(row.sample_collected) ||
      flag(row.is_sample_collected) ||
      flag(collection.collected) ||
      [
        "collected",
        "sample collected",
        "samples collected",
        "specimen collected",
      ].includes(normal(row.sample_status || row.sample_collection_status)) ||
      ["sample collected", "samples collected", "specimen collected"].includes(
        requestStatus,
      );

    const accepted =
      flag(row.is_accepted) ||
      Boolean(timestamp(row.accepted_at)) ||
      [
        "accepted",
        "serving",
        "ready",
        "ready for analysis",
        "awaiting analysis",
        "in progress",
        "completed",
        "released",
        "sample collected",
        "samples collected",
        "specimen collected",
      ].includes(requestStatus);

    const collectionDenied =
      [
        row.samples_collected,
        row.sample_collected,
        row.is_sample_collected,
        collection.collected,
      ].some((value) => value === false || value === "false") ||
      ["not collected", "pending collection", "awaiting collection"].includes(
        sampleStatus,
      );

    if (
      !accepted ||
      !sampleCollected ||
      collectionDenied ||
      row.is_accepted === false ||
      row.is_accepted === "false" ||
      ["cancelled", "rejected"].includes(requestStatus) ||
      ["cancelled", "rejected"].includes(status)
    ) {
      continue;
    }

    const requestId = text(row.request_id);

    if (!requestId) {
      continue;
    }

    const birthdate = text(
      row.birthdate,
      row.date_of_birth,
      patient.birthdate,
      patient.date_of_birth,
    );
    const age = typeof row.age === "number" ? row.age : patientAge(birthdate);
    const rawCategory = normal(
      row.priority_category || row.patient_category || row.category,
    );
    const category: PatientCategory =
      flag(row.is_pwd) || rawCategory === "pwd"
        ? "PWD"
        : flag(row.is_pregnant) || rawCategory === "pregnant"
          ? "Pregnant"
          : flag(row.is_senior) ||
              rawCategory.includes("senior") ||
              (age !== null && age >= 60)
            ? "Senior Citizen"
            : flag(row.is_priority)
              ? "Priority"
              : "Normal";
    const analysisStatus: AnalysisStatus = ["completed", "released"].includes(
      status,
    )
      ? "Completed"
      : ["in progress", "processing", "analysing", "analyzing"].includes(status)
        ? "In Progress"
        : "Ready for Analysis";
    const rawTests = Array.isArray(row.items)
      ? row.items
      : Array.isArray(row.tests)
        ? row.tests
        : [row];

    const tests: AnalysisTest[] = rawTests.flatMap((entry) => {
      if (typeof entry === "string") {
        return [
          {
            id: "",
            serviceId: "",
            name: entry,
            description: "",
          },
        ];
      }

      const item = record(entry);
      const service = record(item.service);
      const itemRoom = text(service.room, item.room, row.room);

      if (itemRoom && itemRoom !== room) {
        return [];
      }

      const name = text(
        item.service_name,
        item.test_type,
        item.test_name,
        service.service_name,
      );

      return name
        ? [
            {
              id: text(item.item_id),
              serviceId: text(item.service_id, service.service_id),
              name,
              description: text(
                item.description,
                service.service_type,
                row.service_type,
              ),
            },
          ]
        : [];
    });

    const rowRoom = text(row.room);

    if (rowRoom && rowRoom !== room) {
      continue;
    }

    if (rawTests.length && !tests.length) {
      continue;
    }

    const key = `${requestId}:${analysisStatus}`;
    const existing = requests.get(key);

    if (existing) {
      for (const test of tests) {
        if (
          !existing.tests.some(
            (item) =>
              (item.id && item.id === test.id) || item.name === test.name,
          )
        ) {
          existing.tests.push(test);
        }
      }

      continue;
    }

    const firstName = text(row.first_name, patient.first_name);
    const lastName = text(row.last_name, patient.last_name);

    requests.set(key, {
      requestId,
      queueId: text(row.queue_id),
      patientId: text(row.patient_id, patient.patient_id),

      patientName:
        text(row.patient_name, patient.full_name) ||
        [
          lastName,
          [
            firstName,
            text(row.middle_name, patient.middle_name),
            text(row.suffix, patient.suffix),
          ]
            .filter(Boolean)
            .join(" "),
        ]
          .filter(Boolean)
          .join(", "),

      birthdate,
      age,
      sex: text(row.sex, patient.sex),
      requestedAt: text(row.requested_at),
      collectedAt,
      accepted,
      sampleCollected,
      room,
      priority: flag(row.is_priority) || category !== "Normal",
      category,
      status: analysisStatus,
      consultationType: text(row.consultation_type) || "Laboratory Request",
      tests,
    });
  }

  return [...requests.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  );
}

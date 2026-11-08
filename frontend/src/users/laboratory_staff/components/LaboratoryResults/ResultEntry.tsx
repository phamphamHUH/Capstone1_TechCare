import LoadingScreen, { LoadingSpinner } from "../../../../components/LoadingScreen";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronRight, Eye, Search, TestTubeDiagonal } from "lucide-react";
import type {
  AnalysisRequest,
  LaboratoryReportData,
  ReportTemplate,
  ResultValues,
  ResultReleaseResponse,
} from "../../../../interface/LaboratoryAnalysis";
import { inputTypes, validateResults } from "./laboratoryValidation";
import {
  apiMessage,
  resultEntryApi,
  submitResultEntry,
} from "./laboratoryResultsApi";
import { CategoryBadge, formatLabDate } from "./AnalysisList";
import { matchingTest } from "./reportTemplates";
import { AnalysisButton, AnalysisNotice, FlaskBadge } from "./AnalysisUi";
import TemplateFields from "./TemplateFields";
import ResultSuccessOverlay from "./ResultSuccessOverlay";
import PrintResultView from "./PrintResultView";

type ResultEntryProps = {
  request: AnalysisRequest;
  onCancel: () => void;
  onSaved?: () => void;
  initialStep?: 1 | 2;
  preloadedTemplates?: readonly ReportTemplate[];
};

function applicableTemplates(
  templates: readonly ReportTemplate[],
  request: AnalysisRequest,
) {
  return templates.filter(
    (template) =>
      template.status === "Published" && matchingTest(request, template),
  );
}

function initialValues(template: ReportTemplate): ResultValues {
  return Object.fromEntries(
    template.components
      .filter((component) => inputTypes.has(component.type))
      .map((component) => [
        component.fieldKey,
        component.type === "table"
          ? []
          : component.type === "checkbox"
            ? component.settings.checkboxOptions?.length
              ? []
              : false
            : (component.settings.defaultValue ?? ""),
      ]),
  );
}

export default function ResultEntry({
  request,
  onCancel,
  onSaved,
  initialStep = 1,
  preloadedTemplates,
}: ResultEntryProps) {
  const [templates, setTemplates] = useState<ReportTemplate[]>(() =>
    applicableTemplates(preloadedTemplates ?? [], request),
  );
  const [templateId, setTemplateId] = useState(
    () =>
      applicableTemplates(preloadedTemplates ?? [], request)[0]?.form_id ?? "",
  );
  const [step, setStep] = useState(initialStep);
  const [search, setSearch] = useState("");

  const [values, setValues] = useState<ResultValues>(() => {
    const selected = applicableTemplates(preloadedTemplates ?? [], request)[0];
    return initialStep === 2 && selected ? initialValues(selected) : {};
  });

  const [remarks, setRemarks] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(preloadedTemplates === undefined);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const [release, setRelease] = useState<ResultReleaseResponse | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const template = templates.find((item) => item.form_id === templateId);

  const dirty =
    !savedResultId &&
    (remarks.trim().length > 0 ||
      Object.values(values).some((value) =>
        Array.isArray(value)
          ? value.length > 0
          : value !== "" && value !== false && value != null,
      ));

  const readOnly = saving || savedResultId !== null;

  const visibleTemplates = useMemo(
    () =>
      templates.filter((item) =>
        `${item.form_name} ${item.category}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
      ),
    [templates, search],
  );

  const initials = (request.patientName || request.patientId)
    .replace(/,/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase();
  const editableCount =
    template?.components.filter((component) => inputTypes.has(component.type))
      .length ?? 0;

  const previewReports = useMemo<LaboratoryReportData[]>(
    () =>
      template
        ? [
            {
              request,
              template,
              values,
              remarks,
              resultId: savedResultId ?? undefined,
              releaseStatus: release?.status,
              releasedAt: release?.released_at,
              onlineAvailable: release?.online_available,
            },
          ]
        : [],
    [request, template, values, remarks, savedResultId, release],
  );

  function returnToEntry() {
    setShowPreview(false);
    requestAnimationFrame(() =>
      document.getElementById("preview-laboratory-result")?.focus(),
    );
  }

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setFailure("");

      try {
        if (preloadedTemplates === undefined && !resultEntryApi.loadTemplates) {
          throw new Error("Report template loading is not available yet.");
        }

        const items =
          preloadedTemplates ??
          (await resultEntryApi.loadTemplates!(request, controller.signal));

        if (controller.signal.aborted) {
          return;
        }

        const published = applicableTemplates(items, request);
        setTemplates(published);
        setTemplateId(published[0]?.form_id ?? "");
        setValues(
          initialStep === 2 && published[0] ? initialValues(published[0]) : {},
        );
        setErrors({});
        setTouched(new Set());
        setSubmitted(false);
      } catch (error) {
        if (!controller.signal.aborted) {
          setTemplates([]);
          setTemplateId("");
          setFailure(
            apiMessage(error, "Unable to load published report templates."),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [request, preloadedTemplates, initialStep, reload]);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const preventLoss = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  function cancel() {
    if (
      !saving &&
      (!dirty ||
        window.confirm("Discard the laboratory values entered in this form?"))
    ) {
      onCancel();
    }
  }

  function chooseTemplate(next: ReportTemplate) {
    if (
      next.form_id === templateId ||
      (dirty &&
        !window.confirm(
          "Changing the template will clear the values entered in this form. Continue?",
        ))
    ) {
      return;
    }

    setTemplateId(next.form_id);
    setValues(initialValues(next));
    setErrors({});
    setTouched(new Set());
    setSubmitted(false);
    setNotice("");
    setFailure("");
  }

  function continueToResults() {
    if (!template || !matchingTest(request, template) || !editableCount) {
      return;
    }

    if (!Object.keys(values).length) {
      setValues(initialValues(template));
    }

    setStep(2);
    setFailure("");
    setNotice("");
  }

  function showErrors(next: ResultValues, seen: Set<string>) {
    if (!template) {
      return;
    }

    const validation = validateResults(template.components, next);

    setErrors(
      Object.fromEntries(
        Object.entries(validation).filter(
          ([path]) =>
            submitted || path === "_form" || seen.has(path.split(".")[0]),
        ),
      ),
    );
  }

  function changeValue(key: string, value: unknown) {
    const next = {
      ...values,
      [key]: value,
    };

    setValues(next);
    setNotice("");

    if (submitted || touched.has(key)) {
      showErrors(next, touched);
    }
  }

  function blurField(key: string) {
    const nextTouched = new Set(touched).add(key);
    setTouched(nextTouched);
    showErrors(values, nextTouched);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    if (!template || readOnly) {
      return;
    }

    setSubmitted(true);
    setNotice("");
    setFailure("");
    const validation = validateResults(template.components, values);

    if (remarks.length > 5000) {
      validation._notes = "Enter at most 5,000 characters.";
    }

    setErrors(validation);

    if (Object.keys(validation).length) {
      setFailure("Please correct the highlighted fields before saving.");
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }

    if (!resultEntryApi.saveResult) {
      setNotice(
        "All fields meet the template rules. Result saving is not available yet; your entries are still in this form.",
      );

      return;
    }

    const test = matchingTest(request, template);
    setSaving(true);
    let committed = false;

    try {
      const result = await submitResultEntry({
        room: request.room,
        request_id: request.requestId,
        patient_id: request.patientId,
        lab_item_id: test?.id || null,
        service_id: test?.serviceId || template.service_id,
        form_id: template.form_id,
        template_version: template.version ?? null,
        template_snapshot: template,
        values,
        remarks: remarks.trim(),
      });

      setNotice("Laboratory result saved successfully.");
      setSavedResultId(result.result_id);
      setShowSuccess(true);
      committed = true;
      setErrors({});
      setSubmitted(false);
      setTouched(new Set());
    } catch (error) {
      const response = (
        error as {
          response?: {
            data?: {
              errors?: Record<string, string>;
            };
          };
        }
      ).response?.data;

      if (response?.errors) {
        setErrors(response.errors);
      }

      setFailure(
        apiMessage(
          error,
          "Unable to save the result. Your entries have been kept.",
        ),
      );
    } finally {
      setSaving(false);
    }

    if (committed) {
      onSaved?.();
    }
  }

  return (
    <>
      <div hidden={showPreview}>
        <section
          className="min-w-0 bg-white font-sans text-sm text-gray-900"
          aria-labelledby="result-entry-heading"
        >
          <div className="flex items-center gap-4 rounded-2xl border border-gray-300 px-5 py-4">
            <FlaskBadge small />
            <div>
              <h1
                className="text-2xl font-semibold outline-none"
                ref={headingRef}
                tabIndex={-1}
                id="result-entry-heading"
              >
                Enter Laboratory Result
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {step === 1
                  ? "Select a published report template for the patient's laboratory request."
                  : "Input the laboratory results using the selected report template."}
              </p>
            </div>
          </div>
          <nav
            className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1"
            aria-label="Result entry steps"
          >
            <button
              type="button"
              onClick={() => !readOnly && setStep(1)}
              aria-current={step === 1 ? "step" : undefined}
              className={`flex cursor-pointer items-center gap-2 border-b-2 pt-1 pb-3 text-sm text-sky-700 disabled:cursor-not-allowed ${step === 1 ? "border-sky-500" : "border-gray-200"}`}
              disabled={readOnly}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-sky-500 text-white">
                {step === 2 ? <Check size={16} /> : "1"}
              </span>
              1. Choose Report Template
            </button>
            <i className="mb-2 hidden h-px w-4 bg-gray-200 sm:block" />
            <button
              type="button"
              onClick={continueToResults}
              disabled={step === 1 || readOnly}
              aria-current={step === 2 ? "step" : undefined}
              className={`flex items-center gap-2 border-b-2 pt-1 pb-3 text-sm ${step === 2 ? "border-sky-500 text-sky-700" : "border-transparent text-gray-500"}`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full font-semibold ${step === 2 ? "bg-sky-500 text-white" : "bg-gray-100"}`}
              >
                2
              </span>
              2. Input Results
            </button>
          </nav>
          <div className="grid min-h-[620px] grid-cols-1 items-start gap-6 py-4 xl:grid-cols-[minmax(270px,32%)_minmax(0,1fr)]">
            <aside className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white">
              <h2 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-base font-semibold">
                Patient & Request Information
              </h2>
              <div className="p-4">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base font-semibold text-sky-700">
                    {initials || "—"}
                  </span>
                  <div className="min-w-0 wrap-anywhere">
                    <h3 className="mb-1 text-base font-semibold">
                      {request.patientName || "Name not provided"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {request.patientId}
                      {" · "}
                      {request.age === null
                        ? "Age not provided"
                        : `${request.age} yrs`}
                      {" · "}
                      {request.sex || "Sex not provided"}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {request.category !== "Normal" && (
                        <CategoryBadge request={request} compact />
                      )}
                      {request.sex && (
                        <span className="rounded-full bg-sky-50 px-2 py-px text-xs text-sky-700">
                          {request.sex}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <dl className="mb-4 space-y-3 text-sm [&_dt]:mb-1 [&_dt]:text-xs [&_dt]:text-gray-500 [&_dd]:leading-relaxed [&_dd]:wrap-anywhere">
                  <div>
                    <dt>Request No.</dt>
                    <dd>{request.requestId}</dd>
                  </div>
                  <div>
                    <dt>Consultation Type</dt>
                    <dd>{request.consultationType}</dd>
                  </div>
                  <div>
                    <dt>Request Date & Time</dt>
                    <dd>{formatLabDate(request.requestedAt)}</dd>
                  </div>
                </dl>
                <details className="rounded-lg bg-gray-50 p-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                    <TestTubeDiagonal
                      className="shrink-0 text-sky-600"
                      size={17}
                      strokeWidth={1.2}
                    />
                    <div>
                      <span className="text-xs text-gray-500">
                        Requested Tests
                      </span>
                      <p className="mt-0.5 text-sm">
                        {request.tests.map((test) => test.name).join(", ") ||
                          "Not specified"}
                      </p>
                    </div>
                    <ChevronDown
                      className="ml-auto shrink-0 text-gray-500"
                      size={13}
                    />
                  </summary>
                  <ul className="mt-2 list-disc pl-7 text-sm leading-relaxed">
                    {request.tests.map((test, index) => (
                      <li key={test.id || `${test.name}-${index}`}>
                        {test.name}
                      </li>
                    ))}
                  </ul>
                </details>
                <p className="flex flex-wrap items-center gap-1 pt-2 text-xs text-gray-500">
                  <Check size={12} className="text-green-500" />
                  Samples collected
                  {request.collectedAt && (
                    <span>
                      {" · "}
                      {formatLabDate(request.collectedAt)}
                    </span>
                  )}
                </p>
              </div>
            </aside>
            {step === 1 || !template ? (
              <section
                className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white"
                aria-labelledby="report-template-heading"
              >
                <h2
                  className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-base font-semibold"
                  id="report-template-heading"
                >
                  Report Template
                </h2>
                <div className="p-3">
                  <label className="mb-3 flex h-9 items-center gap-2 rounded-lg border border-gray-300 px-3 text-gray-400 focus-within:border-sky-400">
                    <Search size={14} />
                    <input
                      className="w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-gray-400"
                      aria-label="Search report templates"
                      placeholder="Search templates..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </label>
                  {loading ? (
                    <LoadingScreen message="Loading published templates..." />
                  ) : (
                    <div
                      className="flex flex-col gap-1.5"
                      role="radiogroup"
                      aria-label="Report template"
                    >
                      {visibleTemplates.map((item) => (
                        <label
                          key={item.form_id}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 ${templateId === item.form_id ? "border-sky-400 bg-sky-50 text-sky-700" : "border-gray-300 hover:border-sky-300"}`}
                        >
                          <input
                            className="size-3 shrink-0 accent-sky-500"
                            type="radio"
                            name="report-template"
                            value={item.form_id}
                            checked={templateId === item.form_id}
                            onChange={() => chooseTemplate(item)}
                          />
                          <div>
                            <strong className="block text-sm font-medium">
                              {item.form_name}
                            </strong>
                            <small className="mt-0.5 block text-xs text-gray-500">
                              {item.category}
                            </small>
                          </div>
                          <span className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500">
                            <TestTubeDiagonal size={17} strokeWidth={1.4} />
                          </span>
                          <ChevronRight size={14} />
                        </label>
                      ))}
                      {!visibleTemplates.length && !failure && (
                        <p className="flex min-h-40 items-center justify-center p-5 text-center text-gray-500">
                          {search
                            ? "No templates match your search."
                            : "No published templates match the requested tests."}
                        </p>
                      )}
                    </div>
                  )}
                  {!loading && template && !editableCount && !failure && (
                    <AnalysisNotice>
                      This published template is available, but its result
                      fields and validation rules are not available yet. Result
                      entry will be enabled once those fields are provided.
                    </AnalysisNotice>
                  )}
                  {failure && (
                    <>
                      <AnalysisNotice error>{failure}</AnalysisNotice>
                      <AnalysisButton
                        variant="secondary"
                        disabled={loading}
                        onClick={() => setReload((value) => value + 1)}
                      >
                        Reload templates
                      </AnalysisButton>
                    </>
                  )}
                </div>
                <footer className="flex items-center justify-between gap-3 border-t border-gray-300 p-3">
                  <AnalysisButton variant="secondary" onClick={cancel}>
                    Cancel
                  </AnalysisButton>
                  <AnalysisButton
                    disabled={loading || !template || !editableCount}
                    onClick={continueToResults}
                  >
                    Continue
                    <ChevronRight size={13} />
                  </AnalysisButton>
                </footer>
              </section>
            ) : (
              <form
                ref={formRef}
                className="min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-white"
                onSubmit={save}
                noValidate
                aria-label={`${template.form_name} results`}
              >
                <header className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                    <TestTubeDiagonal size={21} strokeWidth={1.4} />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold">
                      {template.form_name}
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      {template.category}
                      {" · "}
                      {editableCount}
                      {" Parameters"}
                    </p>
                  </div>
                  <span className="ml-auto hidden rounded-sm bg-sky-50 px-2 py-1 text-xs text-sky-700 sm:block">
                    {template.form_id}
                  </span>
                </header>
                <div className="p-4">
                  {failure && <AnalysisNotice error>{failure}</AnalysisNotice>}
                  {notice && <AnalysisNotice>{notice}</AnalysisNotice>}
                  {errors._form && (
                    <p role="alert" className="mb-2 text-sm text-rose-700">
                      {errors._form}
                    </p>
                  )}
                  <TemplateFields
                    components={template.components}
                    values={values}
                    errors={errors}
                    onChange={changeValue}
                    onBlur={blurField}
                    disabled={readOnly}
                  />
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">
                      Additional Notes
                    </h3>
                    <label
                      className="mb-1.5 block text-xs text-gray-500"
                      htmlFor="laboratory-notes"
                    >
                      Notes / Observations
                    </label>
                    <textarea
                      className="min-h-20 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-50 aria-invalid:border-rose-400"
                      id="laboratory-notes"
                      rows={3}
                      value={remarks}
                      maxLength={5000}
                      disabled={readOnly}
                      placeholder="Enter remarks or additional observations..."
                      onChange={(event) => {
                        setRemarks(event.target.value);
                        setNotice("");
                      }}
                      aria-invalid={Boolean(errors._notes)}
                      aria-describedby={
                        errors._notes ? "laboratory-notes-error" : undefined
                      }
                    />
                    {errors._notes && (
                      <p
                        id="laboratory-notes-error"
                        className="mt-1 text-xs text-rose-700"
                      >
                        {errors._notes}
                      </p>
                    )}
                  </div>
                  {!resultEntryApi.saveResult && (
                    <p className="pt-2 text-xs leading-relaxed text-gray-500">
                      Saving is not available yet. You can enter and validate
                      results in this form.
                    </p>
                  )}
                </div>
                <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-300 p-3">
                  <AnalysisButton
                    variant="secondary"
                    disabled={saving}
                    onClick={cancel}
                  >
                    Cancel
                  </AnalysisButton>
                  <AnalysisButton
                    variant="link"
                    className="ml-auto"
                    disabled={readOnly}
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={13} />
                    Change template
                  </AnalysisButton>
                  <AnalysisButton
                    variant="secondary"
                    id="preview-laboratory-result"
                    disabled={saving}
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye size={13} />
                    Preview
                  </AnalysisButton>
                  <AnalysisButton type="submit" disabled={readOnly}>
                    {saving && (
                      <LoadingSpinner size={14} />
                    )}
                    {saving
                      ? "Saving..."
                      : savedResultId
                        ? "Saved"
                        : "Save Result"}
                  </AnalysisButton>
                </footer>
              </form>
            )}
          </div>
          <ResultSuccessOverlay
            open={showSuccess}
            onClose={() => setShowSuccess(false)}
            returnFocusRef={headingRef}
            onBackToList={() => {
              setShowSuccess(false);
              onCancel();
            }}
          />
        </section>
      </div>
      {showPreview && template && (
        <PrintResultView
          request={request}
          reports={previewReports}
          onBack={returnToEntry}
          backLabel="Back to Entry"
          onBackToList={onCancel}
          onReleased={setRelease}
        />
      )}
    </>
  );
}

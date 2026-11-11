import { sql } from "../../../config/db.js";

// test_results stores one row per lab item with a JSON list of tests.
// The doctor's history screen shows one line per test.
export async function selectLabResultLines(item_id: string) {
  const rows = await sql`
    SELECT result_id, results, remarks, verified_by, verified_at, image_url, created_at
    FROM test_results
    WHERE item_id = ${item_id}
    ORDER BY created_at
  `;

  return rows.flatMap((row) => {
    const tests: Record<string, any>[] = Array.isArray(row.results)
      ? row.results
      : [];
    const components: Record<string, any>[] =
      tests[0]?.template_snapshot?.components ?? [];

    return tests.map((test, index) => {
      const settings =
        components.find((c) => c.fieldKey === test.field_key)?.settings ?? {};
      const isLast = index === tests.length - 1;
      return {
        result_id: `${row.result_id}-${index}`,
        result_value: `${test.name}: ${test.result}`,
        unit: settings.unit || null,
        reference_range: settings.referenceRange || null,
        flag: null,
        // Remarks and verification belong to the whole result, so show them once.
        remarks: isLast ? row.remarks : null,
        verified_by: isLast ? row.verified_by : null,
        verified_at: isLast && row.verified_at ? String(row.verified_at) : null,
        image_url: row.image_url,
        created_at: String(row.created_at),
      };
    });
  });
}

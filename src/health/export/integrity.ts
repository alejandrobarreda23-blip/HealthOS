export interface ExportDataset {
  source_records?: Array<Record<string, unknown>>;
  measurement_groups?: Array<Record<string, unknown>>;
  observations?: Array<Record<string, unknown>>;
  sleep_sessions?: Array<Record<string, unknown>>;
  sleep_stages?: Array<Record<string, unknown>>;
  exercise_sessions?: Array<Record<string, unknown>>;
  series?: Array<Record<string, unknown>>;
  series_points?: Array<Record<string, unknown>>;
  events?: Array<Record<string, unknown>>;
  subjective_reports?: Array<Record<string, unknown>>;
  medical_documents?: Array<Record<string, unknown>>;
  medical_results?: Array<Record<string, unknown>>;
  daily_features?: Array<Record<string, unknown>>;
  metric_baselines?: Array<Record<string, unknown>>;
  findings?: Array<Record<string, unknown>>;
  health_briefs?: Array<Record<string, unknown>>;
  analysis_runs?: Array<Record<string, unknown>>;
  analysis_run_stages?: Array<Record<string, unknown>>;
  analysis_publications?: Array<Record<string, unknown>>;
  metric_registry?: Array<Record<string, unknown>>;
  source_priority_registry?: Array<Record<string, unknown>>;
  system_components?: Array<Record<string, unknown>>;
  validation_evidence?: Array<Record<string, unknown>>;
  maturity_transitions?: Array<Record<string, unknown>>;
}

export interface IntegrityIssue {
  code: string;
  entity: string;
  id: string | null;
  detail: string;
}

type Rows = Array<Record<string, unknown>> | undefined;

function stringIds(rows: Rows): string[] {
  return (rows ?? [])
    .map((r) => r.id)
    .filter((x): x is string => typeof x === "string");
}

function idSet(rows: Rows): Set<string> {
  return new Set(stringIds(rows));
}

function rowId(row: Record<string, unknown>): string | null {
  return typeof row.id === "string" ? row.id : null;
}

function checkDuplicates(
  entity: string,
  rows: Rows,
  issues: IntegrityIssue[],
): void {
  const seen = new Set<string>();
  for (const id of stringIds(rows)) {
    if (seen.has(id)) {
      issues.push({
        code: "DUPLICATE_ID",
        entity,
        id,
        detail: `duplicate primary id ${id}`,
      });
    }
    seen.add(id);
  }
}

function checkForeignKey(
  entity: string,
  rows: Rows,
  field: string,
  targetIds: Set<string>,
  code: string,
  issues: IntegrityIssue[],
): void {
  for (const row of rows ?? []) {
    const value = row[field];
    if (value !== null && value !== undefined) {
      if (typeof value !== "string" || !targetIds.has(value)) {
        issues.push({
          code,
          entity,
          id: rowId(row),
          detail: `${field} ${String(value)} is absent from exported target`,
        });
      }
    }
  }
}

export function validateExportIntegrity(
  data: ExportDataset,
): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  const tableNames = Object.keys(data) as Array<keyof ExportDataset>;
  for (const table of tableNames) {
    checkDuplicates(String(table), data[table], issues);
  }

  const sourceIds = idSet(data.source_records);
  const documentIds = idSet(data.medical_documents);
  const sleepSessionIds = idSet(data.sleep_sessions);
  const seriesIds = idSet(data.series);
  const analysisRunIds = idSet(data.analysis_runs);
  const componentIds = idSet(data.system_components);
  const evidenceIds = idSet(data.validation_evidence);

  checkForeignKey(
    "observations", data.observations, "source_record_id", sourceIds,
    "BROKEN_SOURCE_REFERENCE", issues,
  );
  checkForeignKey(
    "exercise_sessions", data.exercise_sessions, "source_record_id", sourceIds,
    "BROKEN_SOURCE_REFERENCE", issues,
  );
  checkForeignKey(
    "medical_results", data.medical_results, "medical_document_id", documentIds,
    "BROKEN_MEDICAL_DOCUMENT_REFERENCE", issues,
  );
  checkForeignKey(
    "sleep_stages", data.sleep_stages, "sleep_session_id", sleepSessionIds,
    "BROKEN_SLEEP_SESSION_REFERENCE", issues,
  );
  checkForeignKey(
    "series_points", data.series_points, "series_id", seriesIds,
    "BROKEN_SERIES_REFERENCE", issues,
  );
  checkForeignKey(
    "analysis_run_stages", data.analysis_run_stages, "run_id", analysisRunIds,
    "BROKEN_ANALYSIS_RUN_REFERENCE", issues,
  );
  checkForeignKey(
    "analysis_publications", data.analysis_publications, "run_id", analysisRunIds,
    "BROKEN_ANALYSIS_RUN_REFERENCE", issues,
  );

  for (const table of [
    "daily_features",
    "metric_baselines",
    "findings",
    "health_briefs",
  ] as const) {
    checkForeignKey(
      table, data[table], "analysis_run_id", analysisRunIds,
      "BROKEN_ANALYSIS_RUN_REFERENCE", issues,
    );
  }

  checkForeignKey(
    "validation_evidence", data.validation_evidence, "component_id", componentIds,
    "BROKEN_COMPONENT_REFERENCE", issues,
  );
  checkForeignKey(
    "maturity_transitions", data.maturity_transitions, "component_id", componentIds,
    "BROKEN_COMPONENT_REFERENCE", issues,
  );

  for (const row of data.maturity_transitions ?? []) {
    const refs = row.evidence_ids;
    if (!Array.isArray(refs)) continue;
    for (const evidenceId of refs) {
      if (typeof evidenceId !== "string" || !evidenceIds.has(evidenceId)) {
        issues.push({
          code: "BROKEN_EVIDENCE_REFERENCE",
          entity: "maturity_transitions",
          id: rowId(row),
          detail: `evidence_id ${String(evidenceId)} is absent from export`,
        });
      }
    }
  }

  const metricKeys = new Set(
    (data.metric_registry ?? [])
      .map((r) => r.metric_key)
      .filter((x): x is string => typeof x === "string"),
  );

  for (const table of ["observations", "medical_results", "metric_baselines"] as const) {
    for (const row of data[table] ?? []) {
      const metricKey = row.metric_key;
      if (typeof metricKey === "string" && !metricKeys.has(metricKey)) {
        issues.push({
          code: "UNKNOWN_METRIC_KEY",
          entity: table,
          id: rowId(row),
          detail: `metric_key ${metricKey} is absent from exported metric registry`,
        });
      }
    }
  }

  return issues;
}

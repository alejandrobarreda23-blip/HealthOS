import { describe, expect, test } from "vitest";
import {
  canonicalJson,
  sanitizeForExport,
  toNdjson,
} from "../src/health/export/canonical";
import { validateExportIntegrity } from "../src/health/export/integrity";

describe("export survivability", () => {
  test("canonical JSON is key-order independent", () => {
    const a = canonicalJson({ z: 1, a: { y: 2, x: 3 } });
    const b = canonicalJson({ a: { x: 3, y: 2 }, z: 1 });
    expect(a).toBe(b);
  });

  test("denylisted credentials never serialize; exact legitimate names survive", () => {
    const result = sanitizeForExport({
      payload: {
        access_token: "DO_NOT_EXPORT",
        api_key: "DO_NOT_EXPORT_EITHER",
        metric_key: "hrv_rmssd",
        api_key_hint: "legitimate-provider-field-name",
      },
    });
    const text = JSON.stringify(result.value);
    expect(text.includes("DO_NOT_EXPORT")).toBe(false);
    expect(text.includes("api_key_hint")).toBe(true);
    expect(text.includes("hrv_rmssd")).toBe(true);
    expect(result.redactions.length).toBe(2);
  });

  test("null remains null in NDJSON", () => {
    expect(toNdjson([{ value: null }])).toBe('{"value":null}\n');
  });

  test("canonicalization is fail-closed for Date", () => {
    expect(() => canonicalJson({ t: new Date() })).toThrow(
      /Non-plain object at \$\.t/,
    );
  });

  test("sanitization is also fail-closed for Date", () => {
    expect(() => sanitizeForExport({ t: new Date() })).toThrow(
      /Non-plain object at \$\.t/,
    );
  });

  test("NaN and Infinity never masquerade as null", () => {
    expect(() => canonicalJson({ x: NaN })).toThrow(/Non-finite number/);
    expect(() => canonicalJson({ x: Infinity })).toThrow(/Non-finite number/);
  });

  test("undefined cannot disappear silently from an object", () => {
    expect(() => canonicalJson({ x: undefined })).toThrow(/Undefined at \$\.x/);
  });

  test("negative zero cannot silently become zero", () => {
    expect(() => canonicalJson({ x: -0 })).toThrow(/Negative zero at \$\.x/);
  });

  test("broken source reference is detected", () => {
    const issues = validateExportIntegrity({
      source_records: [{ id: "raw-1" }],
      observations: [{
        id: "obs-1",
        source_record_id: "raw-missing",
        metric_key: "hrv_rmssd",
      }],
      metric_registry: [{ metric_key: "hrv_rmssd" }],
    });
    expect(issues.some((x) => x.code === "BROKEN_SOURCE_REFERENCE")).toBe(true);
  });

  test("unknown metric key is detected", () => {
    const issues = validateExportIntegrity({
      source_records: [{ id: "raw-1" }],
      observations: [{
        id: "obs-1",
        source_record_id: "raw-1",
        metric_key: "resting_hr",
      }],
      metric_registry: [{ metric_key: "resting_heart_rate" }],
    });
    expect(issues.some((x) => x.code === "UNKNOWN_METRIC_KEY")).toBe(true);
  });

  test("duplicate IDs are detected", () => {
    const issues = validateExportIntegrity({
      source_records: [{ id: "raw-1" }, { id: "raw-1" }],
    });
    expect(issues.some((x) => x.code === "DUPLICATE_ID")).toBe(true);
  });

  test("analysis run references are checked", () => {
    const issues = validateExportIntegrity({
      analysis_runs: [{ id: "run-1" }],
      findings: [{ id: "finding-1", analysis_run_id: "run-missing" }],
    });
    expect(
      issues.some((x) => x.code === "BROKEN_ANALYSIS_RUN_REFERENCE"),
    ).toBe(true);
  });

  test("maturity transition evidence references are checked", () => {
    const issues = validateExportIntegrity({
      system_components: [{ id: "component-1" }],
      validation_evidence: [{
        id: "evidence-1",
        component_id: "component-1",
      }],
      maturity_transitions: [{
        id: "transition-1",
        component_id: "component-1",
        evidence_ids: ["evidence-missing"],
      }],
    });
    expect(
      issues.some((x) => x.code === "BROKEN_EVIDENCE_REFERENCE"),
    ).toBe(true);
  });
});

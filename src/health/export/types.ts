export type ExportProfile =
  | "FULL_ARCHIVE"
  | "RAW_PLUS_NORMALIZED"
  | "ANALYSIS_AUDIT"
  | "HUMAN_FLAT";

export type ExportStatus =
  | "requested"
  | "snapshotting"
  | "serializing"
  | "integrity_check"
  | "hashing"
  | "completed"
  | "failed";

export interface ExportFileManifest {
  path: string;
  media_type: string;
  record_count: number | null;
  bytes: number;
  sha256: string;
  status: "exported" | "not_available";
}

export interface ExportOmission {
  resource: string;
  reason: string;
}

export interface ExportRedaction {
  file: string;
  record_id: string | null;
  json_path: string;
  rule: string;
}

export interface HealthOsExportManifest {
  export_format: "healthos-portable-archive";
  export_format_version: "1.0.0";
  hash_algorithm: "sha256";
  canonicalization: "healthos-canonical-json-v1-ecmascript";
  verifier: {
    path: "verify.mjs";
    runtime: "node";
    minimum_major: 18;
  };
  export_id: string;
  created_at: string;
  scope: {
    kind: "full" | "range";
    user_id: string;
    from: string | null;
    to: string | null;
  };
  source_system: {
    app_version: string;
    schema_migrations: string[];
    metric_dictionary_version: string;
    feature_registry_version: string;
  };
  files: ExportFileManifest[];
  omissions: ExportOmission[];
  redactions: ExportRedaction[];
  manifest_sha256?: string;
}

# Activity heart-rate streams

This separate function fetches time, heart rate, watts and velocity from Intervals on demand. It does not modify rapid-service, integrations or credentials. Numeric source streams are cached under subject + exercise session. GPS is neither requested nor stored.

Deploy with gateway JWT verification disabled: the function explicitly validates the Bearer token with Supabase Auth `getUser`, checks `get_subject_scope`, then binds subject data owner, exercise session, source record and connected Intervals athlete before retrieving credentials. Missing/invalid tokens receive 401, insufficient scope receives 403. Service credentials never leave the server. The legacy global connection is available only to a verified administrator and requires a matching source athlete ID. Disabled configured connections cannot fall back to the legacy connection.

Apply `20260908145239_activity_heart_rate.sql` before deploying the frontend. Settings are readable by authorized subject users and writable by owners, editors and administrators. Client access to the stream cache is read-only; only the function populates it.

Analysis conventions are documented in `src/health/heart-rate.ts` and the UI. Personal settings are current settings applied retrospectively, not historical physiological truth. Origin zone histograms retain their original upper boundaries and are never redistributed into personal zones without samples. Max-based and reserve-based five-band conventions do not estimate lactate thresholds. Adult age-based maximum is a population estimate, not a measured individual maximum.

Source definitions: https://forum.intervals.icu/t/server-side-data-model-for-scripts/25781/1

# Health OS v1.9 — Runtime Foundation

This release freezes new analytic layers and repairs the data foundation.

## Included
- migrations 001 + 002 are now inside the repository; schema can be reconstructed from 001→014.
- Health Connect TypeScript/Capacitor native plugin contract.
- Android Kotlin implementation for reads of five core record types.
- five built-in normalizers: HRV RMSSD, resting HR, sleep session duration, steps, weight.
- strict laboratory unit conversion + plausibility gate before PhenoAge.
- live-empty dashboard is honest: no synthetic demo fallback when Supabase is configured but empty.
- event windows anchored to sleep now require and use an actual sleep session.

## Health Connect integration boundary
The Kotlin scaffold includes Health Connect reads and a permission-result contract. It still must be placed in the generated Capacitor Android project and compiled/tested on a physical Android device; this repository build does not compile Kotlin.

After `npx cap add android`:
1. copy/register `native/android/health-connect/HealthConnectPlugin.kt` in the Android app module;
2. add the dependency in `gradle-snippet.txt` (verify current stable AndroidX Health Connect version before production);
3. merge `AndroidManifest-snippet.xml` into the app manifest;
4. register the plugin if the generated Capacitor host does not auto-discover it;
5. `npx cap sync android` and compile/exercise on a physical Android device with Health Connect.

## Laboratory boundary
PhenoAge still accepts only its canonical units. `src/labs/phenoage-input.ts` is now the only intended bridge from imported lab values. Every conversion preserves input value/unit and conversion rule; implausible values fail closed.

Key conversions include:
- CRP mg/L → mg/dL: /10
- albumin g/dL → g/L: ×10
- creatinine mg/dL → µmol/L: ×88.4
- glucose mg/dL → mmol/L: /18.0182

## Still intentionally unresolved
- Android permission activity wiring requires the generated native project / physical-device test.
- raw records are persisted, but the DB normalization persistence runner is still the next block.
- Health Connect historical-access permission / pagination and change-token sync need the real device integration pass.
- matched association confidence/autocorrelation remains heuristic and must not be treated as calibrated probability.

# HealthOS Acquisition Principles V1

## Purpose
HealthOS must remain useful with near-zero daily manual input. Manual context enriches interpretation and enables targeted experiments; it must never be required to sustain the system.

## Constitutional rules
- **ACQ-01 — Passive by default, active when informative.**
- **ACQ-02 — Measurement frequency follows physiology, not device availability.**
- **ACQ-03 — Unknown context remains unknown.** Missing context is never converted into normality or an inferred explanation.
- **ACQ-04 — Exception-driven annotation.** Ask for context after an unusual or decision-relevant response, not as a permanent questionnaire.
- **ACQ-05 — Measurement campaigns instead of permanent burden.** Sparse, protocolized measurements may be more valuable than continuous low-value streams.
- **ACQ-06 — Information-gain driven acquisition.** New measurement requests should maximize information value × reliability × physiological relevance ÷ user burden.

## Acquisition levels
1. Passive continuous/nightly: ring/watch/mobile; sleep, HRV, RHR, temperature, activity, exercise, SpO2, respiration.
2. Low-friction periodic home devices: weight, blood pressure, body composition.
3. High-information episodic: laboratory tests, VO2max/stress testing, clinical review.
4. Manual contextual input: opportunistic or hypothesis-driven only.

## Longitudinal does not mean continuous
A variable can be longitudinally useful while being sparse. Cadence is a property of the metric and analytical purpose, not a property of HealthOS as a whole.

## Exception-driven annotation
When physiology differs materially from personal baseline, HealthOS may ask one short contextual question, e.g. alcohol, late/heavy dinner, illness, stress, training, travel, nothing notable. Answers remain `reported`; they never become measured physiology.

## Targeted friction
If HealthOS has a specific testable hypothesis, it may propose a time-limited N-of-1 protocol (for example 14 days of dinner-time logging). Friction is purchased only when it has information value.

## Blood pressure
Blood pressure is modeled as an episodic protocol, not a continuous requirement. A standardized home campaign can contain morning/evening occasions and repeated readings according to the active protocol. Long-term cadence is not universal and must remain configurable by risk, age, clinical context and professional judgment.

## Metric Contract acquisition fields
Every canonical metric may declare:
- `measurement_mode`
- `continuous_required`
- `preferred_cadence`
- `protocol_id`
- `event_triggered_reassessment`
- `manual_burden`
- `longitudinal_roles`
- `minimum_useful_density`
- `staleness_policy`

These fields describe acquisition semantics. They do not authorize medical conclusions.

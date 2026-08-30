# N-of-1 Experiment Designer V1.6

## Fourth intelligence

Health OS can now answer four different questions:

1. **How am I?** → physiological systems
2. **How am I changing?** → Aging / Pace
3. **What seems to work for me?** → Personal Learning Loop
4. **What should I test next to learn something useful?** → N-of-1 Experiment Designer

## Design philosophy

An observational association is not upgraded to experiment evidence simply because Health OS recommends testing it.

The sequence is:

association
→ candidate hypothesis
→ protocol frozen prospectively
→ assigned exposure/control periods
→ adherence + confounder capture
→ predeclared primary outcome
→ analysis
→ experiment-supported evidence

## Protocol components

Each protocol contains:
- exposure
- design kind
- primary outcome fixed in advance
- secondary outcomes
- effect window
- exposure/control days
- minimum analyzable pairs
- washout
- confounders
- inclusion/exclusion rules
- stopping rules
- expected direction
- protocol version
- deterministic schedule seed

## Supported initial designs

- randomized days
- paired blocks
- ABAB
- before/after
- dose-response contract

V1 uses randomized-days / paired-block templates for the first behaviors.

## Safety boundary

The designer has a safety class per exposure.

`do_not_autodesign` means Health OS may analyze naturally occurring exposure but must not recommend deliberately performing it.

Example: alcohol.

For sauna, Health OS can design the measurement protocol but does not prescribe temperature/duration or override medical contraindications.

## Analysis

The initial analyzer uses paired observations and a robust median difference.
It requires:
- at least 5 pairs for any result,
- adherence,
- confounder coverage,
- a minimum effect threshold.

This is intentionally simple and auditable.

Later versions can add:
- randomization inference,
- block/bootstrap confidence intervals,
- Bayesian hierarchical N-of-1 models,
- carryover detection,
- period effects,
- autocorrelation-aware models.

## Critical guardrail

Experiment results can upgrade **personal evidence**.

They do not directly edit Health OS Pace.

Only subsequent measured physiological trajectories flow into the observed Pace.

This preserves:

OBSERVATION ≠ ASSOCIATION ≠ HYPOTHESIS ≠ EXPERIMENT ≠ CONCLUSION

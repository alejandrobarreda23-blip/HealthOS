# Decision Engine V1.7

## Purpose

The previous layers answer:
1. How am I?
2. How am I changing?
3. What seems to work for me?
4. What should I test?

The Decision Engine answers:

> **What deserves my attention now?**

It converts competing opportunities into a compact ranked queue.

## It optimizes two different values

### Expected benefit
How useful might acting on this be, given current evidence?

### Expected information gain
How much uncertainty could be resolved by measuring or experimenting?

This distinction matters. An experiment may have low immediate health benefit but high information value.

## Score

The first transparent scoring model combines:
- expected benefit
- information gain
- evidence confidence
- actionability
- uncertainty × information value

and penalizes:
- burden
- safety concern

Every component is stored.

## Diversity

The queue intentionally avoids returning three variants of the same physiological problem.
System overlap receives a diversity penalty and each system has a maximum representation.

## Deduplication

When an exposure has only exploratory evidence and Health OS has generated an experiment,
the queue favors **testing** it instead of simultaneously presenting the behavior as established advice.

## Data gaps are decisions too

If Pace is limited by coverage or excluded systems, the engine can rank:
- improve longitudinal coverage
- obtain a missing measurement
- restore device continuity

This makes “collect better data” compete explicitly with “change behavior”.

## Safety / medical boundary

The engine is a prioritization layer, not a diagnostic or prescribing engine.

A future clinical escalation module should be separate and conservative:
red flags and clinically important abnormal results must not be mixed into the same utility score as lifestyle experiments.

## Desired UI

The main product should eventually show only a few items:

### Priority now
1. One high-value behavior
2. One high-information experiment
3. One missing measurement

The user can inspect *why* each item was ranked.

The objective is not maximum notifications.
It is maximum useful learning and health value per unit of attention.

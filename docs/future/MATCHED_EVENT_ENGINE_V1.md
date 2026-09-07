# MATCHED EVENT ENGINE V1

## Purpose

Build deterministic comparable-event cohorts.

## Input

```ts
type EventDescriptor = {
  id: string
  perturbationType: string
  durationMinutes?: number | null
  magnitude?: number | null
  recentLoad?: number | null
  precedingSleepHours?: number | null
  altitudeMeters?: number | null
  illness: boolean | null
  provider: string | null
  localHour?: number | null
}
```

## Matching policy

Each dimension can be:
- required exact
- binned
- ignored
- context-required

Example for endurance session:
- perturbationType: exact
- duration: ±20% bin
- magnitude: same quartile/band when available
- provider: exact or explicitly equivalent
- illness: false/unknown separation
- altitude: low / moderate / high
- preceding sleep: <6 / 6–7 / 7–9 / >9

## Output

```ts
type MatchedSet = {
  anchorEventId: string
  candidateEventIds: string[]
  excluded: Array<{
    eventId: string
    reasons: string[]
  }>
  policyVersion: string
}
```

## Rule

Unknown context never becomes "same context".
If a matching dimension is required and unknown, the candidate is excluded or marked mixed.

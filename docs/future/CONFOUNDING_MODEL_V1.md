# CONFOUNDING MODEL V1

## Why this is needed

Response analysis becomes misleading if HealthOS treats overlapping exposures as isolated.

## Canonical status

```text
clean
mixed
confounded
insufficient_context
```

## Examples

### Clean
A normal endurance session, no illness flag, adequate sleep/context, no second major
perturbation in the response window.

### Mixed
Endurance session + sauna after training.

### Confounded
Hard training + user-confirmed acute illness onset in the same response window.

### Insufficient context
The event timing is known but important required context is absent.

## Rule

HealthOS may compute the raw response signature in all cases, but:
- `clean`: eligible for authoritative comparison;
- `mixed`: descriptive comparison only if matching policy explicitly allows it;
- `confounded`: excluded from adaptive-capacity trend;
- `insufficient_context`: excluded when context is required by policy.

The UI must show why an event was excluded rather than silently dropping it.

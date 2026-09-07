# Multiuser compatibility — HealthOS v1.16.1

Canonical multiuser assumptions already live before this patch:

- `profiles`
- `subjects`
- `subject_access`
- `admin_access_log`
- `get_my_subject()`
- `list_accessible_subjects()`
- `get_subject_scope(uuid)`
- `public.is_admin()`
- subject-aware read policies / admin read access on physiological tables

The frontend preserves `SubjectProvider` as the authority for the active subject.

## Read behavior

Body, Today, Trends, Health Brief, Dashboard and Acquisition use `scope.dataUserId` through the subject-aware hooks/repositories.

## Write behavior

When an admin opens another subject:
- Intervals sync remains disabled;
- Measurement Campaigns are hidden / disabled;
- manual weight and BP writes are not available;
- the view remains observational.

The measurement campaign RLS also enforces owner-only writes server-side.

## Important

Do not reapply the Multiuser V1.2 SQL merely because this patch adds migration 025.
The two changes are complementary, not replacements.

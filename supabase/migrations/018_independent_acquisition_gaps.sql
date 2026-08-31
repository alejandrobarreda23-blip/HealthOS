-- HealthOS v1.10.5 — Independent acquisition gaps
-- Product acquisition policy. Priority tiers rank information acquisition only;
-- they are not clinical urgency, disease risk or medical testing intervals.

alter table public.metric_registry
 add column if not exists registry_status text not null default 'active',
 add column if not exists canonical_metric_key text,
 add column if not exists acquisition_priority_tier smallint,
 add column if not exists acquisition_group_key text,
 add column if not exists acquisition_group_label text,
 add column if not exists acquisition_actionability text,
 add column if not exists acquisition_rationale text;

alter table public.metric_registry drop constraint if exists metric_registry_status_check;
alter table public.metric_registry add constraint metric_registry_status_check
 check(registry_status in('active','alias','deprecated'));

alter table public.metric_registry drop constraint if exists metric_registry_acquisition_priority_tier_check;
alter table public.metric_registry add constraint metric_registry_acquisition_priority_tier_check
 check(acquisition_priority_tier is null or acquisition_priority_tier between 1 and 3);

alter table public.metric_registry drop constraint if exists metric_registry_acquisition_actionability_check;
alter table public.metric_registry add constraint metric_registry_acquisition_actionability_check
 check(acquisition_actionability is null or acquisition_actionability in('passive','self_measurement','protocol_ready','review_only','contextual'));

-- If any measurements were recorded under the accidental aliases, migrate them
-- to the original canonical keys before marking those rows as aliases.
update public.observations set metric_key='systolic_blood_pressure' where metric_key='blood_pressure_systolic';
update public.observations set metric_key='diastolic_blood_pressure' where metric_key='blood_pressure_diastolic';
update public.series set metric_key='systolic_blood_pressure' where metric_key='blood_pressure_systolic';
update public.series set metric_key='diastolic_blood_pressure' where metric_key='blood_pressure_diastolic';
update public.canonical_records set metric_key='systolic_blood_pressure' where metric_key='blood_pressure_systolic';
update public.canonical_records set metric_key='diastolic_blood_pressure' where metric_key='blood_pressure_diastolic';
update public.medical_results set metric_key='systolic_blood_pressure' where metric_key='blood_pressure_systolic';
update public.medical_results set metric_key='diastolic_blood_pressure' where metric_key='blood_pressure_diastolic';

-- source_priority_registry has a uniqueness constraint by metric/provider. Merge
-- potential alias duplicates before the canonical-key update.
delete from public.source_priority_registry a
using public.source_priority_registry c
where a.metric_key='blood_pressure_systolic' and c.metric_key='systolic_blood_pressure' and a.provider=c.provider;
delete from public.source_priority_registry a
using public.source_priority_registry c
where a.metric_key='blood_pressure_diastolic' and c.metric_key='diastolic_blood_pressure' and a.provider=c.provider;
update public.source_priority_registry set metric_key='systolic_blood_pressure' where metric_key='blood_pressure_systolic';
update public.source_priority_registry set metric_key='diastolic_blood_pressure' where metric_key='blood_pressure_diastolic';

-- Acquisition coverage must not depend on a single storage path. Laboratory
-- results may exist as structured medical_results before they are mirrored into
-- generic observations. The acquisition summary therefore merges both evidence
-- paths and deduplicates density by physiological date.
create or replace view public.metric_acquisition_summary
with (security_invoker = true) as
with acquisition_events as (
  select user_id,metric_key,physiological_date,started_at as observed_at,quality_score,provider,created_at
  from public.observations
  union all
  select user_id,metric_key,
    coalesce(physiological_date,collected_at::date) as physiological_date,
    coalesce(collected_at,(physiological_date::timestamp at time zone 'UTC')) as observed_at,
    extraction_confidence as quality_score,'medical_document'::text as provider,created_at
  from public.medical_results
  where physiological_date is not null or collected_at is not null
)
select
  user_id,metric_key,
  count(*)::bigint as observation_count,
  count(distinct physiological_date)::bigint as distinct_days,
  min(observed_at) as first_observed_at,
  max(observed_at) as last_observed_at,
  avg(quality_score) filter(where quality_score is not null) as mean_quality_score,
  (array_agg(provider order by observed_at desc nulls last,created_at desc))[1] as last_provider
from acquisition_events
group by user_id,metric_key;

grant select on public.metric_acquisition_summary to authenticated;

-- Correct BP canonicalization. v1.10.2 accidentally added reversed-name duplicates
-- although canonical BP keys already existed since migration 001. Preserve the
-- duplicate registry rows as aliases; do not delete historical identifiers.
update public.metric_registry set
 measurement_mode='episodic_protocol',continuous_required=false,preferred_cadence='protocolized campaign',
 protocol_id='home_bp_campaign_v1',event_triggered_reassessment=true,manual_burden='low',
 longitudinal_roles=array['state','trajectory'],
 metadata=coalesce(metadata,'{}'::jsonb)||'{"paired_metric":"diastolic_blood_pressure"}'::jsonb,
 registry_status='active',canonical_metric_key=null,acquisition_priority_tier=1,
 acquisition_group_key='home_bp',acquisition_group_label='Presión arterial domiciliaria',
 acquisition_actionability='protocol_ready',
 acquisition_rationale='Añade una dimensión cardiovascular clínica independiente de las señales del wearable y permite caracterizar estado y trayectoria mediante un protocolo definido.',
 updated_at=now()
where metric_key='systolic_blood_pressure';

update public.metric_registry set
 measurement_mode='episodic_protocol',continuous_required=false,preferred_cadence='protocolized campaign',
 protocol_id='home_bp_campaign_v1',event_triggered_reassessment=true,manual_burden='low',
 longitudinal_roles=array['state','trajectory'],
 metadata=coalesce(metadata,'{}'::jsonb)||'{"paired_metric":"systolic_blood_pressure"}'::jsonb,
 registry_status='active',canonical_metric_key=null,acquisition_priority_tier=1,
 acquisition_group_key='home_bp',acquisition_group_label='Presión arterial domiciliaria',
 acquisition_actionability='protocol_ready',
 acquisition_rationale='Añade una dimensión cardiovascular clínica independiente de las señales del wearable y permite caracterizar estado y trayectoria mediante un protocolo definido.',
 updated_at=now()
where metric_key='diastolic_blood_pressure';

update public.metric_registry set
 registry_status='alias',canonical_metric_key='systolic_blood_pressure',acquisition_priority_tier=null,
 acquisition_group_key=null,acquisition_group_label=null,acquisition_actionability=null,
 acquisition_rationale='Alias histórico creado en v1.10.2; usar systolic_blood_pressure.',updated_at=now()
where metric_key='blood_pressure_systolic';

update public.metric_registry set
 registry_status='alias',canonical_metric_key='diastolic_blood_pressure',acquisition_priority_tier=null,
 acquisition_group_key=null,acquisition_group_label=null,acquisition_actionability=null,
 acquisition_rationale='Alias histórico creado en v1.10.2; usar diastolic_blood_pressure.',updated_at=now()
where metric_key='blood_pressure_diastolic';

-- Core passive layer. One acquisition group prevents a missing wearable from
-- becoming several independent manual prompts. Existing source-continuity logic
-- still takes precedence when streams become stale together.
update public.metric_registry set
 acquisition_priority_tier=1,acquisition_group_key='wearable_core',acquisition_group_label='Cobertura pasiva diaria',
 acquisition_actionability='passive',acquisition_rationale='Aporta la base longitudinal pasiva para estado, recuperación y dinámica con carga manual prácticamente nula.',updated_at=now()
where metric_key in('hrv_rmssd','resting_heart_rate','sleep_duration');

update public.metric_registry set
 acquisition_priority_tier=2,acquisition_group_key='wearable_core',acquisition_group_label='Cobertura pasiva diaria',
 acquisition_actionability='passive',acquisition_rationale='Complementa la base longitudinal pasiva sin aumentar la carga manual.',updated_at=now()
where metric_key='oxygen_saturation';

update public.metric_registry set
 acquisition_priority_tier=3,acquisition_group_key='wearable_core',acquisition_group_label='Cobertura pasiva diaria',
 acquisition_actionability='passive',acquisition_rationale='Añade contexto de actividad cotidiana con carga manual nula.',updated_at=now()
where metric_key='steps';

-- Low-friction independent trajectory.
update public.metric_registry set
 acquisition_priority_tier=1,acquisition_group_key='body_weight',acquisition_group_label='Peso corporal',
 acquisition_actionability='self_measurement',acquisition_rationale='Añade una trayectoria corporal independiente del wearable con muy baja carga y alta reproducibilidad cuando se mide de forma consistente.',updated_at=now()
where metric_key='weight';

-- Laboratory gap: important for information coverage, but HealthOS must not
-- convert absence into an automatic blood-test recommendation or invent cadence.
update public.metric_registry set
 manual_burden='moderate',acquisition_priority_tier=1,acquisition_group_key='glycemic_lab',
 acquisition_group_label='Cobertura metabólica — HbA1c',acquisition_actionability='review_only',
 acquisition_rationale='Añade una dimensión metabólica que no puede sustituirse por HRV, sueño o actividad; su repetición depende del contexto y no tiene una cadencia universal en HealthOS.',updated_at=now()
where metric_key='hba1c';

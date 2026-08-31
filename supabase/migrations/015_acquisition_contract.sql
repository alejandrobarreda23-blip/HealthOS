-- HealthOS v1.10.2 — Acquisition semantics
-- Safe forward migration from 001..014. Do NOT execute if the remote project
-- already records a different migration named/versioned 015; inspect migration
-- history first and renumber this file if necessary.

do $$ begin
 create type health_measurement_mode as enum(
  'passive_continuous','passive_daily','home_periodic','episodic_protocol',
  'laboratory_periodic','clinical_episodic','manual_contextual'
 );
exception when duplicate_object then null; end $$;

do $$ begin
 create type health_manual_burden as enum('none','very_low','low','moderate','high');
exception when duplicate_object then null; end $$;

alter table public.metric_registry
 add column if not exists measurement_mode health_measurement_mode,
 add column if not exists continuous_required boolean not null default false,
 add column if not exists preferred_cadence text,
 add column if not exists protocol_id text,
 add column if not exists event_triggered_reassessment boolean not null default false,
 add column if not exists manual_burden health_manual_burden not null default 'none',
 add column if not exists longitudinal_roles text[] not null default '{}',
 add column if not exists minimum_useful_density jsonb not null default '{}'::jsonb,
 add column if not exists staleness_policy jsonb not null default '{}'::jsonb;

alter table public.metric_registry
 drop constraint if exists metric_registry_longitudinal_roles_check;
alter table public.metric_registry
 add constraint metric_registry_longitudinal_roles_check check(
  longitudinal_roles <@ array['state','trajectory','dynamics','adaptation','context']::text[]
 );

create table if not exists public.measurement_protocol_registry(
 protocol_id text primary key,
 display_name text not null,
 measurement_mode health_measurement_mode not null,
 purpose text not null,
 protocol_version text not null,
 active boolean not null default true,
 protocol jsonb not null default '{}'::jsonb,
 boundaries jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

drop trigger if exists trg_measurement_protocol_registry_updated_at on public.measurement_protocol_registry;
create trigger trg_measurement_protocol_registry_updated_at before update on public.measurement_protocol_registry
for each row execute function public.set_updated_at();

alter table public.measurement_protocol_registry enable row level security;
drop policy if exists "read only registry" on public.measurement_protocol_registry;
create policy "read only registry" on public.measurement_protocol_registry for select to authenticated using(true);

insert into public.measurement_protocol_registry(protocol_id,display_name,measurement_mode,purpose,protocol_version,protocol,boundaries)
values('home_bp_campaign_v1','Home blood pressure campaign','episodic_protocol',
 'Versioned home-measurement campaign for longitudinal blood-pressure characterization.','1',
 '{"occasions":["morning","evening"],"readings_per_occasion":2,"reading_separation_minutes":[1,2],"preferred_days":7,"minimum_days":3}'::jsonb,
 '{"not_continuous_monitoring":true,"clinical_cadence_not_universal":true,"professional_context_may_override":true}'::jsonb)
on conflict(protocol_id) do nothing;

insert into public.metric_registry(metric_key,display_name,domain,canonical_unit,data_type,default_assignment_rule,metric_definition_version,metadata,measurement_mode,continuous_required,preferred_cadence,protocol_id,event_triggered_reassessment,manual_burden,longitudinal_roles,minimum_useful_density,staleness_policy)
values
 ('blood_pressure_systolic','Systolic blood pressure','cardiovascular','mmHg','numeric','measurement_local_date','1','{"paired_metric":"blood_pressure_diastolic"}'::jsonb,'episodic_protocol',false,'protocolized campaign','home_bp_campaign_v1',true,'low',array['state','trajectory'], '{}'::jsonb,'{}'::jsonb),
 ('blood_pressure_diastolic','Diastolic blood pressure','cardiovascular','mmHg','numeric','measurement_local_date','1','{"paired_metric":"blood_pressure_systolic"}'::jsonb,'episodic_protocol',false,'protocolized campaign','home_bp_campaign_v1',true,'low',array['state','trajectory'], '{}'::jsonb,'{}'::jsonb),
 ('hba1c','HbA1c','metabolic','%','numeric','measurement_local_date','1','{}'::jsonb,'laboratory_periodic',false,null,null,false,'low',array['trajectory'], '{}'::jsonb,'{}'::jsonb)
on conflict(metric_key) do update set
 measurement_mode=excluded.measurement_mode,
 continuous_required=excluded.continuous_required,
 preferred_cadence=excluded.preferred_cadence,
 protocol_id=excluded.protocol_id,
 event_triggered_reassessment=excluded.event_triggered_reassessment,
 manual_burden=excluded.manual_burden,
 longitudinal_roles=excluded.longitudinal_roles,
 updated_at=now();

-- Enrich known HRV metric only if it already exists. Do not create a duplicate
-- canonical key because older installations may use a different HRV key.
update public.metric_registry set
 measurement_mode='passive_daily', continuous_required=false,
 manual_burden='none', longitudinal_roles=array['dynamics'], updated_at=now()
where metric_key in('hrv_rmssd','hrv_rmssd_ms');

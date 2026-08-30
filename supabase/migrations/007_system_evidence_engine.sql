-- Health OS v1.2 — System Evidence Engine

create type public.evidence_strength as enum ('very_low','low','moderate','high');
create type public.measurement_grade as enum ('research_grade','clinical','validated_consumer','consumer_estimate','self_report','unknown');

create table if not exists public.metric_evidence_registry (
  metric_key text primary key,
  system_key text not null references public.aging_system_registry(system_key),
  display_name text not null,
  evidence_strength public.evidence_strength not null,
  evidence_score double precision not null check(evidence_score between 0 and 1),
  outcome_scope text[] not null default '{}',
  relationship_shape text not null,
  favorable_direction text check(favorable_direction in ('higher','lower','range','contextual')),
  target_context jsonb not null default '{}'::jsonb,
  evidence_summary text not null,
  primary_reference text,
  pmid text,
  doi text,
  registry_version text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.measurement_method_registry (
  metric_key text not null,
  method_key text not null,
  display_name text not null,
  grade public.measurement_grade not null,
  reliability_score double precision not null check(reliability_score between 0 and 1),
  bias_notes text,
  minimum_samples integer not null default 1,
  method_version text not null,
  primary key(metric_key,method_key)
);

create table if not exists public.metric_evidence_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  system_key text not null references public.aging_system_registry(system_key),
  metric_key text not null references public.metric_evidence_registry(metric_key),
  method_key text not null,
  evidence_score double precision not null,
  measurement_reliability double precision not null,
  longitudinal_quality double precision not null,
  independence_factor double precision not null,
  effective_weight double precision not null,
  normalized_signal double precision,
  contribution double precision,
  evidence jsonb not null default '{}'::jsonb,
  engine_version text not null,
  created_at timestamptz not null default now()
);

alter table public.metric_evidence_contributions enable row level security;
create policy "own evidence contributions"
on public.metric_evidence_contributions for all
using(auth.uid()=user_id) with check(auth.uid()=user_id);

insert into public.metric_evidence_registry
(metric_key,system_key,display_name,evidence_strength,evidence_score,outcome_scope,relationship_shape,favorable_direction,target_context,evidence_summary,primary_reference,pmid,doi,registry_version)
values
('vo2max','fitness','Capacidad cardiorrespiratoria','high',0.95,
 array['all_cause_mortality','cardiovascular_mortality','heart_failure'],
 'dose_response','higher','{}',
 'La aptitud cardiorrespiratoria muestra una asociación fuerte y consistente con mortalidad y múltiples desenlaces crónicos.',
 'Lang et al., Br J Sports Med 2024','38599681','10.1136/bjsports-2023-107849','evidence-v1'),

('resting_hr','cardiovascular','Frecuencia cardiaca en reposo','moderate',0.78,
 array['all_cause_mortality','cardiovascular_mortality'],
 'dose_response','lower','{}',
 'Una frecuencia cardiaca en reposo más alta se asocia longitudinalmente con mayor mortalidad, aunque depende de fitness, medicación y contexto clínico.',
 'Zhang et al., CMAJ 2016','26598376',null,'evidence-v1'),

('sleep_duration','sleep_recovery','Duración del sueño','moderate',0.68,
 array['all_cause_mortality','cardiovascular_events'],
 'u_shaped','range','{"approx_reference_hours":[7,9]}',
 'La relación poblacional es no lineal; tanto duraciones extremas como enfermedad subyacente pueden explicar asociaciones.',
 'Liu et al., Sleep Med Rev 2017','27067616',null,'evidence-v1'),

('crp','inflammation','Proteína C reactiva','moderate',0.78,
 array['all_cause_mortality','cardiovascular_mortality','coronary_heart_disease'],
 'nonlinear_positive','lower','{}',
 'CRP se asocia con mortalidad y riesgo vascular, pero es inespecífica y puede elevarse por infección, lesión o ejercicio.',
 'Li et al., Ann Epidemiol 2020','32702432','10.1016/j.annepidem.2020.07.005','evidence-v1'),

('hba1c','metabolic','HbA1c','moderate',0.76,
 array['all_cause_mortality','cardiovascular_mortality'],
 'nonlinear','range','{}',
 'HbA1c se relaciona con riesgo cardiometabólico; no debe tratarse como una relación lineal simple en toda la población.',
 'Cavero-Redondo et al. systematic review/meta-analysis','28760792',null,'evidence-v1'),

('systolic_bp','cardiovascular','Presión arterial sistólica','high',0.92,
 array['cardiovascular_events','stroke','cardiovascular_mortality'],
 'risk_gradient','lower','{"interpretation":"contextual by age, treatment and clinical setting"}',
 'La presión arterial sistólica es un factor de riesgo cardiovascular clínicamente establecido; Health OS modela tendencia, no sustituye evaluación clínica.',
 'Clinical risk factor evidence base',null,null,'evidence-v1'),

('creatinine','renal','Creatinina','moderate',0.65,
 array['kidney_function','cardiovascular_risk'],
 'contextual','contextual','{"prefer_derived_metric":"egfr"}',
 'Creatinina aislada depende de masa muscular y otros factores; se prefiere interpretar junto con eGFR y contexto.',
 'Clinical renal biomarker evidence base',null,null,'evidence-v1'),

('weight','body_composition','Peso corporal','low',0.45,
 array['metabolic_health'],
 'contextual','contextual','{}',
 'El peso es reproducible pero poco específico; su interpretación depende de composición corporal, cintura, fitness y trayectoria.',
 'General longitudinal marker',null,null,'evidence-v1')
on conflict(metric_key) do update set
 evidence_strength=excluded.evidence_strength,evidence_score=excluded.evidence_score,
 outcome_scope=excluded.outcome_scope,relationship_shape=excluded.relationship_shape,
 favorable_direction=excluded.favorable_direction,target_context=excluded.target_context,
 evidence_summary=excluded.evidence_summary,primary_reference=excluded.primary_reference,
 pmid=excluded.pmid,doi=excluded.doi,registry_version=excluded.registry_version,updated_at=now();

insert into public.measurement_method_registry
(metric_key,method_key,display_name,grade,reliability_score,bias_notes,minimum_samples,method_version)
values
('vo2max','cpet','Ergoespirometría CPET','research_grade',1.00,'Referencia para medición directa de VO2.',1,'methods-v1'),
('vo2max','exercise_estimate','Estimación por prueba de ejercicio','clinical',0.90,'Estimación indirecta; válida para tendencia cuando el protocolo es estable.',1,'methods-v1'),
('vo2max','wearable_estimate','Estimación por wearable','consumer_estimate',0.68,'Útil longitudinalmente; depende del algoritmo, actividad y dispositivo.',6,'methods-v1'),
('resting_hr','wearable_night','Wearable nocturno','validated_consumer',0.88,'Buena repetibilidad con uso consistente; sensible a enfermedad, alcohol y carga.',7,'methods-v1'),
('resting_hr','manual','Medición manual','clinical',0.80,'Depende de protocolo y reposo previo.',3,'methods-v1'),
('systolic_bp','validated_cuff','Manguito validado','clinical',0.96,'Preferible serie domiciliaria estandarizada, no lectura aislada.',6,'methods-v1'),
('systolic_bp','consumer_unvalidated','Dispositivo no validado','consumer_estimate',0.45,'No asumir precisión clínica.',10,'methods-v1'),
('sleep_duration','wearable','Wearable','validated_consumer',0.75,'Duración total suele ser más fiable que estadios; depende del dispositivo.',14,'methods-v1'),
('sleep_duration','self_report','Autoinforme','self_report',0.52,'Sesgo de recuerdo y percepción.',14,'methods-v1'),
('crp','laboratory','Laboratorio','clinical',0.98,'Interpretar fuera de infección o inflamación aguda cuando se use para tendencia basal.',2,'methods-v1'),
('hba1c','laboratory','Laboratorio','clinical',0.99,'Alta estandarización; puede alterarse en trastornos eritrocitarios.',2,'methods-v1'),
('creatinine','laboratory','Laboratorio','clinical',0.98,'Interpretar con masa muscular/eGFR.',2,'methods-v1'),
('weight','connected_scale','Báscula conectada','validated_consumer',0.94,'Peso generalmente fiable si protocolo estable.',10,'methods-v1'),
('body_fat_percent','bia_scale','BIA doméstica','consumer_estimate',0.55,'Muy sensible a hidratación y algoritmo; priorizar tendencia sobre valor absoluto.',10,'methods-v1')
on conflict(metric_key,method_key) do update set
 reliability_score=excluded.reliability_score,bias_notes=excluded.bias_notes,
 minimum_samples=excluded.minimum_samples,method_version=excluded.method_version;

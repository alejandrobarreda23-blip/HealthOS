alter table public.activity_streams drop constraint activity_streams_streams_check;
alter table public.activity_streams add constraint activity_streams_streams_check
  check(jsonb_typeof(streams)='array' and jsonb_array_length(streams) between 2 and 7);
alter table public.activity_streams add column climb_analysis jsonb;

-- Pure numerical analysis. No table access or privilege escalation; called by the server only.
create function public.analyze_cycling_stream(samples jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare
  streams jsonb; item jsonb; tt double precision[]; dd double precision[];
  aa double precision[]; hh double precision[]; n integer; i integer; j integer:=1;
  dt double precision; dx double precision; g double precision; speed double precision;
  elapsed double precision:=0; metres double precision:=0; gain double precision:=0;
  hr_sum double precision:=0; hr_seconds double precision:=0; block_start double precision;
  remaining double precision; take double precision; gmin double precision:=100; gmax double precision:=-100;
  result jsonb:='[]'; rejected integer:=0; grade_method text;
begin
  if jsonb_typeof(samples)<>'array' then return jsonb_build_object('version','climbs_v1','status','invalid','segments',result); end if;
  select jsonb_object_agg(v->>'type',v->'data') into streams from jsonb_array_elements(samples) v where jsonb_typeof(v->'data')='array';
  if not (streams ? 'time' and streams ? 'distance' and (streams ? 'fixed_altitude' or streams ? 'altitude')) then
    return jsonb_build_object('version','climbs_v1','status','missing_elevation_distance','segments',result);
  end if;
  grade_method:=case when streams ? 'fixed_altitude' then 'fixed_altitude_100m' else 'altitude_100m' end;
  select array_agg(case when jsonb_typeof(v)='number' then (v#>>'{}')::double precision end order by ord) into tt from jsonb_array_elements(streams->'time') with ordinality x(v,ord);
  n:=cardinality(tt);
  if n<2 or n>200000 then return jsonb_build_object('version','climbs_v1','status','invalid','segments',result); end if;
  select array_agg(case when jsonb_typeof(v)='number' then (v#>>'{}')::double precision end order by ord) into dd from jsonb_array_elements(streams->'distance') with ordinality x(v,ord);
  select array_agg(case when jsonb_typeof(v)='number' then (v#>>'{}')::double precision end order by ord) into aa from jsonb_array_elements(coalesce(streams->'fixed_altitude',streams->'altitude')) with ordinality x(v,ord);
  select array_agg(case when jsonb_typeof(v)='number' then (v#>>'{}')::double precision end order by ord) into hh from jsonb_array_elements(coalesce(streams->'heartrate','[]')) with ordinality x(v,ord);
  if cardinality(dd)<>n or cardinality(aa)<>n then return jsonb_build_object('version','climbs_v1','status','invalid','segments',result); end if;
  if exists(select 1 from generate_subscripts(tt,1) k where tt[k] is null or tt[k]<0 or tt[k]>172800 or (k>1 and tt[k]<=tt[k-1])) then
    return jsonb_build_object('version','climbs_v1','status','invalid','segments',result);
  end if;
  if cardinality(hh) is distinct from n then hh:=null; end if;
  for i in 2..n loop
    dt:=tt[i]-tt[i-1]; dx:=dd[i]-dd[i-1]; speed:=dx/dt;
    if dt>10 or dd[i] is null or dd[i-1] is null or dd[i]<0 or dx<=0 or speed<1 or speed>25
      or aa[i] is null or aa[i-1] is null or aa[i] not between -500 and 9000 then
      elapsed:=0;metres:=0;gain:=0;hr_sum:=0;hr_seconds:=0;gmin:=100;gmax:=-100;j:=i;continue;
    end if;
    while j+1<i and dd[i]-dd[j+1]>=100 loop j:=j+1; end loop;
    if dd[i]-dd[j]<75 or dd[i]-dd[j]>200 or aa[j] is null then g:=null;
    else g:=100*(aa[i]-aa[j])/(dd[i]-dd[j]); end if;
    -- Continuous uphill only: stops, downhills and data gaps start a new run.
    if g is null or g<1 or g>30 then
      elapsed:=0;metres:=0;gain:=0;hr_sum:=0;hr_seconds:=0;gmin:=100;gmax:=-100;continue;
    end if;
    remaining:=dt;
    while remaining>0.000001 loop
      if elapsed=0 then block_start:=tt[i]-remaining; end if;
      take:=least(300-elapsed,remaining);elapsed:=elapsed+take;remaining:=remaining-take;
      metres:=metres+speed*take;gain:=gain+g*speed*take/100;gmin:=least(gmin,g);gmax:=greatest(gmax,g);
      if hh[i-1] between 25 and 250 then hr_sum:=hr_sum+hh[i-1]*take;hr_seconds:=hr_seconds+take; end if;
      if elapsed>=299.999999 then
        result:=result||jsonb_build_array(jsonb_build_object('start',round(block_start::numeric,1),'end',round((block_start+300)::numeric,1),
          'grade',round((100*gain/metres)::numeric,2),'bin',floor(round((100*gain/metres)::numeric,2)),'speed',round((metres/300*3.6)::numeric,2),
          'hr',case when hr_seconds>=270 then round((hr_sum/hr_seconds)::numeric,1) else null end,
          'hrCoverage',round((hr_seconds/300)::numeric,3),'gradeMin',round(gmin::numeric,2),'gradeMax',round(gmax::numeric,2)));
        elapsed:=0;metres:=0;gain:=0;hr_sum:=0;hr_seconds:=0;gmin:=100;gmax:=-100;
      end if;
    end loop;
  end loop;
  return jsonb_build_object('version','climbs_v1','status','analyzed','method',grade_method,'segments',result);
end $$;
revoke all on function public.analyze_cycling_stream(jsonb) from public,anon,authenticated;
grant execute on function public.analyze_cycling_stream(jsonb) to service_role;


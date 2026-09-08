-- Run against a database containing migration 20260908162845. All fixtures are synthetic.
do $$
declare s jsonb; r jsonb; n integer;
begin
  select jsonb_build_array(jsonb_build_object('type','time','data',jsonb_agg(i order by i)),jsonb_build_object('type','distance','data',jsonb_agg(i*5 order by i)),jsonb_build_object('type','altitude','data',jsonb_agg(100+i*.25 order by i)),jsonb_build_object('type','heartrate','data',jsonb_agg(140 order by i))) into s from generate_series(0,920) i;
  r:=public.analyze_cycling_stream(s);
  if jsonb_array_length(r->'segments')<>3 or (r#>>'{segments,0,grade}')::numeric<>5 or (r#>>'{segments,0,speed}')::numeric<>18 or (r#>>'{segments,0,hr}')::numeric<>140 then raise exception 'constant grade fixture failed'; end if;
  if (r#>>'{segments,0,end}')::numeric<>(r#>>'{segments,1,start}')::numeric then raise exception 'blocks overlap or skip'; end if;
  select jsonb_build_array(jsonb_build_object('type','time','data',jsonb_agg(i order by i)),jsonb_build_object('type','distance','data',jsonb_agg(i*5 order by i)),jsonb_build_object('type','altitude','data',jsonb_agg(100+i*.25 order by i))) into s from generate_series(0,299) i;
  if jsonb_array_length(public.analyze_cycling_stream(s)->'segments')<>0 then raise exception 'short climb accepted'; end if;
  select jsonb_build_array(jsonb_build_object('type','time','data',jsonb_agg(i order by i)),jsonb_build_object('type','distance','data',jsonb_agg(i*5 order by i)),jsonb_build_object('type','altitude','data',jsonb_agg(100+i*.25 order by i))) into s from generate_series(0,620) i where i not between 201 and 400;
  if jsonb_array_length(public.analyze_cycling_stream(s)->'segments')<>0 then raise exception 'data gap bridged'; end if;
  select jsonb_build_array(jsonb_build_object('type','time','data',jsonb_agg(i order by i)),jsonb_build_object('type','distance','data',jsonb_agg(i*5 order by i)),jsonb_build_object('type','altitude','data',jsonb_agg(100 order by i))) into s from generate_series(0,620) i;
  if jsonb_array_length(public.analyze_cycling_stream(s)->'segments')<>0 then raise exception 'flat ride accepted'; end if;
  select jsonb_build_array(jsonb_build_object('type','time','data',jsonb_agg(i order by i)),jsonb_build_object('type','distance','data',jsonb_agg(i*5 order by i)),jsonb_build_object('type','altitude','data',jsonb_agg(100+i*.25 order by i)),jsonb_build_object('type','heartrate','data',jsonb_agg(case when i<100 then null else 140 end order by i))) into s from generate_series(0,320) i;
  r:=public.analyze_cycling_stream(s);
  if r#>>'{segments,0,hr}' is not null then raise exception 'insufficient HR coverage accepted'; end if;
end $$;

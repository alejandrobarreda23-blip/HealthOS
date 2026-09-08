import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return response({message:'Método no permitido'},405);
  try{
    const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return response({message:'Autenticación requerida'},401);
    const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
    const {data:identity,error:authError}=await client.auth.getUser(auth.slice(7));
    if(authError||!identity.user)return response({message:'Sesión no válida'},401);
    const body=await req.json();if(!uuid(body.subject_id)||!uuid(body.session_id))return response({message:'Solicitud no válida'},400);
    const {data:scopes,error:scopeError}=await client.rpc('get_subject_scope',{target_subject_id:body.subject_id});
    const scope=scopes?.[0];if(scopeError||!scope||!['admin','owner','editor'].includes(scope.access))return response({message:'Acceso no autorizado'},403);
    // Only after user-scoped authorization may the service client access credentials.
    const service=createClient(url,serviceKey,{auth:{persistSession:false}});
    const {data:subject,error:subjectError}=await service.from('subjects').select('created_by_user_id,status').eq('id',body.subject_id).single();
    if(subjectError||subject?.status!=='active')return response({message:'Perfil no disponible'},403);
    const {data:session,error:sessionError}=await service.from('exercise_sessions').select('id,source_record_id,external_session_id,provider').eq('user_id',subject.created_by_user_id).eq('id',body.session_id).single();
    if(sessionError||!session||session.provider!=='intervals_icu'||!session.source_record_id)return response({message:'Actividad no disponible'},404);
    const {data:cached}=await service.from('activity_streams').select('streams').eq('subject_id',body.subject_id).eq('session_id',session.id).maybeSingle();
    if(cached)return response({streams:cached.streams});
    const {data:record,error:recordError}=await service.from('source_records').select('payload,external_id').eq('id',session.source_record_id).eq('user_id',subject.created_by_user_id).eq('provider','intervals_icu').eq('record_type','activity').single();
    if(recordError||!record||record.external_id!==session.external_session_id)return response({message:'Vínculo de origen no válido'},409);
    const {data:integration,error:integrationError}=await service.from('subject_integrations').select('credential_secret_id,external_account_id,status').eq('subject_id',body.subject_id).eq('provider','intervals_icu').maybeSingle();
    if(integrationError)return response({message:'No se pudo consultar la conexión de este perfil.'},503);
    let key:string|undefined;
    if(integration){
      if(integration.status!=='active')return response({message:'La conexión del perfil está desactivada.'},409);
      if(String(record.payload?.icu_athlete_id)!==String(integration.external_account_id))return response({message:'La actividad no pertenece a la cuenta conectada.'},409);
      const {data:secrets,error:secretError}=await service.schema('vault').from('decrypted_secrets').select('decrypted_secret').eq('id',integration.credential_secret_id).limit(1);
      if(secretError)return response({message:'No se pudo usar la conexión de origen.'},503);
      key=secrets?.[0]?.decrypted_secret;
    }else if(scope.access==='admin'&&String(record.payload?.icu_athlete_id)===Deno.env.get('INTERVALS_ATHLETE_ID')){
      // The legacy global credential is accessible only to a verified administrator.
      key=Deno.env.get('INTERVALS_API_KEY');
    }
    if(!key)return response({message:'Configura una conexión de Intervals activa para este perfil.'},409);
    const id=record.external_id;if(typeof id!=='string'||!/^i?\d+$/.test(id))return response({message:'Identificador de actividad no compatible.'},409);
    const upstream=await fetch(`https://intervals.icu/api/v1/activity/${encodeURIComponent(id)}/streams.json?types=time,heartrate,watts,velocity_smooth`,{headers:{Authorization:`Basic ${btoa(`API_KEY:${key}`)}`,Accept:'application/json'},signal:AbortSignal.timeout(25000)});
    if(!upstream.ok)return response({message:upstream.status===404?'La fuente no dispone de series para esta actividad.':upstream.status===429?'La fuente limita las consultas. Inténtalo más tarde.':'La fuente no ha permitido descargar la curva.'},upstream.status===429?429:502);
    // Bound memory before parsing; store only the requested numeric channels, never GPS or credentials.
    const reader=upstream.body?.getReader();if(!reader)return response({message:'Respuesta vacía de origen'},502);
    let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000000){await reader.cancel();return response({message:'La curva excede el tamaño admitido.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
    const raw=JSON.parse(new TextDecoder().decode(bytes));
    if(!Array.isArray(raw))return response({message:'Formato de curva no reconocido.'},502);
    const streams=raw.filter(x=>x&&['time','heartrate','watts','velocity_smooth'].includes(x.type)&&Array.isArray(x.data)).map(x=>({type:x.type,data:x.data.map((v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:null)}));
    const time=streams.find(x=>x.type==='time')?.data,hr=streams.find(x=>x.type==='heartrate')?.data;
    if(!time||!hr||time.length!==hr.length||time.length<2||time.length>200000||time.some((v:number|null,i:number)=>v===null||v<0||v>172800||(i>0&&v<=time[i-1])))return response({message:'No hay una curva de FC con tiempos válidos en esta actividad.'});
    const {error:saveError}=await service.from('activity_streams').insert({subject_id:body.subject_id,session_id:session.id,source_record_id:session.source_record_id,streams,provider:'intervals_icu'});
    if(saveError&&saveError.code!=='23505')return response({message:'La curva se obtuvo, pero no pudo guardarse. Vuelve a intentarlo.'},503);
    return response({streams});
  }catch{return response({message:'No se pudo completar la consulta de la curva.'},503);}
});

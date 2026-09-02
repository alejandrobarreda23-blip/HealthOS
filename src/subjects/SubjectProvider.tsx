import React,{createContext,useCallback,useContext,useEffect,useMemo,useState}from'react';
import{useAuth}from'../auth/AuthProvider';
import{supabase}from'../lib/supabase';

export type AppRole='admin'|'user';
export type SubjectAccess='owner'|'editor'|'viewer'|'admin';

export type SubjectSummary={
 subjectId:string;
 dataUserId:string;
 displayName:string|null;
 status:string;
 permission:SubjectAccess;
 isSelf:boolean;
};

export type SubjectScope=SubjectSummary&{
 authenticatedUserId:string;
 role:AppRole;
};

type SubjectContextValue={
 scope:SubjectScope|null;
 subjects:SubjectSummary[];
 role:AppRole|null;
 isAdmin:boolean;
 loading:boolean;
 error:string;
 refreshSubjects:()=>Promise<void>;
 openSubject:(subjectId:string)=>Promise<void>;
 openMySubject:()=>Promise<void>;
};

const Ctx=createContext<SubjectContextValue|null>(null);

export function SubjectProvider({children}:{children:React.ReactNode}){
 const{user}=useAuth();
 const[role,setRole]=useState<AppRole|null>(null);
 const[subjects,setSubjects]=useState<SubjectSummary[]>([]);
 const[activeSubjectId,setActiveSubjectId]=useState<string|null>(null);
 const[loading,setLoading]=useState(false);
 const[error,setError]=useState('');

 const load=useCallback(async()=>{
  if(!user?.id||!supabase){setRole(null);setSubjects([]);setActiveSubjectId(null);return}
  setLoading(true);setError('');
  try{
   const[{data:profile,error:profileError},{data:accessible,error:accessibleError}]=await Promise.all([
    supabase.from('profiles').select('role').eq('user_id',user.id).single(),
    supabase.rpc('list_accessible_subjects'),
   ]);
   if(profileError)throw profileError;
   if(accessibleError)throw accessibleError;
   const resolvedRole=(profile?.role==='admin'?'admin':'user') as AppRole;
   setRole(resolvedRole);

   const rows=(accessible??[]) as Array<{subject_id:string;display_name:string|null;subject_status:string;permission:string;is_self:boolean}>;
   const ids=rows.map(r=>r.subject_id);
   let owners:Array<{id:string;created_by_user_id:string|null}>=[];
   if(ids.length){
    const{data,error:subjectError}=await supabase.from('subjects').select('id,created_by_user_id').in('id',ids);
    if(subjectError)throw subjectError;
    owners=(data??[]) as Array<{id:string;created_by_user_id:string|null}>;
   }
   const ownerBySubject=new Map(owners.map(x=>[x.id,x.created_by_user_id]));
   const mapped=rows.map((r):SubjectSummary=>({
    subjectId:r.subject_id,
    dataUserId:ownerBySubject.get(r.subject_id)??'',
    displayName:r.display_name,
    status:r.subject_status,
    permission:(r.permission==='admin'?'admin':r.permission) as SubjectAccess,
    isSelf:Boolean(r.is_self),
   })).filter(x=>Boolean(x.dataUserId));
   setSubjects(mapped);
   setActiveSubjectId(current=>{
    if(current&&mapped.some(s=>s.subjectId===current))return current;
    return mapped.find(s=>s.isSelf)?.subjectId??mapped[0]?.subjectId??null;
   });
  }catch(e:any){setError(e?.message??'No se pudo cargar el contexto multiusuario.');setSubjects([]);setActiveSubjectId(null)}
  finally{setLoading(false)}
 },[user?.id]);

 useEffect(()=>{void load()},[load]);

 const openSubject=useCallback(async(subjectId:string)=>{
  if(!user?.id||!supabase)throw new Error('Sesión no disponible');
  const target=subjects.find(s=>s.subjectId===subjectId);
  if(!target)throw new Error('No tienes acceso a este sujeto');
  if(role==='admin'&&!target.isSelf){
   const{error:auditError}=await supabase.from('admin_access_log').insert({admin_user_id:user.id,subject_id:subjectId,action:'open_subject'});
   if(auditError)console.warn('HealthOS audit log:',auditError.message);
  }
  setActiveSubjectId(subjectId);
 },[role,subjects,user?.id]);

 const openMySubject=useCallback(async()=>{
  const mine=subjects.find(s=>s.isSelf);
  if(!mine)throw new Error('No se encontró tu subject principal');
  setActiveSubjectId(mine.subjectId);
 },[subjects]);

 const scope=useMemo<SubjectScope|null>(()=>{
  if(!user?.id||!role||!activeSubjectId)return null;
  const selected=subjects.find(s=>s.subjectId===activeSubjectId);
  return selected?{...selected,authenticatedUserId:user.id,role}:null;
 },[activeSubjectId,role,subjects,user?.id]);

 return <Ctx.Provider value={{scope,subjects,role,isAdmin:role==='admin',loading,error,refreshSubjects:load,openSubject,openMySubject}}>{children}</Ctx.Provider>;
}

export function useSubject(){const v=useContext(Ctx);if(!v)throw new Error('useSubject outside SubjectProvider');return v}

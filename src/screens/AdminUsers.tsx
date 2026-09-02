import{useMemo,useState}from'react';
import{ChevronRight,ShieldCheck,UserRound}from'lucide-react';
import{useSubject}from'../subjects/SubjectProvider';

export default function AdminUsers({onOpen}:{onOpen:()=>void}){
 const{subjects,scope,openSubject,loading,error}=useSubject();
 const[q,setQ]=useState('');
 const filtered=useMemo(()=>subjects.filter(s=>(s.displayName??'').toLowerCase().includes(q.trim().toLowerCase())),[q,subjects]);

 return <>
  <header>
   <div className="eyebrow">HEALTHOS ADMIN</div>
   <h1>Usuarios</h1>
   <p className="muted">Selecciona un perfil para consultar su HealthOS en modo lectura.</p>
  </header>

  <section className="adminStats card">
   <div><span>Sujetos</span><strong>{subjects.length}</strong></div>
   <div><span>Activos</span><strong>{subjects.filter(s=>s.status==='active').length}</strong></div>
  </section>

  <input className="adminSearch" value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar usuario…" />

  {loading&&<div className="syncLine">Cargando usuarios…</div>}
  {error&&<div className="syncError">{error}</div>}

  <div className="adminUserList">
   {filtered.map(subject=><button className={`adminUserCard card ${scope?.subjectId===subject.subjectId?'selectedSubject':''}`} key={subject.subjectId} onClick={async()=>{await openSubject(subject.subjectId);onOpen()}}>
    <span className="adminAvatar"><UserRound size={19}/></span>
    <span className="adminUserBody">
     <strong>{subject.displayName||'Sin nombre'}</strong>
     <small>{subject.isSelf?'Tu perfil':subject.permission==='admin'?'Acceso admin':subject.permission}</small>
    </span>
    {subject.isSelf&&<ShieldCheck size={16} className="adminSelfIcon"/>}
    <ChevronRight size={18}/>
   </button>)}
  </div>
 </>;
}

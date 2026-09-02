import{useSubject}from'../subjects/SubjectProvider';

export default function SubjectBanner({onUsers}:{onUsers?:()=>void}){
 const{scope,isAdmin}=useSubject();
 if(!isAdmin||!scope)return null;
 return <div className={`subjectBanner ${scope.isSelf?'self':''}`}>
  <div><span>{scope.isSelf?'ADMIN · TU PERFIL':'ADMIN VIEW'}</span><strong>{scope.displayName||'Subject'}</strong></div>
  {onUsers&&<button onClick={onUsers}>Cambiar</button>}
 </div>;
}

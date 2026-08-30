import{useState}from'react';import{useAuth}from'../auth/AuthProvider';
export default function AuthScreen(){
 const[email,setEmail]=useState('');const[pw,setPw]=useState('');const[err,setErr]=useState('');
 const{signIn,signUp}=useAuth();
 async function run(mode:'in'|'up'){try{setErr('');mode==='in'?await signIn(email,pw):await signUp(email,pw)}catch(e:any){setErr(e.message||'Error')}}
 return <main className="auth"><div className="eyebrow">HEALTH OS</div><h1>Tu salud, en una sola línea temporal.</h1><p className="muted">Accede para sincronizar tus datos. También puedes seguir en modo demo si Supabase aún no está configurado.</p>
 <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
 <input placeholder="Contraseña" type="password" value={pw} onChange={e=>setPw(e.target.value)}/>
 {err&&<p className="error">{err}</p>}
 <button className="primary" onClick={()=>run('in')}>Entrar</button>
 <button className="secondary full" onClick={()=>run('up')}>Crear cuenta</button></main>
}
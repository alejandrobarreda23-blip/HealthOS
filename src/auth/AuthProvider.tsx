import React,{createContext,useContext,useEffect,useState}from'react';
import type{Session,User}from'@supabase/supabase-js';
import{supabase}from'../lib/supabase';

type AuthState={
  session:Session|null;
  user:User|null;
  loading:boolean;
  signIn:(email:string,password:string)=>Promise<void>;
  signUp:(email:string,password:string)=>Promise<void>;
  signOut:()=>Promise<void>;
};

const Ctx=createContext<AuthState|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
  const[session,setSession]=useState<Session|null>(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    if(!supabase){setLoading(false);return}
    supabase.auth.getSession().then(({data})=>{
      setSession(data.session);setLoading(false);
    });
    const{sub}= {sub:supabase.auth.onAuthStateChange((_e,s)=>setSession(s)).data.subscription};
    return()=>sub.unsubscribe();
  },[]);

  async function signIn(email:string,password:string){
    if(!supabase)throw new Error('Supabase no configurado');
    const{error}=await supabase.auth.signInWithPassword({email,password});
    if(error)throw error;
  }
  async function signUp(email:string,password:string){
    if(!supabase)throw new Error('Supabase no configurado');
    const{error}=await supabase.auth.signUp({email,password});
    if(error)throw error;
  }
  async function signOut(){if(supabase)await supabase.auth.signOut()}

  return <Ctx.Provider value={{session,user:session?.user??null,loading,signIn,signUp,signOut}}>{children}</Ctx.Provider>
}
export function useAuth(){const v=useContext(Ctx);if(!v)throw new Error('useAuth outside provider');return v}

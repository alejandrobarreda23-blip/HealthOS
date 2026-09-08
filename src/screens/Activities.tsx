import { useEffect, useState } from 'react';
import { useSubject } from '../subjects/SubjectProvider';
import { getActivities, getActivitySummaries, type TrainingSession } from '../repositories/activities';
import { attachActivitySummaries } from '../health/activity-presentation';
import ActivityBrowser from '../components/ActivityBrowser';
export { ActivityDetail } from '../components/ActivityDetail';

export default function Activities({initialDate='',onOpenBody}:{initialDate?:string;onOpenBody:(date:string)=>void}) {
  const {scope}=useSubject();
  return <ActivityWorkspace key={scope?.dataUserId??''} userId={scope?.dataUserId} initialDate={initialDate} onOpenBody={onOpenBody}/>;
}
function ActivityWorkspace({userId,initialDate,onOpenBody}:{userId?:string;initialDate:string;onOpenBody:(date:string)=>void}) {
  const [sessions,setSessions]=useState<TrainingSession[]>([]);
  const [loading,setLoading]=useState(Boolean(userId));
  const [error,setError]=useState('');
  const [metadataError,setMetadataError]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    setLoading(Boolean(userId));setError('');setMetadataError('');
    if(userId) Promise.allSettled([getActivities(userId),getActivitySummaries(userId)]).then(([activityResult,summaryResult])=>{
      if(!active)return;
      if(activityResult.status==='rejected'){setSessions([]);setError(activityResult.reason?.message??'No se pudieron cargar las actividades.');}
      else {setSessions(attachActivitySummaries(activityResult.value,summaryResult.status==='fulfilled'?summaryResult.value:[]));if(summaryResult.status==='rejected')setMetadataError('No se pudo cargar el detalle adicional de origen.');}
      setLoading(false);
    });
    return()=>{active=false;};
  },[userId,revision]);
  return <ActivityBrowser sessions={sessions} userId={userId} initialDate={initialDate} loading={loading} error={error} metadataError={metadataError} refresh={()=>setRevision(r=>r+1)} onOpenBody={onOpenBody}/>;
}

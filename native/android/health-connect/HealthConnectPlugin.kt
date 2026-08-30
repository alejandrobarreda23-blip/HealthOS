package com.healthos.app

import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.contracts.HealthPermissionsRequestContract
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.*
import java.time.Instant

@CapacitorPlugin(name = "HealthConnect")
class HealthConnectPlugin: Plugin() {
 private val scope=CoroutineScope(SupervisorJob()+Dispatchers.IO)
 private val client by lazy { HealthConnectClient.getOrCreate(context) }
 private val permissions=setOf(
  HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
  HealthPermission.getReadPermission(RestingHeartRateRecord::class),
  HealthPermission.getReadPermission(SleepSessionRecord::class),
  HealthPermission.getReadPermission(StepsRecord::class),
  HealthPermission.getReadPermission(WeightRecord::class)
 )
 private val permissionContract=HealthPermissionsRequestContract()
 @PluginMethod fun isAvailable(call:PluginCall){call.resolve(JSObject().put("available",HealthConnectClient.getSdkStatus(context)==HealthConnectClient.SDK_AVAILABLE))}
 @PluginMethod fun requestPermissions(call:PluginCall){
  scope.launch {
   val already=client.permissionController.getGrantedPermissions()
   if(already.containsAll(permissions)){withContext(Dispatchers.Main){resolveGranted(call,already)};return@launch}
   val intent=permissionContract.createIntent(context,permissions)
   withContext(Dispatchers.Main){startActivityForResult(call,intent,"permissionResult")}
  }
 }
 @ActivityCallback private fun permissionResult(call:PluginCall?,result:ActivityResult){
  if(call==null)return
  val granted=permissionContract.parseResult(result.resultCode,result.data)
  resolveGranted(call,granted)
 }
 private fun resolveGranted(call:PluginCall,granted:Set<String>){
  val a=JSArray()
  if(granted.contains(HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class)))a.put("HeartRateVariabilityRmssd")
  if(granted.contains(HealthPermission.getReadPermission(RestingHeartRateRecord::class)))a.put("RestingHeartRate")
  if(granted.contains(HealthPermission.getReadPermission(SleepSessionRecord::class)))a.put("SleepSession")
  if(granted.contains(HealthPermission.getReadPermission(StepsRecord::class)))a.put("Steps")
  if(granted.contains(HealthPermission.getReadPermission(WeightRecord::class)))a.put("Weight")
  call.resolve(JSObject().put("granted",a))
 }
 @PluginMethod fun readRecords(call:PluginCall){
  val start=Instant.parse(call.getString("startTime"));val end=Instant.parse(call.getString("endTime"));
  scope.launch{try{val out=JSArray();readHrv(start,end,out);readRhr(start,end,out);readSleep(start,end,out);readSteps(start,end,out);readWeight(start,end,out);withContext(Dispatchers.Main){call.resolve(JSObject().put("records",out))}}catch(e:Exception){withContext(Dispatchers.Main){call.reject(e.message,e)}}}
 }
 private suspend fun readHrv(a:Instant,b:Instant,o:JSArray){client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class,TimeRangeFilter.between(a,b))).records.forEach{r->o.put(base("HeartRateVariabilityRmssd",r.metadata.id,r.time.toString(),null).put("data",JSObject().put("milliseconds",r.heartRateVariabilityMillis)))} }
 private suspend fun readRhr(a:Instant,b:Instant,o:JSArray){client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class,TimeRangeFilter.between(a,b))).records.forEach{r->o.put(base("RestingHeartRate",r.metadata.id,r.time.toString(),null).put("data",JSObject().put("beatsPerMinute",r.beatsPerMinute)))} }
 private suspend fun readSleep(a:Instant,b:Instant,o:JSArray){client.readRecords(ReadRecordsRequest(SleepSessionRecord::class,TimeRangeFilter.between(a,b))).records.forEach{r->o.put(base("SleepSession",r.metadata.id,r.startTime.toString(),r.endTime.toString()).put("data",JSObject()))} }
 private suspend fun readSteps(a:Instant,b:Instant,o:JSArray){client.readRecords(ReadRecordsRequest(StepsRecord::class,TimeRangeFilter.between(a,b))).records.forEach{r->o.put(base("Steps",r.metadata.id,r.startTime.toString(),r.endTime.toString()).put("data",JSObject().put("count",r.count)))} }
 private suspend fun readWeight(a:Instant,b:Instant,o:JSArray){client.readRecords(ReadRecordsRequest(WeightRecord::class,TimeRangeFilter.between(a,b))).records.forEach{r->o.put(base("Weight",r.metadata.id,r.time.toString(),null).put("data",JSObject().put("kilograms",r.weight.inKilograms)))} }
 private fun base(t:String,id:String,s:String,e:String?)=JSObject().put("recordType",t).put("id",id).put("startTime",s).also{if(e!=null)it.put("endTime",e)}
}

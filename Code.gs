// Google Apps Script · backend compartido. Configurar en Propiedades del script:
// SHEET_ID, CRM_KEY (clave larga aleatoria), RESPOND_TOKEN (opcional).
const FIELDS = ['id','nombre','telefono','responsable','estado','fecha_boda','lugar','proxima_llamada','notas','respond_id','revision','lock_owner','lock_until','last_writer','last_call','respond_sync'];
const NEGOTIATION = ['Nuevo','Contactado','Propuesta enviada','En negociación','Reserva confirmada','No interesado'];
function doGet() { return HtmlService.createHtmlOutput(HtmlService.createHtmlOutputFromFile('Index').getContent().replace('__NEON_SERVER_ENDPOINT__',JSON.stringify(ScriptApp.getService().getUrl()))).setTitle('Noches de Neón · Ventas'); }
function doPost(e) { return ContentService.createTextOutput(JSON.stringify(runRequest(JSON.parse(e.postData.contents)))).setMimeType(ContentService.MimeType.JSON); }
function setup() {
 const p=PropertiesService.getScriptProperties();
 if(!p.getProperty('SHEET_ID')||!p.getProperty('CRM_KEY'))throw new Error('Configura SHEET_ID y CRM_KEY en Propiedades del script.');
 const ss=SpreadsheetApp.openById(p.getProperty('SHEET_ID'));
 if(!ss.getSheetByName('Contactos'))ss.insertSheet('Contactos').appendRow(FIELDS);
 if(!ss.getSheetByName('Actividad'))ss.insertSheet('Actividad').appendRow(['actor','text','time']);
}
function runRequest(req) {
 let mutex;
 try {
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('CRM_KEY')||req.key!==props.getProperty('CRM_KEY'))throw new Error('Clave de conexión incorrecta.');
  if(!['Dani','David'].includes(req.actor))throw new Error('Responsable inválido.');
  mutex=LockService.getScriptLock();mutex.waitLock(20000);
  const ss=SpreadsheetApp.openById(props.getProperty('SHEET_ID')),sheet=ss.getSheetByName('Contactos'),activity=ss.getSheetByName('Actividad');
  if(!sheet||!activity)throw new Error('Ejecuta setup() una vez antes de conectar.');
  const rows=sheet.getDataRange().getDisplayValues(),headers=rows.shift();
  if(FIELDS.some((h,i)=>headers[i]!==h))throw new Error('La cabecera de Contactos debe coincidir con la plantilla.');
  const leads=rows.filter(r=>r[0]).map(r=>Object.fromEntries(FIELDS.map((h,i)=>[h,r[i]||'']))),l=leads.find(x=>x.id===req.id);
  let warning='',message='';
  const reserved=x=>x.lock_owner&&Number(x.lock_until)>Date.now();
  const log=text=>activity.appendRow([req.actor,safeCell_(text),new Date().toISOString()]);
  const checkEditable=()=>{if(!l)throw new Error('Contacto no encontrado.');if(Number(l.revision)!==Number(req.revision))throw new Error('Otra persona ha actualizado este contacto. Sincroniza y vuelve a intentarlo.');if(reserved(l)&&l.lock_owner!==req.actor)throw new Error('Contacto reservado por '+l.lock_owner);};
  if(['claim','finish','wrote'].includes(req.action)){
   checkEditable();if(l.responsable&&l.responsable!==req.actor)throw new Error('Contacto asignado a '+l.responsable);
   if(req.action==='claim'){
    if(leads.some(x=>x.id!==l.id&&reserved(x)&&x.lock_owner===req.actor))throw new Error('Termina tu llamada actual primero.');
    if(['Reserva confirmada','No interesado'].includes(l.estado))throw new Error('Cambia el estado del contacto antes de reservar una llamada.');
    l.responsable=req.actor;l.lock_owner=req.actor;l.lock_until=Date.now()+30*60000;log('reservó a '+l.nombre);
   }
   if(req.action==='finish'){if(l.lock_owner!==req.actor)throw new Error('No tienes una reserva para este contacto.');l.lock_owner='';l.lock_until=0;l.last_call=new Date().toISOString();log('terminó la llamada con '+l.nombre);}
   if(req.action==='wrote'){
    l.last_writer=req.actor;
    l.respond_sync='Etiqueta pendiente';
    const token=props.getProperty('RESPOND_TOKEN');
    if(token&&/^\d+$/.test(l.respond_id)){
     try{const response=UrlFetchApp.fetch('https://api.respond.io/v2/contact/id:'+l.respond_id+'/tag',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify(['Escribió: '+req.actor]),muteHttpExceptions:true});if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error('HTTP '+response.getResponseCode());l.respond_sync='Etiqueta sincronizada';}
     catch(err){l.respond_sync='Error de etiqueta · reintentar';warning='Actividad guardada; respond.io no se ha actualizado. '+err.message;}
    }else warning='Actividad guardada. Falta el token de respond.io o el ID numérico del contacto.';
    log('marcó que escribió a '+l.nombre);
   }
   l.revision=Number(l.revision||0)+1;
  }else if(req.action==='save'){
   const clean=validateLead_(req.lead);
   if(l){checkEditable();if(l.responsable&&l.responsable!==req.actor)throw new Error('Solo su responsable puede editar esta ficha.');if(reserved(l)&&clean.responsable!==l.responsable)throw new Error('Termina la llamada antes de reasignar.');}
   if(leads.some(x=>x.id!==l?.id&&digits_(x.telefono)===digits_(clean.telefono)))throw new Error('Ese teléfono ya existe.');
   if(l){Object.assign(l,clean);l.revision=Number(l.revision||0)+1;}else leads.push(Object.assign({id:Utilities.getUuid(),revision:0,lock_owner:'',lock_until:0},clean));
   log((l?'actualizó a ':'añadió a ')+clean.nombre);
  }else if(req.action==='import'){
   if(!Array.isArray(req.leads)||req.leads.length>2000)throw new Error('Máximo 2000 contactos por importación.');
   const incoming=req.leads.map(validateLead_);let count=0;
   incoming.forEach(x=>{if(leads.some(l=>digits_(l.telefono)===digits_(x.telefono)))return;leads.push(Object.assign({id:Utilities.getUuid(),revision:0,lock_owner:'',lock_until:0},x));count++;});log('importó '+count+' contactos');message=count+' contactos añadidos. Teléfonos existentes omitidos.';
  }else if(req.action!=='list')throw new Error('Acción no permitida.');
  if(req.action!=='list'&&leads.length){sheet.getRange(2,1,leads.length,FIELDS.length).setNumberFormat('@').setValues(leads.map(l=>FIELDS.map(h=>safeCell_(String(l[h]??'')))));SpreadsheetApp.flush();}
  const events=activity.getLastRow()>1?activity.getRange(Math.max(2,activity.getLastRow()-499),1,Math.min(500,activity.getLastRow()-1),3).getDisplayValues().map(([actor,text,time])=>({actor,text,time})):[];
  return {ok:true,data:{leads,events},warning,message};
 }catch(err){return {ok:false,error:err.message};}finally{if(mutex&&mutex.hasLock())mutex.releaseLock();}
}
function digits_(s){return String(s).replace(/\D/g,'');}
function safeCell_(s){return /^[=+@\-\t\r]/.test(s)?"'"+s:s;}
function validateLead_(lead){
 const out={};['nombre','telefono','responsable','estado','fecha_boda','lugar','proxima_llamada','notas','respond_id'].forEach(k=>out[k]=String(lead?.[k]??'').trim());
 out.estado=out.estado||'Nuevo';
 if(!out.nombre||out.nombre.length>120||!/^[+\d ()-]{7,25}$/.test(out.telefono)||out.notas.length>3000||out.lugar.length>150)throw new Error('Datos de contacto inválidos.');
 if(out.responsable&&!['Dani','David'].includes(out.responsable))throw new Error('Responsable inválido.');
 if(!NEGOTIATION.includes(out.estado))throw new Error('Estado inválido.');
 if(out.respond_id&&!/^\d+$/.test(out.respond_id))throw new Error('El ID de respond.io debe ser numérico.');
 return out;
}

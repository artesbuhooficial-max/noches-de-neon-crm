/** CRM de equipo: el identificador de la única hoja de trabajo se fija en setup(). */
const SOURCE_TAB='VENTA (SETTER Y CLOSSER)';
const STATES=['Nuevo','Contactado','Propuesta enviada','En negociación','Reserva confirmada','No interesado'];
const RESULTS=['Atendida','No contesta','Ocupado','Volver a llamar','Teléfono incorrecto'];
const META={id:'CRM ID',contact_status:'Estado de contacto',estado:'Estado CRM',proxima_llamada:'Próxima llamada',call_result:'Resultado última llamada',last_call:'Fecha última llamada',last_writer:'Último escritor',respond_id:'ID respond.io',revision:'Revisión CRM',lock_owner:'Reserva por',lock_until:'Reserva hasta',respond_sync:'Sincronización respond.io',contacted_by:'Contactado por',source_stage:'Etapa original sincronizada'};
META.request_at='Fecha solicitud Bodas.net';META.bodas_estado='Estado en Bodas.net';
Object.assign(META,{respond_last_sent:'Último envío respond.io',respond_last_received:'Última entrada respond.io',respond_origin:'Origen mensaje respond.io',respond_evidence:'ID evidencia respond.io',respond_reviewed:'Fecha cotejo respond.io',respond_context:'Seguimiento respond.io'});
function baseDoGet_(){const p=PropertiesService.getScriptProperties();return HtmlService.createHtmlOutput(HtmlService.createHtmlOutputFromFile('Index').getContent().replace('__NEON_SERVER_ENDPOINT__',JSON.stringify(ScriptApp.getService().getUrl())).replace('__NEON_SHEET_URL__',JSON.stringify('https://docs.google.com/spreadsheets/d/'+p.getProperty('SHEET_ID')+'/edit'))).setTitle('Noches de Neón · Ventas');}
function doPost(e){try{return json_(runRequest(JSON.parse(e.postData.contents)));}catch(err){return json_({ok:false,error:err.message});}}
function json_(v){return ContentService.createTextOutput(JSON.stringify(v)).setMimeType(ContentService.MimeType.JSON);}
function setup(){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const p=PropertiesService.getScriptProperties(),ss=SpreadsheetApp.getActiveSpreadsheet();
  if(!ss)throw Error('Abre este proyecto desde Extensiones → Apps Script en vuestro CRM.');
  p.setProperty('SHEET_ID',ss.getId());
  if(!p.getProperty('CRM_KEY'))p.setProperty('CRM_KEY',Utilities.getUuid()+Utilities.getUuid());
  if(!ss.getSheetByName('Actividad CRM'))ss.insertSheet('Actividad CRM').appendRow(['Comercial','Actividad','Fecha']);
  const store=loadStore_(ss);prepareOwners_(store.sheet);const n=distribute_(store.leads);flushDirty_(store);const filter=store.sheet.getFilter?.();if(filter)filter.removeColumnFilterCriteria(1);SpreadsheetApp.flush();
  console.log('CRM preparado. '+n+' filas pendientes repartidas. La clave está en Configuración del proyecto → Propiedades del script → CRM_KEY.');
 }finally{lock.releaseLock();}
}
function prepareOwners_(sheet){
 const range=sheet.getRange(3,1,Math.max(1,(sheet.getMaxRows?.()||sheet.getLastRow())-2),1);
 if(!range.getDataValidations)return;
 let changed=false;const rules=range.getDataValidations().map(row=>row.map(rule=>{
  if(!rule||rule.getCriteriaType()!==SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST)return rule;
  const args=rule.getCriteriaValues(),values=args[0].slice();
  for(const name of ['Daniel','David'])if(!values.includes(name)){values.push(name);changed=true;}
  return values.length===args[0].length?rule:rule.copy().requireValueInList(values,args[1]!==false).build();
 }));if(changed)range.setDataValidations(rules);
}
function owner_(v){return /^(dani|daniel)$/i.test(String(v).trim())?'Dani':String(v||'').trim();}
function sourceOwner_(v){return v==='Dani'?'Daniel':v;}
function phone_(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0034'))n=n.slice(2);return n.length===9?'34'+n:n;}
function stage_(v,owner){const s=String(v||'').toLowerCase();if(/perdid|no interes/.test(s))return 'No interesado';if(/ganad|confirmad|compr/.test(s))return 'Reserva confirmada';if(/negocia|probable|pendiente/.test(s))return 'En negociación';if(/propuest|presupuest/.test(s))return 'Propuesta enviada';return owner?'Contactado':'Nuevo';}
function dateValue_(v,datetime=false){if(v instanceof Date&&!isNaN(v))return Utilities.formatDate(v,'Europe/Madrid',datetime==='request'?"yyyy-MM-dd'T'HH:mm:ss":datetime?"yyyy-MM-dd'T'HH:mm":'yyyy-MM-dd');return String(v||'');}
function safeCell_(v){return typeof v==='string'&&/^[=+@\-\t\r]/.test(v)?"'"+v:v;}
function token_(r){return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(r)));}
function loadStore_(ss){
 const sheet=ss.getSheetByName(SOURCE_TAB);if(!sheet)throw Error('No se encuentra la pestaña '+SOURCE_TAB+'.');
 let width=Math.max(sheet.getLastColumn(),34),headers=sheet.getRange(2,1,1,width).getDisplayValues()[0];
 for(const label of Object.values(META))if(!headers.includes(label))headers.push(label);
 if(headers.length>sheet.getMaxColumns())sheet.insertColumnsAfter(sheet.getMaxColumns(),headers.length-sheet.getMaxColumns());
 if(headers.length>width){sheet.getRange(2,width+1,1,headers.length-width).setValues([headers.slice(width)]).setFontWeight('bold').setBackground('#d9fb71').setFontColor('#20281f');width=headers.length;}
 const cols=Object.fromEntries(Object.entries(META).map(([k,h])=>[k,headers.indexOf(h)+1]));
 const rows=sheet.getLastRow()>2?sheet.getRange(3,1,sheet.getLastRow()-2,width).getValues():[],leads=[];
 rows.forEach((r,i)=>{
  if(!r[4]&&!r[6])return;
  const l={_row:i+3,_dirty:false,nombre:String(r[4]||''),telefono:String(r[6]||'').replace(/^p:/i,''),responsable:owner_(r[0]),lugar:String(r[1]||''),fecha_boda:dateValue_(r[3]),notas:String(r[15]||''),email:String(r[7]||''),original_stage:String(r[2]||'')};
  for(const k of Object.keys(META))l[k]=dateValue_(r[cols[k]-1],k==='request_at'?'request':k==='proxima_llamada');
  if(!l.id){l.id=Utilities.getUuid();l.contact_status=l.responsable?'Contactado':'Sin contactar';l.estado=stage_(r[2],l.responsable);l.source_stage=l.original_stage;l.revision=0;l._dirty=true;}
  if(l.source_stage!==l.original_stage){l.estado=stage_(l.original_stage,l.responsable);l.source_stage=l.original_stage;l.revision=Number(l.revision||0)+1;l._dirty=true;}
  if(!phone_(l.telefono)&&l.contact_status!=='Revisar teléfono'){l.contact_status='Revisar teléfono';l._dirty=true;}
  l.source_version=token_(r);leads.push(l);
 });return {sheet,cols,leads};
}
// Equilibra las nuevas colas por teléfono, conservando las asignaciones previas.
function distributeLegacy_(leads){
 const groups=new Map();leads.forEach(l=>{const p=phone_(l.telefono);if(p){if(!groups.has(p))groups.set(p,[]);groups.get(p).push(l);}});
 const counts={Dani:0,David:0};
 for(const group of groups.values())for(const p of ['Dani','David'])if(group.some(l=>l.responsable===p&&['Sin contactar','Intentado'].includes(l.contact_status)))counts[p]++;
 let n=0;
 for(const group of groups.values()){
  const owners=[...new Set(group.map(l=>l.responsable).filter(Boolean))];
  if(owners.length>1){group.forEach(l=>l.owner_conflict=true);continue;}
  const pending=group.filter(l=>!l.responsable&&['Sin contactar','Intentado'].includes(l.contact_status));if(!pending.length)continue;
  const owner=owners[0]||(counts.Dani<=counts.David?'Dani':'David');
  pending.forEach(l=>{l.responsable=owner;l.revision=Number(l.revision||0)+1;l._dirty=true;l._ownerDirty=true;n++;});
  if(!owners.length&&owner in counts)counts[owner]++;
 }return n;
}
function writeLead_(store,l){
 const {sheet,cols}=store,keys=Object.keys(META),start=cols[keys[0]];
 // Las columnas CRM se añaden como un bloque contiguo, conservando el resto.
 if(keys.every((k,i)=>cols[k]===start+i))sheet.getRange(l._row,start,1,keys.length).setNumberFormat('@').setValues([keys.map(k=>safeCell_(String(l[k]??'')))]);
 else for(const k of keys)sheet.getRange(l._row,cols[k]).setNumberFormat('@').setValue(safeCell_(String(l[k]??'')));
 if(l.request_at)sheet.getRange(l._row,cols.request_at).setValue(Utilities.parseDate(l.request_at,'Europe/Madrid',"yyyy-MM-dd'T'HH:mm:ss")).setNumberFormat('dd/mm/yyyy hh:mm');
 if(l._ownerDirty)sheet.getRange(l._row,1).setValue(sourceOwner_(l.responsable));
 if(l._detailsDirty){
  for(const [col,key]of [[2,'lugar'],[5,'nombre'],[7,'telefono'],[16,'notas']])sheet.getRange(l._row,col).setValue(safeCell_(l[key]));
  if(l.fecha_boda)sheet.getRange(l._row,4).setValue(new Date(l.fecha_boda+'T12:00:00Z'));else sheet.getRange(l._row,4).clearContent();
 }l._dirty=false;
}
function flushDirty_(store){store.leads.filter(l=>l._dirty).forEach(l=>writeLead_(store,l));}
function editable_(l,req){
 if(!l)throw Error('Contacto no encontrado. Sincroniza.');
 if(Number(l.revision)!==Number(req.revision)||l.source_version!==req.source_version)throw Error('La ficha ha cambiado en la app o en Sheets. Sincroniza y vuelve a abrirla.');
 if(l.responsable&&l.responsable!==req.actor)throw Error('Contacto asignado a '+sourceOwner_(l.responsable)+'.');
 if(l.owner_conflict)throw Error('El teléfono tiene responsables distintos en Sheets. Revisad el reparto antes de llamar.');
 if(reserved_(l)&&l.lock_owner!==req.actor)throw Error('Contacto reservado por '+l.lock_owner+'.');
}
function reserved_(l){return l.lock_owner&&Number(l.lock_until)>Date.now();}
function bump_(l){l.revision=Number(l.revision||0)+1;l._dirty=true;}
function validateLead_(input){
 const out={};for(const k of ['nombre','telefono','responsable','estado','fecha_boda','lugar','proxima_llamada','notas','respond_id'])out[k]=String(input?.[k]??'').trim();out.estado=out.estado||'Nuevo';
 if(Object.prototype.hasOwnProperty.call(input||{},'request_at')){out.request_at=String(input.request_at||'').trim();if(out.request_at){if(/^\d{4}-\d{2}-\d{2}$/.test(out.request_at))out.request_at+='T00:00:00';else if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(out.request_at))out.request_at+=':00';if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(out.request_at)||isNaN(Date.parse(out.request_at)))throw Error('Fecha de entrada inválida.');}}
 if(!out.nombre||out.nombre.length>120||!/^\+?[\d ()-]{7,25}$/.test(out.telefono)||out.notas.length>3000||out.lugar.length>150)throw Error('Revisa nombre, teléfono y notas.');
 if(out.responsable&&!['Dani','David'].includes(out.responsable))throw Error('Responsable inválido.');
 if(!STATES.includes(out.estado))throw Error('Estado inválido.');
 if(out.respond_id&&!/^\d+$/.test(out.respond_id))throw Error('El ID de respond.io debe ser numérico.');
 if(out.fecha_boda&&!/^\d{4}-\d{2}-\d{2}$/.test(out.fecha_boda))throw Error('Fecha de boda inválida.');
 if(out.proxima_llamada&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(out.proxima_llamada))throw Error('Próxima llamada inválida.');return out;
}
function addLead_(store,clean){
 const l=Object.assign({_row:store.sheet.getLastRow()+1,id:Utilities.getUuid(),revision:0,contact_status:'Sin contactar',source_stage:'',_dirty:true,_ownerDirty:true,_detailsDirty:true},clean);
 store.sheet.getRange(l._row,5).setValue(safeCell_(l.nombre));store.leads.push(l);return l;
}
function enrichRequests_(store,requests){
 if(!Array.isArray(requests)||requests.length>2000)throw Error('Máximo 2000 solicitudes por importación.');
 const clean=requests.map(r=>{if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(r.request_at))throw Error('Fecha de solicitud inválida.');return {request_at:r.request_at,telefono:phone_(r.telefono),email:String(r.email||'').trim().toLowerCase(),fecha_boda:String(r.fecha_boda||''),bodas_estado:String(r.bodas_estado||'')};});
 let matched=0,unmatched=0,conflict=0;const ids=new Set();
 for(const r of clean){
  let candidates=store.leads.filter(l=>r.telefono&&phone_(l.telefono)===r.telefono);
  if(!candidates.length)candidates=store.leads.filter(l=>r.email&&l.email.trim().toLowerCase()===r.email);
  if(!candidates.length){unmatched++;continue;}
  const eventMatches=candidates.filter(l=>l.fecha_boda===r.fecha_boda);
  if(eventMatches.length)candidates=eventMatches;
  else if(r.fecha_boda&&candidates.some(l=>l.fecha_boda)){conflict++;continue;}
  matched++;
  for(const l of candidates){if(!l.request_at||r.request_at<l.request_at)l.request_at=r.request_at;l.bodas_estado=r.bodas_estado;bump_(l);ids.add(l.id);}
 }
 return {matched,unmatched,conflict,rows:ids.size};
}
function dateColors_(store){
 const p=PropertiesService.getScriptProperties();if(p.getProperty('DATE_COLORS_READY'))return;
 let n=store.cols.request_at,column='';while(n){n--;column=String.fromCharCode(65+n%26)+column;n=Math.floor(n/26);}
 const range=store.sheet.getRange(3,store.cols.request_at,store.sheet.getMaxRows()-2,1),cell='$'+column+'3',rules=store.sheet.getConditionalFormatRules();
 for(const [condition,bg,fg]of [[`TODAY()-INT(${cell})<=2`,'#DBEAFE','#1E40AF'],[`AND(TODAY()-INT(${cell})>=3,TODAY()-INT(${cell})<=7)`,'#FEF3C7','#92400E'],[`TODAY()-INT(${cell})>7`,'#FEE2E2','#991B1B']])rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(`=AND(ISNUMBER(${cell}),${condition})`).setBackground(bg).setFontColor(fg).setRanges([range]).build());
 store.sheet.setConditionalFormatRules(rules);store.sheet.setColumnWidth(store.cols.request_at,180);p.setProperty('DATE_COLORS_READY','1');
}
function reconcileRespond_(store,records){
 if(!Array.isArray(records)||records.length>2000)throw Error('Máximo 2000 contactos de respond.io.');
 const summary={matched:0,rows:0,contacted:0,attempted:0,incoming_only:0,unmatched:0,conflict:0,changed:0};
 for(const r of records){
  if(String(r.channel_id)!=='537086'||!/^\d+$/.test(String(r.respond_id)))throw Error('Fuente respond.io no válida para Noches de Neón.');
  for(const k of ['sent_at','received_at'])if(r[k]&&!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(r[k]))throw Error('Fecha de evidencia inválida.');
  if(r.sent_at&&!r.message_id)throw Error('Falta ID de mensaje enviado.');
  let matches=store.leads.filter(l=>r.telefono&&phone_(l.telefono)===phone_(r.telefono));
  if(!matches.length&&r.email)matches=store.leads.filter(l=>l.email.trim().toLowerCase()===String(r.email).trim().toLowerCase());
  if(!matches.length){summary.unmatched++;continue;}
  if(r.fecha_boda){const same=matches.filter(l=>l.fecha_boda===r.fecha_boda||!l.fecha_boda);if(!same.length){summary.conflict++;continue;}matches=same;}
  else if(new Set(matches.map(l=>l.fecha_boda).filter(Boolean)).size>1){summary.conflict++;continue;}
  if(matches.some(l=>l.respond_id&&l.respond_id!==String(r.respond_id))){summary.conflict++;continue;}
  summary.matched++;summary.rows+=matches.length;
  for(const l of matches){
   const changes={respond_id:String(r.respond_id),respond_reviewed:'2026-10-16'};
   if(r.sent_at&&(!l.respond_last_sent||r.sent_at>=l.respond_last_sent)){changes.respond_last_sent=r.sent_at;changes.respond_origin=String(r.origin||'respond.io');changes.respond_evidence=String(r.message_id);}
   if(r.received_at&&(!l.respond_last_received||r.received_at>l.respond_last_received))changes.respond_last_received=r.received_at;
   const sent=changes.respond_last_sent||l.respond_last_sent,received=changes.respond_last_received||l.respond_last_received;
   changes.respond_context=sent?(received?(received>sent?'Cliente respondió · revisar siguiente acción':'Mensaje enviado · hay conversación previa'):'Mensaje enviado · sin respuesta registrada'):r.failed_count?'Envíos fallidos · revisar contacto':'Solo consulta entrante · pendiente de contactar';
   if(sent){summary.contacted++;if(['Sin contactar','Intentado',''].includes(l.contact_status)){changes.contact_status='Contactado';if(l.estado==='Nuevo')changes.estado='Contactado';}}
   else if(r.failed_count){summary.attempted++;if(!l.contact_status||l.contact_status==='Sin contactar')changes.contact_status='Intentado';}
   else summary.incoming_only++;
   if(Object.entries(changes).some(([k,v])=>String(l[k]||'')!==v)){Object.assign(l,changes);bump_(l);summary.changed++;}
  }
 }return summary;
}
function runRequest(req){
 let lock;
 try{
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty('CRM_KEY')||req.key!==props.getProperty('CRM_KEY'))throw Error('Clave de conexión incorrecta.');
  if(!['Dani','David'].includes(req.actor))throw Error('Selecciona Dani o David.');
  lock=LockService.getScriptLock();lock.waitLock(20000);
  const ss=SpreadsheetApp.openById(props.getProperty('SHEET_ID')),activity=ss.getSheetByName('Actividad CRM');if(!activity)throw Error('Ejecuta setup() antes de conectar.');
  let store=loadStore_(ss);distribute_(store.leads);
  if(store.leads.some(x=>x._dirty)){flushDirty_(store);SpreadsheetApp.flush();store=loadStore_(ss);distribute_(store.leads);}
  const leads=store.leads,l=leads.find(x=>x.id===req.id),group=l?leads.filter(x=>phone_(x.telefono)===phone_(l.telefono)):[];
  const log=text=>activity.appendRow([req.actor,safeCell_(text),new Date().toISOString()]);let warning='',message='';
  if(['claim','finish','wrote'].includes(req.action)){
   editable_(l,req);if(!phone_(l.telefono))throw Error('Falta un teléfono válido.');
   if(group.some(x=>(x.responsable&&x.responsable!==req.actor)||(reserved_(x)&&x.lock_owner!==req.actor)))throw Error('Este teléfono está asignado o reservado por otro comercial.');
   if(req.action==='claim'){
    if(leads.some(x=>phone_(x.telefono)!==phone_(l.telefono)&&reserved_(x)&&x.lock_owner===req.actor))throw Error('Termina tu llamada actual primero.');
    if(['Reserva confirmada','No interesado'].includes(l.estado))throw Error('Este contacto ya está cerrado.');
    group.forEach(x=>{x.responsable=req.actor;x._ownerDirty=true;x.lock_owner=req.actor;x.lock_until=Date.now()+30*60000;bump_(x);});log('reservó la llamada con '+l.nombre);
   }
   if(req.action==='finish'){
    if(l.lock_owner!==req.actor)throw Error('No tienes una reserva para esta llamada.');
    if(!RESULTS.includes(req.result))throw Error('Selecciona el resultado de la llamada.');
    const clean=validateLead_(Object.assign({},l,req.lead||{}));
    if(clean.responsable!==req.actor||phone_(clean.telefono)!==phone_(l.telefono))throw Error('Termina la llamada antes de cambiar responsable o teléfono.');
    Object.assign(l,clean);l._detailsDirty=true;
    group.forEach(x=>{x.lock_owner='';x.lock_until='';x.last_call=new Date().toISOString();x.call_result=req.result;x.proxima_llamada=clean.proxima_llamada;x.contact_status=req.result==='Atendida'?'Contactado':req.result==='Teléfono incorrecto'?'Revisar teléfono':x.contact_status==='Contactado'?'Contactado':'Intentado';if(req.result==='Atendida'){x.contacted_by=req.actor;if(x.estado==='Nuevo')x.estado='Contactado';}bump_(x);});
    log('llamó a '+l.nombre+' · '+req.result+(clean.proxima_llamada?' · próxima: '+clean.proxima_llamada:''));
   }
   if(req.action==='wrote'){
    const token=props.getProperty('RESPOND_TOKEN');let sync='Etiqueta pendiente';
    if(token&&/^\d+$/.test(l.respond_id)){
     try{const r=UrlFetchApp.fetch('https://api.respond.io/v2/contact/id:'+l.respond_id+'/tag',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},payload:JSON.stringify(['Escribió: '+req.actor]),muteHttpExceptions:true});if(r.getResponseCode()<200||r.getResponseCode()>=300)throw Error('HTTP '+r.getResponseCode());sync='Etiqueta sincronizada';}catch(e){sync='Error de etiqueta · reintentar';warning='Actividad guardada; respond.io: '+e.message;}
    }else warning='Actividad guardada. Falta el token de respond.io o el ID del contacto.';
    group.forEach(x=>{x.last_writer=req.actor;x.respond_sync=sync;x.contact_status='Contactado';x.contacted_by=req.actor;if(x.estado==='Nuevo')x.estado='Contactado';bump_(x);});log('marcó que escribió a '+l.nombre);
   }
  }else if(req.action==='reconcile_respond'){
   const summary=reconcileRespond_(store,req.records);message=JSON.stringify(summary);log('cotejó histórico Noches de Neón en respond.io · '+message);
  }else if(req.action==='enrich'){
   const summary=enrichRequests_(store,req.requests);message=summary.matched+' solicitudes enlazadas a '+summary.rows+' filas. '+summary.unmatched+' sin coincidencia; '+summary.conflict+' con fecha de boda distinta.';log('importó fechas de Bodas.net · '+message);dateColors_(store);
  }else if(req.action==='save'){
   const clean=validateLead_(req.lead);
   if(l){editable_(l,req);if(reserved_(l))throw Error('Termina la llamada para guardar su resultado.');}
   if(leads.some(x=>x.id!==l?.id&&phone_(x.telefono)===phone_(clean.telefono))&&(!l||phone_(clean.telefono)!==phone_(l.telefono)))throw Error('Ese teléfono ya existe en el CRM.');
   if(l){const changedOwner=l.responsable!==clean.responsable;Object.assign(l,clean);l._ownerDirty=changedOwner;l._detailsDirty=true;bump_(l);}else addLead_(store,clean);log((l?'actualizó a ':'añadió a ')+clean.nombre);
  }else if(req.action==='import'){
   if(!Array.isArray(req.leads)||req.leads.length>2000)throw Error('Máximo 2000 contactos por importación.');
   const incoming=req.leads.map(validateLead_);let n=0;incoming.forEach(clean=>{if(leads.some(x=>phone_(x.telefono)===phone_(clean.telefono)))return;addLead_(store,clean);n++;});message=n+' contactos añadidos. Teléfonos existentes omitidos.';log('importó '+n+' contactos');
  }else if(req.action!=='list')throw Error('Acción no permitida.');
  distribute_(store.leads);if(store.leads.some(x=>x._dirty)){flushDirty_(store);SpreadsheetApp.flush();store=loadStore_(ss);distribute_(store.leads);}
  const events=activity.getLastRow()>1?activity.getRange(Math.max(2,activity.getLastRow()-499),1,Math.min(500,activity.getLastRow()-1),3).getDisplayValues().map(([actor,text,time])=>({actor,text,time})):[];
  return {ok:true,data:{leads:store.leads.map(({_row,_dirty,_ownerDirty,_detailsDirty,...lead})=>lead),events,sheetUrl:ss.getUrl()},warning,message};
 }catch(e){return {ok:false,error:e.message};}finally{if(lock&&lock.hasLock())lock.releaseLock();}
}


// Reparto de todo el CRM por teléfono, con histórico conservado.
function newestRequest_(a,b){return String(b.request_at||'').localeCompare(String(a.request_at||''))||String(a.id).localeCompare(String(b.id));}
function teamGroups_(leads){
 const groups=new Map();for(const l of leads){const key=phone_(l.telefono)||'sin-telefono:'+l.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);}
 return [...groups.values()].sort((a,b)=>newestRequest_(a.slice().sort(newestRequest_)[0],b.slice().sort(newestRequest_)[0]));
}
function repartitionTeam_(leads){
 if(leads.some(l=>reserved_(l)&&!['Dani','David'].includes(l.lock_owner)))throw Error('Hay una llamada activa de otro comercial. Termínala antes de repartir.');
 const groups=teamGroups_(leads),counts={Dani:0,David:0},history={Dani:0,David:0},fixed=new Map();
 for(const group of groups){const owners=[...new Set(group.filter(reserved_).map(l=>l.lock_owner))];if(owners.length>1)throw Error('Un teléfono tiene dos reservas activas. Revisadlo antes de repartir.');if(owners.length){fixed.set(group,owners[0]);counts[owners[0]]++;if(group.some(l=>l.respond_last_sent))history[owners[0]]++;}}
 if(Math.max(counts.Dani,counts.David)>Math.ceil(groups.length/2))throw Error('Demasiadas llamadas activas para equilibrar el reparto. Termínalas primero.');
 let changed=0;
 const assign=(group,p)=>{for(const l of group){l.owner_conflict=false;if(l.responsable!==p){l.responsable=p;l._ownerDirty=true;bump_(l);changed++;}}};
 for(const [group,p]of fixed)assign(group,p);
 // Cada tramo se recorre del más reciente al más antiguo. Primero repartir
 // conversaciones previas, después el resto, sin atribuir mensajes al nuevo dueño.
 for(const hasHistory of [true,false])for(const group of groups){
  if(fixed.has(group)||group.some(l=>Boolean(l.respond_last_sent))!==hasHistory)continue;
  const p=counts.Dani===counts.David?(history.Dani<=history.David?'Dani':'David'):(counts.Dani<counts.David?'Dani':'David');
  assign(group,p);counts[p]++;if(hasHistory)history[p]++;
 }
 return {contacts:counts,withMessages:history,changedRows:changed,totalContacts:groups.length};
}
function repartirTodoCRM(){
 const lock=LockService.getScriptLock();lock.waitLock(20000);
 try{
  const p=PropertiesService.getScriptProperties(),ss=SpreadsheetApp.openById(p.getProperty('SHEET_ID')),store=loadStore_(ss);prepareOwners_(store.sheet);
  const summary=repartitionTeam_(store.leads);flushDirty_(store);SpreadsheetApp.flush();
  const actual=teamGroups_(loadStore_(ss).leads),check={Dani:0,David:0};for(const group of actual){const owners=[...new Set(group.map(l=>l.responsable))];if(owners.length!==1||!(owners[0]in check))throw Error('Verificación fallida del reparto.');check[owners[0]]++;}
  if(Math.abs(check.Dani-check.David)>1)throw Error('El reparto no está equilibrado.');
  ss.getSheetByName('Actividad CRM').appendRow(['Equipo','Reparto completo por teléfono · Dani: '+check.Dani+' · David: '+check.David+' · histórico conservado',new Date().toISOString()]);
  console.log(JSON.stringify({...summary,verified:check}));return summary;
 }finally{lock.releaseLock();}
}
// Las nuevas entradas mantienen el equilibrio de TODO el CRM; las asignaciones
// ya guardadas permanecen estables durante el trabajo diario.
function distribute_(leads){
 const groups=teamGroups_(leads),counts={Dani:0,David:0};let changed=0;
 for(const group of groups){const owners=[...new Set(group.map(l=>l.responsable).filter(Boolean))];for(const p of owners)if(p in counts)counts[p]++;}
 for(const group of groups){const owners=[...new Set(group.map(l=>l.responsable).filter(Boolean))];if(owners.length>1){group.forEach(l=>l.owner_conflict=true);continue;}const pending=group.filter(l=>!l.responsable&&phone_(l.telefono));if(!pending.length)continue;const p=owners[0]||(counts.Dani<=counts.David?'Dani':'David');for(const l of pending){l.responsable=p;l._ownerDirty=true;bump_(l);changed++;}if(!owners.length)counts[p]++;}
 return changed;
}
// Compatibilidad con la interfaz previamente desplegada: permite actualizar el
// orden sin reemplazar los recursos incrustados ni la configuración del equipo.
function doGet(){
 let html=baseDoGet_().getContent();
 const oldOrder=".sort((a,b)=>{const rank=l=>l.proxima_llamada?0:l.contact_status==='Sin contactar'||l.estado==='Nuevo'?1:2;return rank(a)-rank(b)||(a.proxima_llamada||'9999').localeCompare(b.proxima_llamada||'9999')||(a.request_at||'9999').localeCompare(b.request_at||'9999')})";
 html=html.replace(oldOrder,'.sort(newestFirst)').replace('return [...groups.values()]}','return [...groups.values()].sort(newestFirst)}');
 if(!html.includes('function newestFirst('))html=html.replace('function queueLeads(){',"function newestFirst(a,b){return String(b.request_at||'').localeCompare(String(a.request_at||''))||String(a.id).localeCompare(String(b.id));}function queueLeads(){");
 html=html.replace("if(l.contact_status==='Contactado')return false;","if(l.call_result==='Atendida')return false;");
 html=html.replace('${owned.filter(autoCallDue).length} llamadas pendientes','${owned.filter(autoCallDue).length} para llamar ahora · ${leads.filter(l=>l.responsable===p).length} contactos asignados');
 html=html.replace('Puedes programar una próxima llamada desde la ficha de cada contacto.','Tus contactos siguen en la lista. Abre Ficha / agendar para programar la próxima llamada.');
 html=html.replace('>Ficha</button>','>Ficha / agendar</button>');
 if(!html.includes('function phoneCallStage('))html=html.replace('</body>',HtmlService.createHtmlOutputFromFile('SimpleCalls').getContent()+'</body>');
 return HtmlService.createHtmlOutput(html).setTitle('Noches de Neón · Ventas');
}

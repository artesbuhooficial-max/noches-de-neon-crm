import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
export class Sheet{
 constructor(rows=[]){this.rows=structuredClone(rows);this.maxCols=60;}
 appendRow(row){this.rows.push(row);return this;}
 getLastRow(){let n=this.rows.length;while(n&&!(this.rows[n-1]||[]).some(v=>v!==''&&v!==undefined&&v!==null))n--;return n;}
 getLastColumn(){return Math.max(0,...this.rows.map(r=>r.reduce((n,v,i)=>v!==''&&v!==undefined&&v!==null?i+1:n,0)));}
 getMaxColumns(){return this.maxCols;}
 insertColumnsAfter(n,k){this.maxCols+=k;}
 getRange(row,col,height=1,width=1){const s=this;const range={getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>s.rows[row+i-1]?.[col+j-1]??''));},getDisplayValues(){return this.getValues().map(r=>r.map(String));},setValues(values){values.forEach((r,i)=>r.forEach((v,j)=>{s.rows[row+i-1]??=[];s.rows[row+i-1][col+j-1]=typeof v==='string'?v.replace(/^'/,''):v;}));return this;},setValue(v){return this.setValues([[v]]);},clearContent(){return this.setValues(Array.from({length:height},()=>Array(width).fill('')));},setNumberFormat(){return this;},setFontWeight(){return this;},setBackground(){return this;},setFontColor(){return this;}};return range;}
}
export function harness(rows){
 const tables=new Map([['VENTA (SETTER Y CLOSSER)',new Sheet(rows)]]),props={},ss={getId:()=> 'test-sheet',getUrl:()=> 'https://docs.google.com/spreadsheets/d/test-sheet/edit',getSheetByName:n=>tables.get(n),insertSheet:n=>{const s=new Sheet();tables.set(n,s);return s;}};let locked=false,uuid=0;
 const ctx=vm.createContext({Date,console:{log(){}},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k],setProperty:(k,v)=>{props[k]=v;}})},SpreadsheetApp:{getActiveSpreadsheet:()=>ss,openById:()=>ss,flush(){}},LockService:{getScriptLock:()=>({waitLock:()=>{assert.equal(locked,false);locked=true;},hasLock:()=>locked,releaseLock:()=>{locked=false;}})},Utilities:{getUuid:()=> 'uuid-'+ ++uuid,DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(alg,s)=>crypto.createHash(alg).update(s).digest(),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),parseDate:s=>new Date(s+'Z'),formatDate:(d,tz,pattern)=>d.toISOString().slice(0,pattern.includes('ss')?19:pattern.includes('HH')?16:10)}});
 vm.runInContext(fs.readFileSync(new URL('Code.gs',import.meta.url),'utf8'),ctx);ctx.setup();
 const call=(action,actor='Dani',extra={})=>ctx.runRequest({action,actor,key:props.CRM_KEY,...extra});
 return {ctx,call,tables,props,ss};
}
const row=(name,phone,owner='',stage='')=>{const r=Array(37).fill('');r[0]=owner;r[1]='Madrid';r[2]=stage;r[3]='2027-06-12';r[4]=name;r[6]=phone;r[15]='Nota original';r[20]='=1+2';return r;};
const original=[['CRM'],['Comercial','','ESTADO','','NOMBRE CONTACTO','','TLF'],row('Histórico','600000001','Daniel','Negociación'),row('Sergio','600000002','Sergio','Pendiente de Cliente'),row('A','600000010'),row('A repetido','p:+34600000010'),row('B','600000020'),row('C','600000030'),row('Sin teléfono','')];
const h=harness(original),{call,tables,ctx}=h,source=tables.get('VENTA (SETTER Y CLOSSER)');
let leads=call('list').data.leads;
assert.equal(leads.length,7);assert.equal(leads.find(l=>l.nombre==='Sergio').responsable,'Sergio');
assert.equal(leads.find(l=>l.nombre==='Sin teléfono').responsable,'');assert.equal(leads.find(l=>l.nombre==='Sin teléfono').contact_status,'Revisar teléfono');
const a=leads.find(l=>l.nombre==='A'),dup=leads.find(l=>l.nombre==='A repetido');assert.equal(a.responsable,dup.responsable);assert.equal(a.contact_status,'Sin contactar');
assert.equal(source.rows[4][0],'Daniel');assert.equal(source.rows[2][2],'Negociación');assert.equal(source.rows[4][20],'=1+2');
assert.equal(ctx.runRequest({key:'wrong',actor:'Dani',action:'list'}).ok,false);
const req=l=>({id:l.id,revision:l.revision,source_version:l.source_version});
let result=call('claim',a.responsable,req(a));assert.equal(result.ok,true,result.error);assert.equal(result.data.leads.filter(l=>l.lock_owner===a.responsable).length,2);
assert.equal(call('claim','David',req(a)).ok,false);
let current=result.data.leads.find(l=>l.id===a.id);
assert.equal(call('finish',a.responsable,req(current)).ok,false,'Un resultado es obligatorio antes de liberar');
result=call('finish',a.responsable,{...req(current),result:'No contesta',lead:{...current,proxima_llamada:'2026-10-16T10:00',notas:'Volver mañana'}});assert.equal(result.ok,true,result.error);
current=result.data.leads.find(l=>l.id===a.id);assert.equal(current.contact_status,'Intentado');assert.equal(current.estado,'Nuevo');assert.equal(current.lock_owner,'');assert.equal(current.notas,'Volver mañana');
result=call('claim',a.responsable,req(current));current=result.data.leads.find(l=>l.id===a.id);
result=call('finish',a.responsable,{...req(current),result:'Atendida',lead:current});assert.equal(result.ok,true,result.error);current=result.data.leads.find(l=>l.id===a.id);assert.equal(current.contact_status,'Contactado');assert.equal(current.estado,'Contactado');assert.equal(current.contacted_by,a.responsable);
source.rows.find(r=>r[4]==='A')[15]='Editado en Sheets';assert.equal(call('save',a.responsable,{...req(current),lead:current}).ok,false,'Una edición directa en Sheets debe impedir sobrescribirla');
const other=call('list').data.leads.find(l=>l.responsable==='David');assert.equal(call('save','Dani',{...req(other),lead:other}).ok,false);
assert.equal(call('import','Dani',{leads:[{nombre:'Duplicado',telefono:'+34 600 000 010'}]}).message.split(' ')[0],'0');
leads=call('list').data.leads;const before=leads.map(l=>l.id).sort();ctx.setup();assert.deepEqual(Array.from(call('list').data.leads,l=>l.id).sort(),Array.from(before));
source.rows.splice(2,0,source.rows.pop());assert.deepEqual(Array.from(call('list').data.leads,l=>l.id).sort(),Array.from(before),'Los IDs sobreviven a ordenar las filas');
assert.equal(source.rows.find(r=>r[4]==='Sergio')[0],'Sergio');
const dates=ctx.enrichRequests_(ctx.loadStore_(h.ss),[{request_at:'2026-10-09T07:42:18',telefono:'+34 600000010',fecha_boda:'2027-06-12',bodas_estado:'Atendida'},{request_at:'2026-10-01T10:00:00',telefono:'611111111',fecha_boda:'2027-06-12'}]);assert.equal(dates.matched,1);assert.equal(dates.rows,2);assert.equal(dates.unmatched,1);
console.log('OK: reparto por teléfono, conservación del CRM, resultados, reservas, ediciones simultáneas, importación e IDs estables.');

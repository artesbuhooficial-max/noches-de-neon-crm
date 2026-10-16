function phoneCallStage(l){return l.call_result==='Atendida'?'spoken':l.last_call?'attempted':'never';}
function phoneCallDue(l){
 if(!eligible(l)||activeLock(l))return false;
 const last=Date.parse(l.last_call||'');
 if(l.proxima_llamada){const next=Date.parse(l.proxima_llamada);return Number.isFinite(next)&&next<=Date.now()&&(!Number.isFinite(last)||next>last);}
 return !l.last_call&&l.call_result!=='Atendida';
}
(() => {
 if(window.NEON_SIMPLE_CALLS)return;window.NEON_SIMPLE_CALLS=true;
 autoCallDue=phoneCallDue;
 let scope='pending';
 const baseRender=render,baseOpen=openLead;
 const styles=document.createElement('style');styles.textContent=`
 .call-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:22px 0 15px}.call-tabs button[aria-pressed=true]{background:var(--lime);color:#17210c;border-color:var(--lime)}
 .call-explanation{color:var(--muted);font-size:12px;line-height:1.7;margin-bottom:16px}.quick-results{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.quick-results button{flex:1;min-width:125px}
 #leadDialog.quick-call .form-grid>label{display:none}#leadDialog.quick-call .form-grid>label:has(#leadNext){display:block;grid-column:1/-1}#leadDialog.quick-call #leadRespondHistory{display:none}#leadDialog.quick-call .form-grid{grid-template-columns:1fr}
 #leadDialog.quick-call #saveLead{width:100%;padding:15px}.call-badge{font-size:11px;display:block;margin:6px 0}.call-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.call-toolbar .primary{white-space:nowrap}
 :root[data-theme=light] .call-tabs button[aria-pressed=true]{background:#d9fb71}.simple-total{color:var(--muted);font-size:11px}.call-table td{white-space:normal;vertical-align:top}.call-table .row-actions{flex-wrap:wrap}.call-table th:last-child{min-width:210px}
 `;document.head.appendChild(styles);
 $('ownerFilter').value=user;
 const controls=document.createElement('div');controls.innerHTML=`<div class="call-tabs" role="group" aria-label="Vista de llamadas"><button class="secondary" data-call-view="pending">Por llamar</button><button class="secondary" data-call-view="spoken">Ya hablamos</button><button class="secondary" data-call-view="attempted">Sin respuesta</button><button class="secondary" data-call-view="all">Todos los contactos</button></div><p class="call-explanation" id="callExplanation"></p>`;
 $('queue').before(controls);
 const originalSwitch=$('userSwitch').onclick;$('userSwitch').onclick=()=>{originalSwitch();$('ownerFilter').value=user;render()};
 function status(l){return activeLock(l)?tag('En llamada · '+l.lock_owner,'orange'):phoneCallStage(l)==='spoken'?tag('Ya hablamos','lime'):phoneCallStage(l)==='attempted'?tag(l.call_result||'Intento registrado','orange'):tag('Sin llamada registrada','purple');}
 function show(l){if(scope==='all')return true;if(scope==='spoken')return phoneCallStage(l)==='spoken';if(scope==='attempted')return phoneCallStage(l)==='attempted';return phoneCallDue(l)||activeLock(l);}
 render=function(){
  baseRender();
  const all=queueLeads(),owner=$('ownerFilter').value,query=$('search').value.toLowerCase(),state=$('statusFilter').value,contact=$('contactFilter').value;
  const pool=all.filter(l=>(owner==='all'||(owner==='none'?!l.responsable:l.responsable===owner))&&(l.nombre+' '+l.telefono).toLowerCase().includes(query)&&(state==='all'||l.estado===state)&&(contact==='all'||l.contact_status===contact));
  const shown=pool.filter(show),counts={pending:pool.filter(l=>phoneCallDue(l)||activeLock(l)).length,spoken:pool.filter(l=>phoneCallStage(l)==='spoken').length,attempted:pool.filter(l=>phoneCallStage(l)==='attempted').length,all:pool.length};
  const names={pending:'Por llamar',spoken:'Ya hablamos',attempted:'Sin respuesta',all:'Todos los contactos'};
  document.querySelectorAll('[data-call-view]').forEach(b=>{const v=b.dataset.callView;b.textContent=names[v]+' · '+counts[v];b.setAttribute('aria-pressed',String(v===scope))});
  $('callExplanation').textContent=scope==='pending'?'1. Elige un contacto. 2. Llama. 3. Marca el resultado y guarda para pasar al siguiente. Los llamados no se repiten; vuelven solo si agendas otra llamada. Los más recientes aparecen primero.':'Aquí conserváis los contactos y su seguimiento. Puedes abrir la ficha, consultar las notas o agendar una nueva llamada. No se elimina ningún registro.';
  $('total').textContent=shown.length+' visibles · '+pool.length+' contactos conservados';
  $('queue').innerHTML=`<div class="table-wrap"><table class="call-table"><thead><tr><th>Contacto</th><th>Seguimiento</th><th>Próxima llamada</th><th>Qué quieres hacer</th></tr></thead><tbody>${shown.map(l=>{
   const mine=!l.responsable||l.responsable===user,available=mine&&eligible(l)&&(!activeLock(l)||l.lock_owner===user),locked=activeLock(l)&&l.lock_owner===user;
   return `<tr><td><b>${esc(l.nombre)}</b><small>${esc(l.telefono)} · ${esc(l.responsable||'Sin asignar')}</small>${ageTag(l)}</td><td>${status(l)}${tag(l.estado,stateColor(l.estado))}<small>${l.last_call?'Última llamada: '+esc(date(l.last_call)):'Los mensajes de respond.io se consultan en la ficha.'}</small></td><td>${esc(date(l.proxima_llamada))}</td><td><div class="row-actions"><button class="primary" data-call-action="${locked?'result':'choose'}" data-call-id="${esc(l.id)}" ${available?'':'disabled'}>${locked?'Marcar resultado':'Elegir para llamar'}</button><button class="secondary" data-call-action="spoken" data-call-id="${esc(l.id)}" ${available?'':'disabled'}>Ya hablamos</button><button class="secondary" data-call-action="details" data-call-id="${esc(l.id)}">Ficha / agendar</button></div></td></tr>`;
  }).join('')}</tbody></table>${shown.length?'':'<div class="empty">No hay contactos en esta vista. Puedes consultar Ya hablamos, Sin respuesta o Todos los contactos.</div>'}</div>`;
  const active=all.find(l=>activeLock(l)&&l.lock_owner===user),card=document.querySelector('.agent.'+user.toLowerCase()+' .agent-body');
  if(active&&card){const quick=document.createElement('div');quick.className='quick-results';quick.innerHTML=`<button class="primary" data-call-action="spoken" data-call-id="${esc(active.id)}">✓ Hemos hablado</button><button class="secondary" data-call-action="unanswered" data-call-id="${esc(active.id)}">No contesta</button><button class="secondary" data-call-action="result" data-call-id="${esc(active.id)}">Otro resultado / agendar</button>`;card.appendChild(quick);}
 };
 openLead=function(l,action='save'){baseOpen(l,action);$('leadDialog').classList.toggle('quick-call',action==='finish');if(action==='finish'){$('dialogTitle').textContent='¿Qué ha pasado con '+l.nombre+'?';$('saveLead').textContent='Guardar y pasar al siguiente';}};
 document.addEventListener('click',async e=>{
  const view=e.target.closest('[data-call-view]');if(view){scope=view.dataset.callView;render();return;}
  const b=e.target.closest('[data-call-action]');if(!b||b.disabled)return;const l=data.leads.find(x=>x.id===b.dataset.callId);if(!l)return;const action=b.dataset.callAction;
  if(action==='details'){openLead(l);return;}
  if(action==='choose'){await take('claim',l.id);return;}
  if(!activeLock(l)||l.lock_owner!==user){if(!await mutate('claim',l))return;}
  const current=data.leads.find(x=>x.id===l.id);openLead(current,'finish');if(action==='spoken')$('callResult').value='Atendida';if(action==='unanswered')$('callResult').value='No contesta';
 });
 render();
})();

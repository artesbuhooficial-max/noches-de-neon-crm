import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import './source-check.mjs';
const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,style:{},addEventListener(){},setAttribute(){},classList:{toggle(){}},showModal(){},close(){},reset(){}});return nodes.get(id)};
node('contactFilter').value='all';node('callResult').value='Atendida';node('ownerFilter').value='all';node('statusFilter').value='all';
const front=vm.createContext({document:{documentElement:{dataset:{}},getElementById:node,addEventListener(){},querySelector:s=>({src:s.includes('Dani')?'dani.png':'david.png'}),querySelectorAll:()=>[]},localStorage:{getItem:()=>null,setItem(){}},window:{addEventListener(){}},structuredClone,crypto:globalThis.crypto,setInterval(){},setTimeout(){},clearTimeout(){},console,URL,Blob,AbortController});
vm.runInContext(fs.readFileSync(new URL('app.js',import.meta.url),'utf8'),front);
assert.match(node('agents').innerHTML,/dani.png/);assert.match(node('agents').innerHTML,/david.png/);assert.match(node('queue').innerHTML,/Lucía/);
vm.runInContext("localMutate('claim',data.leads[0]);localMutate('finish',data.leads[0]);localMutate('wrote',data.leads[0]);",front);
assert.equal(vm.runInContext('data.leads[0].last_writer',front),'Dani');
assert.equal(vm.runInContext('parseCsv(\'nombre,telefono\\n"Ana, Pablo",600000001\')[1][0]',front),'Ana, Pablo');
assert.equal(front.document.documentElement.dataset.theme,'dark');
node('themeToggle').onclick();assert.equal(front.document.documentElement.dataset.theme,'light');assert.match(node('themeToggle').textContent,/Fondo oscuro/);
node('themeToggle').onclick();assert.equal(front.document.documentElement.dataset.theme,'dark');
console.log('OK: reservas exclusivas, revisiones, responsables, duplicados, actividad, CSV y render inicial.');


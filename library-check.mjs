import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const nodes=new Map(),listeners=new Map();
const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:'',innerHTML:'',textContent:'',hidden:false,dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v},focus(){},scrollIntoView(){},addEventListener(k,f){listeners.set(id+':'+k,f)}});return nodes.get(id)};
const tabs=['prices','repertoire','media','guide','documents'].map(id=>Object.assign(node('tab-'+id),{dataset:{libraryTab:id}}));
node('libraryType').value='all';node('salesLibrary').hidden=true;
const context=vm.createContext({window:{},document:{activeElement:node('openLibrary'),getElementById:node,querySelectorAll:()=>tabs},navigator:{clipboard:{writeText:async()=>{}}},console});
vm.runInContext(fs.readFileSync(new URL('catalog.js',import.meta.url),'utf8'),context);
const catalog=context.window.NEON_CATALOG;
assert.deepEqual(Array.from(catalog.prices,p=>p.amount),[900,1200,1600,2000,3000]);
assert.equal(catalog.repertoires.length,4);
assert.match(catalog.repertoires[1].description,/pasodoble/);
assert.match(catalog.repertoireSource,/1D6blpNkVwXNiCD3oUpiigxoTksusj1pNJSZJF7BjAdk/);
assert.equal(catalog.resources.filter(r=>r.category==='Audio').length,1);
assert.ok(catalog.resources.length>=100);
assert.ok(catalog.resources.every(r=>new URL(r.url).protocol==='https:'));
vm.runInContext(fs.readFileSync(new URL('library.js',import.meta.url),'utf8'),context);
node('openLibrary').onclick();assert.equal(node('salesLibrary').hidden,false);
assert.match(node('libraryResults').innerHTML,/superen 2\.500/);assert.match(node('libraryResults').innerHTML,/dos primeras semanas/);
tabs[2].onclick();assert.match(node('libraryResults').innerHTML,/Audio Román/);
node('libraryFormation').value='trio';node('libraryFormation').onchange();assert.match(node('libraryResults').innerHTML,/C1222/);assert.doesNotMatch(node('libraryResults').innerHTML,/Cuarteto pop rock hombre 2/);
tabs[4].onclick();node('librarySearch').value='margen mínimo';node('librarySearch').oninput();assert.match(node('libraryResults').innerHTML,/Resumen puntos tratados/);
node('librarySearch').value='<script>inexistente';node('librarySearch').oninput();assert.match(node('libraryResults').innerHTML,/No hay resultados/);
tabs[1].onclick();assert.match(node('libraryResults').innerHTML,/open.spotify.com/);assert.match(node('libraryResults').innerHTML,/Brilli Brilli/);
node('closeLibrary').onclick();assert.equal(node('salesLibrary').hidden,true);
for(const file of ['Noches-de-Neon.html','AppsScriptIndex.html']){
 const html=fs.readFileSync(new URL(file,import.meta.url),'utf8');assert.ok(html.includes('window.NEON_CATALOG='));assert.ok(html.includes('libraryCallContext'));assert.ok(!html.includes('src="catalog.js"'));assert.ok(!html.includes('src="library.js"'));
 assert.equal((html.match(/window.NEON_CATALOG=/g)||[]).length,1);
}
console.log('OK: tarifas, repertorios, audio, índice, búsqueda en documentos, filtros, apertura/cierre y dos HTML autónomos.');

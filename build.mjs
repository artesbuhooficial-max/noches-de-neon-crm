import fs from 'node:fs';
const base=new URL('.',import.meta.url);
let html=fs.readFileSync(new URL('index.html',base),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+fs.readFileSync(new URL('style.css',base),'utf8')+'</style>');
for(const file of ['hosting.js','app.js','catalog.js','library.js']){
 const js=fs.readFileSync(new URL(file,base),'utf8');
 html=html.replace('<script src="'+file+'"></script>',()=>'<script>'+js.replaceAll('</script>','<\\/script>')+'</script>');
}
let standalone=html,hosted=html;
for(const name of ['dani','david']){
 standalone=standalone.replaceAll(name+'.png','data:image/png;base64,'+fs.readFileSync(new URL(name+'.png',base)).toString('base64'));
 hosted=hosted.replaceAll(name+'.png','data:image/png;base64,'+fs.readFileSync(new URL(name+'.png',base)).toString('base64'));
}
fs.writeFileSync(new URL('Noches-de-Neon.html',base),standalone);
fs.writeFileSync(new URL('AppsScriptIndex.html',base),hosted.replace('<script>','<script>window.NEON_ENDPOINT=__NEON_SERVER_ENDPOINT__;window.NEON_SHEET_URL=__NEON_SHEET_URL__;</script><script>'));
console.log('HTML autónomo y archivo para Apps Script generados.');

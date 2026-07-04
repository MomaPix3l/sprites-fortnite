(() => {
'use strict';
const SPRITE_STORAGE_KEY = 'fortnite-sprite-tracker-v8';
const MAP_STORAGE_KEY = 'fortnite-location-map-v8';
const $ = (id) => document.getElementById(id);
const DEFAULTS = Array.isArray(window.DEFAULT_SPRITES) ? window.DEFAULT_SPRITES : [];
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const clamp = (n,min,max) => Math.max(min, Math.min(max, Number(n)||0));
const pct = (n,d) => d ? Math.round((n/d)*100) : 0;
function familyOrder(f){ return {Base:0, Gold:1, Gummy:2, Galaxy:3, Holofoil:4, Gem:5}[f] ?? 9; }
function downloadJson(data, filename){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function readDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }

let sprites = loadSprites();
let mapState = loadMapState();

function loadSprites(){
  try{
    const raw = localStorage.getItem(SPRITE_STORAGE_KEY);
    if(!raw) return clone(DEFAULTS);
    const saved = JSON.parse(raw);
    if(!Array.isArray(saved) || saved.length < 10) return clone(DEFAULTS);
    const byId = new Map(saved.map(s => [s.id, s]));
    return DEFAULTS.map(s => ({...s, ...(byId.get(s.id)||{})}));
  }catch(e){ return clone(DEFAULTS); }
}
function saveSprites(){ localStorage.setItem(SPRITE_STORAGE_KEY, JSON.stringify(sprites)); }

function initTracker(){
  const grid=$('grid'), tpl=$('cardTemplate');
  if(!grid || !tpl) return;
  if(!DEFAULTS.length){ grid.innerHTML='<div class="empty">Data failed to load. Make sure data.js is in the same folder as index.html.</div>'; return; }
  const controls=['search','filter','variant','rarity'].map($);
  function stats(){
    const acquired=sprites.filter(s=>s.acquired).length;
    const maxed=sprites.filter(s=>s.acquired && Number(s.level)===5).length;
    const missing=sprites.length-acquired;
    const total=sprites.reduce((a,s)=>a+(s.acquired?Number(s.level||0):0),0);
    const max=sprites.length*5;
    $('acquiredCount').textContent=acquired; $('maxedCount').textContent=maxed; $('missingCount').textContent=missing; $('totalLevel').textContent=total;
    $('progressTitle').textContent=`${acquired} / ${sprites.length} acquired`; $('progressText').textContent=`Level progress: ${pct(total,max)}%`; $('progressFill').style.width=`${pct(total,max)}%`;
    $('variantSummary').innerHTML=['Base','Gold','Gummy','Galaxy','Holofoil','Gem'].map(f=>{ const all=sprites.filter(s=>s.variantFamily===f); const got=all.filter(s=>s.acquired).length; return `<span class="pill">${f}: <strong>${got}/${all.length}</strong></span>`; }).join('');
  }
  function list(){
    const q=$('search').value.trim().toLowerCase(), filter=$('filter').value, variant=$('variant').value, rarity=$('rarity').value;
    return sprites.filter(s=>{
      if(q && !`${s.name} ${s.baseName} ${s.variantFamily} ${s.rarity} ${s.notes||''}`.toLowerCase().includes(q)) return false;
      if(filter==='acquired' && !s.acquired) return false; if(filter==='missing' && s.acquired) return false; if(filter==='maxed' && !(s.acquired && Number(s.level)===5)) return false; if(filter==='notmaxed' && !(s.acquired && Number(s.level)<5)) return false;
      if(variant!=='all' && s.variantFamily!==variant) return false; if(rarity!=='all' && s.rarity!==rarity) return false; return true;
    }).sort((a,b)=>(a.sortGroup-b.sortGroup)||familyOrder(a.variantFamily)-familyOrder(b.variantFamily)||a.id-b.id);
  }
  function render(){
    stats(); const arr=list(); grid.innerHTML='';
    if(!arr.length){ grid.innerHTML='<div class="empty">No sprites match this filter.</div>'; return; }
    for(const s of arr){
      const node=tpl.content.firstElementChild.cloneNode(true); node.classList.toggle('missing',!s.acquired); node.dataset.id=s.id;
      node.querySelector('.number').textContent=String(s.id).padStart(2,'0');
      const r=node.querySelector('.rarity'); r.textContent=s.rarity; r.classList.add(s.rarity);
      const img=node.querySelector('.sprite-img'); img.src=s.image||s.fallbackImage||''; img.alt=s.name; img.onerror=()=>{ if(s.fallbackImage && !img.src.endsWith(s.fallbackImage)) img.src=s.fallbackImage; };
      const wrap=node.querySelector('.image-wrap'); wrap.dataset.variant=s.variantFamily;
      node.querySelector('h2').textContent=s.name; const vt=node.querySelector('.variant-tag'); vt.textContent=s.variantFamily; vt.classList.add(s.variantFamily); node.querySelector('.base-tag').textContent=s.baseName;
      const acq=node.querySelector('.acquired'), lvl=node.querySelector('.level'), lp=node.querySelector('.level-pill'), notes=node.querySelector('.notes'); acq.checked=!!s.acquired; lvl.value=String(clamp(s.level,0,5)); lp.textContent=`Lvl ${lvl.value}`; notes.value=s.notes||'';
      acq.onchange=()=>{s.acquired=acq.checked; if(!s.acquired)s.level=0; saveSprites(); render();};
      lvl.onchange=()=>{s.level=clamp(lvl.value,0,5); if(s.level>0)s.acquired=true; saveSprites(); render();};
      node.querySelector('.minus').onclick=()=>{s.level=clamp(Number(s.level)-1,0,5); if(s.level===0)s.acquired=false; saveSprites(); render();};
      node.querySelector('.plus').onclick=()=>{s.level=clamp(Number(s.level)+1,0,5); if(s.level>0)s.acquired=true; saveSprites(); render();};
      notes.oninput=()=>{s.notes=notes.value; saveSprites();}; grid.appendChild(node);
    }
  }
  controls.forEach(el=>el && el.addEventListener('input',render));
  $('showMissingBtn').onclick=()=>{$('filter').value='missing';render();}; $('showNeedsBtn').onclick=()=>{$('filter').value='notmaxed';render();}; $('showAllBtn').onclick=()=>{$('filter').value='all';$('variant').value='all';$('rarity').value='all';$('search').value='';render();};
  $('resetBtn').onclick=()=>{ if(confirm('Reset tracker data to the packaged defaults?')){ localStorage.removeItem(SPRITE_STORAGE_KEY); sprites=clone(DEFAULTS); render(); } };
  $('exportBtn').onclick=()=>downloadJson({version:8, exportedAt:new Date().toISOString(), sprites, mapState}, 'fortnite-tracker-backup.json');
  $('importFile').onchange=async(e)=>{const file=e.target.files[0]; if(!file)return; try{const data=JSON.parse(await file.text()); const arr=Array.isArray(data)?data:data.sprites; if(!Array.isArray(arr))throw new Error(); const byId=new Map(arr.map(s=>[s.id,s])); sprites=DEFAULTS.map(s=>({...s,...(byId.get(s.id)||{})})); if(data.mapState){mapState=normalizeMapState(data.mapState); saveMapState();} saveSprites(); render();}catch(err){alert('Could not import this JSON file.');} e.target.value='';};
  render();
}

const DEFAULT_TYPES=[
  {id:'sprite-chest',label:'Sprite Chest',color:'#ff3fb7',iconKind:'chest',builtIn:true,visible:true,description:'Sprite chest locations'},
  {id:'gold-fishing-hole',label:'Gold Fishing Hole',color:'#ffd84a',iconKind:'gold-target',builtIn:true,visible:true,description:'Gold ripple fishing spots'},
  {id:'regular-fishing-hole',label:'Regular Fishing Hole',color:'#27a8ff',iconKind:'blue-target',builtIn:true,visible:true,description:'Normal fishing holes'}
];
function defaultMapState(){const id='current-season'; return {version:8, selectedMapId:id, maps:[{id,name:'Current Season Map',image:'assets/current-season-map.png',builtIn:true,createdAt:new Date().toISOString()}], pinsByMap:{[id]:[]}, types:clone(DEFAULT_TYPES), filters:{types:{},quality:'all',confirmed:'all',showLabels:true}};}
function mergeTypes(existing){const m=new Map(DEFAULT_TYPES.map(t=>[t.id,{...t}])); if(Array.isArray(existing)) existing.forEach(t=>{if(t&&t.id)m.set(t.id,{...(m.get(t.id)||{}),...t});}); return [...m.values()];}
function normalizeMapState(s){const b=defaultMapState(); if(!s||typeof s!=='object')return b; const maps=Array.isArray(s.maps)&&s.maps.length?s.maps:b.maps; const pins=s.pinsByMap&&typeof s.pinsByMap==='object'?s.pinsByMap:{}; maps.forEach(m=>{ if(!Array.isArray(pins[m.id])) pins[m.id]=[]; }); const selected=maps.some(m=>m.id===s.selectedMapId)?s.selectedMapId:maps[0].id; return {version:8, selectedMapId:selected, maps:maps.map(m=>({...m,name:m.name||'Season Map',image:m.image||'assets/current-season-map.png'})), pinsByMap:pins, types:mergeTypes(s.types), filters:{...b.filters,...(s.filters||{})}};}
function loadMapState(){try{return normalizeMapState(JSON.parse(localStorage.getItem(MAP_STORAGE_KEY)));}catch(e){return defaultMapState();}}
function saveMapState(){localStorage.setItem(MAP_STORAGE_KEY,JSON.stringify(mapState));}
function currentMap(){return mapState.maps.find(m=>m.id===mapState.selectedMapId)||mapState.maps[0];}
function currentPins(){return mapState.pinsByMap[mapState.selectedMapId]||(mapState.pinsByMap[mapState.selectedMapId]=[]);}
function typeOf(id){return mapState.types.find(t=>t.id===id)||mapState.types[0];}
function slug(s){return String(s||'custom').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`custom-${Date.now()}`;}

function initMap(){
  const mapScroll=$('mapScroll'), stage=$('mapStage'), img=$('seasonMap'), layer=$('pinLayer'); if(!mapScroll||!stage||!img||!layer)return;
  let adding=false, zoom=1, selectedId=null, pendingCloseup=null, pendingTypeIcon=null;
  const ids=['pinName','pinType','pinArea','pinQuality','pinX','pinY','pinConfirmed','pinNotes'];
  function setMode(){ $('addModeLabel').textContent=adding?'Click the map to place the pin':'Click “Add pin” first'; $('addPinModeBtn').textContent=adding?'Cancel add pin':'Add pin by clicking map'; }
  function filtered(p){const t=typeOf(p.typeId); const vis = mapState.filters.types[p.typeId] !== false && t.visible !== false; if(!vis)return false; if(mapState.filters.quality!=='all'&&p.quality!==mapState.filters.quality)return false; if(mapState.filters.confirmed==='confirmed'&&!p.confirmed)return false; if(mapState.filters.confirmed==='unconfirmed'&&p.confirmed)return false; return true;}
  function renderSeasons(){const sel=$('seasonSelect'); sel.innerHTML=mapState.maps.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''); sel.value=mapState.selectedMapId;}
  function renderTypes(){const s=$('pinType'); s.innerHTML=mapState.types.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join(''); if(!s.value&&mapState.types[0])s.value=mapState.types[0].id;
    $('typeFilters').innerHTML=mapState.types.map(t=>`<label class="type-toggle"><input type="checkbox" data-type="${esc(t.id)}" ${mapState.filters.types[t.id]===false?'':'checked'} /><span style="--c:${esc(t.color)}"></span>${esc(t.label)}</label>`).join('');
    document.querySelectorAll('#typeFilters input').forEach(cb=>cb.onchange=()=>{mapState.filters.types[cb.dataset.type]=cb.checked;saveMapState();renderPins();renderLegend();});
    $('typeList').innerHTML=mapState.types.map(t=>`<div class="type-row"><span class="pin-icon small ${t.iconKind}" style="--pin:${esc(t.color)}">${iconHtml(t,true)}</span><div><strong>${esc(t.label)}</strong><small>${esc(t.description||'')}</small></div>${t.builtIn?'<em>Built-in</em>':`<button class="mini-btn delete-type" data-id="${esc(t.id)}">Delete</button>`}</div>`).join('');
    document.querySelectorAll('.delete-type').forEach(btn=>btn.onclick=()=>{ if(confirm('Delete this custom type? Pins using it will stay but change to Sprite Chest.')){ const id=btn.dataset.id; mapState.types=mapState.types.filter(t=>t.id!==id); currentPins().forEach(p=>{if(p.typeId===id)p.typeId='sprite-chest';}); saveMapState(); renderAll(); } });
  }
  function iconHtml(t, small=false){ if(t.iconKind==='chest')return '<img src="assets/pin_sprite_chest.png" alt="" />'; if(t.iconKind==='gold-target')return '<i></i>'; if(t.iconKind==='blue-target')return '<i></i>'; if(t.iconData)return `<img src="${t.iconData}" alt="" />`; return '<b></b>'; }
  function renderMap(){const m=currentMap(); img.src=m.image; img.onload=()=>fitStage();}
  function fitStage(){ stage.style.width=img.naturalWidth?`${img.naturalWidth}px`:'1160px'; stage.style.height=img.naturalHeight?`${img.naturalHeight}px`:'1163px'; applyZoom(); }
  function applyZoom(){ zoom=Number($('mapZoom').value)||1; stage.style.transform=`scale(${zoom})`; stage.style.transformOrigin='top left'; mapScroll.style.setProperty('--stage-w', `${stage.offsetWidth*zoom}px`); }
  function renderPins(){layer.innerHTML=''; const pins=currentPins().filter(filtered); pins.forEach(p=>{const t=typeOf(p.typeId); const el=document.createElement('button'); el.type='button'; el.className=`map-pin ${t.iconKind||'custom'} ${p.id===selectedId?'selected':''}`; el.style.left=`${p.x}%`; el.style.top=`${p.y}%`; el.style.setProperty('--pin', t.color||'#16f0d0'); el.innerHTML=`<span class="pin-icon">${iconHtml(t)}</span><span class="pin-label">${esc(p.name||t.label)}</span>`; el.title=`${p.name||t.label} — ${p.area||''}`; el.onclick=(ev)=>{ev.stopPropagation(); loadPin(p.id);}; layer.appendChild(el);}); $('pinCount').textContent=currentPins().length; $('bestPinCount').textContent=currentPins().filter(p=>p.quality==='Best').length; document.body.classList.toggle('hide-map-labels', mapState.filters.showLabels===false); $('toggleLabelsBtn').textContent=mapState.filters.showLabels===false?'Show labels':'Hide labels';}
  function renderLegend(){const visible=new Set(currentPins().map(p=>p.typeId)); $('mapLegend').innerHTML=mapState.types.map(t=>`<span class="legend-item ${visible.has(t.id)?'active':''}"><span class="pin-icon small ${t.iconKind}" style="--pin:${esc(t.color)}">${iconHtml(t,true)}</span>${esc(t.label)}</span>`).join('');}
  function renderAll(){renderSeasons();renderTypes();renderMap();renderPins();renderLegend();setMode();}
  function clearForm(){selectedId=null; $('editingPinId').value=''; $('pinName').value='Sprite'; $('pinArea').value=''; $('pinQuality').value='Best'; $('pinX').value=''; $('pinY').value=''; $('pinConfirmed').checked=false; $('pinNotes').value=''; $('pinCloseup').value=''; pendingCloseup=null; $('closeupPreview').innerHTML='<span>No close-up yet. Auto-crop will be created from the map when possible.</span>'; renderPins();}
  function loadPin(id){const p=currentPins().find(x=>x.id===id); if(!p)return; selectedId=id; $('editingPinId').value=p.id; $('pinName').value=p.name||'Sprite'; $('pinType').value=p.typeId||'sprite-chest'; $('pinArea').value=p.area||''; $('pinQuality').value=p.quality||'Best'; $('pinX').value=p.x; $('pinY').value=p.y; $('pinConfirmed').checked=!!p.confirmed; $('pinNotes').value=p.notes||''; pendingCloseup=p.closeup||null; $('closeupPreview').innerHTML=p.closeup?`<img src="${p.closeup}" alt="Close-up" />`:'<span>No close-up yet.</span>'; renderPins();}
  async function createCrop(x,y){try{const canvas=document.createElement('canvas'), size=420; canvas.width=size; canvas.height=size; const ctx=canvas.getContext('2d'); const iw=img.naturalWidth, ih=img.naturalHeight; if(!iw||!ih)return null; const sx=clamp((x/100)*iw-size/2,0,Math.max(0,iw-size)), sy=clamp((y/100)*ih-size/2,0,Math.max(0,ih-size)); ctx.drawImage(img,sx,sy,size,size,0,0,size,size); return canvas.toDataURL('image/jpeg',.85);}catch(e){return null;}}
  async function savePin(){const x=clamp($('pinX').value,0,100), y=clamp($('pinY').value,0,100); if(!x&&!y){alert('Click the map or enter X/Y percentages first.');return;} const pins=currentPins(); let p=pins.find(x=>x.id===$('editingPinId').value); if(!p){p={id:`pin-${Date.now()}-${Math.random().toString(16).slice(2)}`,createdAt:new Date().toISOString()}; pins.push(p);} Object.assign(p,{name:$('pinName').value||'Sprite', typeId:$('pinType').value||'sprite-chest', area:$('pinArea').value||'', quality:$('pinQuality').value||'Best', x, y, confirmed:$('pinConfirmed').checked, notes:$('pinNotes').value||'', updatedAt:new Date().toISOString()}); p.closeup=pendingCloseup || p.closeup || await createCrop(x,y); saveMapState(); loadPin(p.id); renderLegend();}
  stage.addEventListener('click',(ev)=>{ if(!adding)return; const rect=stage.getBoundingClientRect(); const x=clamp(((ev.clientX-rect.left)/rect.width)*100,0,100); const y=clamp(((ev.clientY-rect.top)/rect.height)*100,0,100); $('pinX').value=x.toFixed(2); $('pinY').value=y.toFixed(2); adding=false; setMode(); });
  $('addPinModeBtn').onclick=()=>{adding=!adding; setMode();}; $('toggleLabelsBtn').onclick=()=>{mapState.filters.showLabels=!mapState.filters.showLabels; saveMapState(); renderPins();}; $('savePinBtn').onclick=savePin; $('clearPinBtn').onclick=clearForm; $('deletePinBtn').onclick=()=>{const id=$('editingPinId').value; if(!id)return; if(confirm('Delete this pin?')){mapState.pinsByMap[mapState.selectedMapId]=currentPins().filter(p=>p.id!==id); saveMapState(); clearForm(); renderAll();}};
  $('pinCloseup').onchange=async(e)=>{const f=e.target.files[0]; if(!f)return; pendingCloseup=await readDataUrl(f); $('closeupPreview').innerHTML=`<img src="${pendingCloseup}" alt="Close-up" />`;};
  $('seasonSelect').onchange=()=>{mapState.selectedMapId=$('seasonSelect').value; saveMapState(); clearForm(); renderAll();};
  $('newSeasonBtn').onclick=()=>{const name=prompt('Season map name:', 'New Fortnite Season Map'); if(!name)return; const id=slug(name)+'-'+Date.now(); mapState.maps.push({id,name,image:'assets/current-season-map.png',createdAt:new Date().toISOString()}); mapState.pinsByMap[id]=[]; mapState.selectedMapId=id; saveMapState(); renderAll();};
  $('seasonImageFile').onchange=async(e)=>{const f=e.target.files[0]; if(!f)return; currentMap().image=await readDataUrl(f); saveMapState(); renderAll(); e.target.value='';};
  $('deleteSeasonBtn').onclick=()=>{if(mapState.maps.length<=1){alert('You need at least one season map.');return;} if(confirm('Delete this season map and its pins?')){const id=mapState.selectedMapId; mapState.maps=mapState.maps.filter(m=>m.id!==id); delete mapState.pinsByMap[id]; mapState.selectedMapId=mapState.maps[0].id; saveMapState(); clearForm(); renderAll();}};
  $('qualityFilter').onchange=()=>{mapState.filters.quality=$('qualityFilter').value; saveMapState(); renderPins();}; $('confirmedFilter').onchange=()=>{mapState.filters.confirmed=$('confirmedFilter').value; saveMapState(); renderPins();}; $('showAllMapBtn').onclick=()=>{mapState.types.forEach(t=>mapState.filters.types[t.id]=true); mapState.filters.quality='all'; mapState.filters.confirmed='all'; $('qualityFilter').value='all'; $('confirmedFilter').value='all'; saveMapState(); renderAll();};
  $('zoomOutBtn').onclick=()=>{$('mapZoom').value=Math.max(1,Number($('mapZoom').value)-.1).toFixed(1);applyZoom();}; $('zoomInBtn').onclick=()=>{$('mapZoom').value=Math.min(3,Number($('mapZoom').value)+.1).toFixed(1);applyZoom();}; $('fitMapBtn').onclick=()=>{$('mapZoom').value=1; mapScroll.scrollTo({top:0,left:0}); applyZoom();}; $('mapZoom').oninput=applyZoom;
  $('pinTabBtn').onclick=()=>{$('pinEditorPanel').hidden=false;$('typeEditorPanel').hidden=true;$('pinTabBtn').classList.add('active');$('typeTabBtn').classList.remove('active');}; $('typeTabBtn').onclick=()=>{$('pinEditorPanel').hidden=true;$('typeEditorPanel').hidden=false;$('typeTabBtn').classList.add('active');$('pinTabBtn').classList.remove('active');};
  $('newTypeIcon').onchange=async(e)=>{const f=e.target.files[0]; pendingTypeIcon=f?await readDataUrl(f):null;}; $('addTypeBtn').onclick=()=>{const name=$('newTypeName').value.trim(); if(!name){alert('Enter a type name first.');return;} const id=slug(name); if(mapState.types.some(t=>t.id===id)){alert('That type already exists.');return;} mapState.types.push({id,label:name,color:$('newTypeColor').value,iconKind:'custom',iconData:pendingTypeIcon||'',visible:$('newTypeVisible').checked,description:$('newTypeDescription').value||'',builtIn:false}); mapState.filters.types[id]=$('newTypeVisible').checked; pendingTypeIcon=null; ['newTypeName','newTypeDescription'].forEach(i=>$(i).value=''); $('newTypeIcon').value=''; saveMapState(); renderAll();};
  $('exportPinsBtn').onclick=()=>downloadJson({version:8, exportedAt:new Date().toISOString(), mapState}, 'fortnite-location-map-backup.json');
  $('importPinsFile').onchange=async(e)=>{const f=e.target.files[0]; if(!f)return; try{const data=JSON.parse(await f.text()); mapState=normalizeMapState(data.mapState||data); saveMapState(); renderAll();}catch(err){alert('Could not import this map JSON file.');} e.target.value='';};
  $('resetMapBtn').onclick=()=>{if(confirm('Delete all pins for this season map?')){mapState.pinsByMap[mapState.selectedMapId]=[];saveMapState();clearForm();renderAll();}};
  renderAll();
}

document.addEventListener('DOMContentLoaded',()=>{initTracker(); initMap();});
})();

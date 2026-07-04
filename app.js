(() => {
  'use strict';
  const SPRITE_KEY = 'fortnite-sprite-tracker-v10-stable';
  const MAP_KEY = 'fortnite-location-map-v10-stable';
  const $ = (id) => document.getElementById(id);
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const defaults = Array.isArray(window.DEFAULT_SPRITES) ? window.DEFAULT_SPRITES : [];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number(v) || 0));
  const pct = (n,d) => d ? Math.round(n/d*100) : 0;
  const esc = (s) => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const on = (id, ev, fn) => { const el=$(id); if(el) el.addEventListener(ev, fn); return el; };
  const readFile = (file) => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
  function downloadJson(data, name){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); }
  function familyOrder(f){ return {Base:0,Gold:1,Gummy:2,Galaxy:3,Holofoil:4,Gem:5}[f] ?? 9; }
  function normalizeSprites(incoming){
    if(!defaults.length) return [];
    if(!Array.isArray(incoming) || incoming.length < Math.max(10, Math.floor(defaults.length/2))) return clone(defaults);
    const byId = new Map(incoming.map(s => [Number(s.id), s]));
    return defaults.map(base => ({...base, ...(byId.get(Number(base.id)) || {}), id:Number(base.id)}));
  }
  function loadSprites(){
    try { return normalizeSprites(JSON.parse(localStorage.getItem(SPRITE_KEY))); }
    catch(e){ return clone(defaults); }
  }
  let sprites = loadSprites();
  function saveSprites(){ localStorage.setItem(SPRITE_KEY, JSON.stringify(sprites)); }

  function initTracker(){
    if(document.body.dataset.page !== 'tracker') return;
    const grid=$('grid'), tpl=$('cardTemplate');
    const debug=$('debugStatus');
    if(debug) debug.textContent = `Loaded ${defaults.length} default sprites • active tracker storage: v10`;
    if(!grid || !tpl) return;
    const search=$('search'), filter=$('filter'), variant=$('variant'), rarity=$('rarity');
    function stats(){
      const acquired=sprites.filter(s=>s.acquired).length;
      const maxed=sprites.filter(s=>s.acquired && Number(s.level)===5).length;
      const missing=sprites.length-acquired;
      const levels=sprites.reduce((a,s)=>a+(s.acquired?Number(s.level||0):0),0);
      const max=sprites.length*5;
      $('acquiredCount').textContent=acquired; $('maxedCount').textContent=maxed; $('missingCount').textContent=missing; $('totalLevel').textContent=levels;
      $('progressTitle').textContent=`${acquired} / ${sprites.length} acquired`; $('progressText').textContent=`Level progress: ${pct(levels,max)}%`; $('progressFill').style.width=`${pct(levels,max)}%`;
      const fams=['Base','Gold','Gummy','Galaxy','Holofoil','Gem'];
      $('variantSummary').innerHTML=fams.map(f=>{ const arr=sprites.filter(s=>s.variantFamily===f); const got=arr.filter(s=>s.acquired).length; return `<span class="chip">${f}: <strong>${got}/${arr.length}</strong></span>`; }).join('');
    }
    function filtered(){
      const q=(search.value||'').toLowerCase().trim();
      return sprites.filter(s=>{
        if(q && !(`${s.name} ${s.baseName} ${s.variantFamily} ${s.rarity}`.toLowerCase().includes(q))) return false;
        if(filter.value==='acquired' && !s.acquired) return false;
        if(filter.value==='missing' && s.acquired) return false;
        if(filter.value==='maxed' && !(s.acquired && Number(s.level)===5)) return false;
        if(filter.value==='notmaxed' && !(s.acquired && Number(s.level)<5)) return false;
        if(variant.value!=='all' && s.variantFamily!==variant.value) return false;
        if(rarity.value!=='all' && s.rarity!==rarity.value) return false;
        return true;
      }).sort((a,b)=>(a.sortGroup-b.sortGroup)||(familyOrder(a.variantFamily)-familyOrder(b.variantFamily))||(a.id-b.id));
    }
    function render(){
      stats(); grid.innerHTML='';
      const list=filtered();
      if(!list.length){ grid.innerHTML='<div class="empty">No sprites match this filter.</div>'; return; }
      list.forEach(s=>{
        const node=tpl.content.firstElementChild.cloneNode(true); node.classList.toggle('missing',!s.acquired);
        node.querySelector('.num').textContent=String(s.id).padStart(2,'0');
        const r=node.querySelector('.rarity'); r.textContent=s.rarity; r.classList.add(s.rarity);
        const img=node.querySelector('.sprite-img'); img.src=s.image || s.fallbackImage || ''; img.alt=s.name; img.onerror=()=>{ if(s.fallbackImage) img.src=s.fallbackImage; };
        node.querySelector('h2').textContent=s.name;
        node.querySelector('.variant-tag').textContent=s.variantFamily; node.querySelector('.base-tag').textContent=s.baseName;
        const ac=node.querySelector('.acquired'), lvl=node.querySelector('.level'), lp=node.querySelector('.level-pill'), notes=node.querySelector('.notes');
        ac.checked=!!s.acquired; lvl.value=String(clamp(s.level,0,5)); lp.textContent=`Lvl ${clamp(s.level,0,5)}`; notes.value=s.notes||'';
        ac.addEventListener('change',()=>{s.acquired=ac.checked;if(!s.acquired)s.level=0;saveSprites();render();});
        lvl.addEventListener('change',()=>{s.level=clamp(lvl.value,0,5);if(s.level>0)s.acquired=true;saveSprites();render();});
        node.querySelector('.minus').addEventListener('click',()=>{s.level=clamp(Number(s.level)-1,0,5);if(s.level===0)s.acquired=false;saveSprites();render();});
        node.querySelector('.plus').addEventListener('click',()=>{s.level=clamp(Number(s.level)+1,0,5);if(s.level>0)s.acquired=true;saveSprites();render();});
        notes.addEventListener('input',()=>{s.notes=notes.value;saveSprites();});
        grid.appendChild(node);
      });
    }
    [search,filter,variant,rarity].forEach(el=>el && el.addEventListener('input',render));
    on('showMissingBtn','click',()=>{filter.value='missing';render();});
    on('showNeedsBtn','click',()=>{filter.value='notmaxed';render();});
    on('showAllBtn','click',()=>{search.value='';filter.value='all';variant.value='all';rarity.value='all';render();});
    on('resetBtn','click',()=>{if(confirm('Reset tracker to packaged data?')){localStorage.removeItem(SPRITE_KEY);sprites=clone(defaults);render();}});
    on('exportBtn','click',()=>downloadJson({version:10,exportedAt:new Date().toISOString(),sprites,mapState:loadMap()},'fortnite-sprite-tracker-backup.json'));
    on('importFile','change',async(e)=>{const f=e.target.files[0]; if(!f)return; try{const d=JSON.parse(await f.text()); sprites=normalizeSprites(Array.isArray(d)?d:d.sprites); saveSprites(); render();}catch(err){alert('Could not import JSON.');} e.target.value='';});
    render();
  }

  const BUILTIN_TYPES=[
    {id:'sprite-chest',label:'Sprite Chest',color:'#ff3fb7',icon:'chest',builtIn:true,visible:true},
    {id:'gold-fishing-hole',label:'Gold Fishing Hole',color:'#ffd84a',icon:'gold',builtIn:true,visible:true},
    {id:'regular-fishing-hole',label:'Regular Fishing Hole',color:'#2da8ff',icon:'blue',builtIn:true,visible:true}
  ];
  function defaultMap(){return {version:10,selectedMapId:'current-season',maps:[{id:'current-season',name:'Current Season Map',image:'assets/current-season-map.png',builtIn:true}],types:clone(BUILTIN_TYPES),pinsByMap:{'current-season':[]},filters:{types:{},quality:'all',confirmed:'all',showLabels:true}};}
  function normalizeMap(s){
    const d=defaultMap(); if(!s || typeof s!=='object') return d;
    const maps=Array.isArray(s.maps)&&s.maps.length?s.maps:d.maps;
    const typeMap=new Map(BUILTIN_TYPES.map(t=>[t.id,t])); if(Array.isArray(s.types)) s.types.forEach(t=>{if(t&&t.id)typeMap.set(t.id,{...typeMap.get(t.id),...t});});
    const selected=maps.some(m=>m.id===s.selectedMapId)?s.selectedMapId:maps[0].id;
    const pinsByMap=(s.pinsByMap&&typeof s.pinsByMap==='object')?s.pinsByMap:{}; maps.forEach(m=>{if(!Array.isArray(pinsByMap[m.id]))pinsByMap[m.id]=[];});
    return {version:10,selectedMapId:selected,maps:maps.map(m=>({...m,name:m.name||'Season Map',image:m.image||'assets/current-season-map.png'})),types:[...typeMap.values()],pinsByMap,filters:{...d.filters,...(s.filters||{})}};
  }
  function loadMap(){try{return normalizeMap(JSON.parse(localStorage.getItem(MAP_KEY)));}catch(e){return defaultMap();}}
  let mapState=loadMap();
  function saveMap(){localStorage.setItem(MAP_KEY,JSON.stringify(mapState));}
  function curMap(){return mapState.maps.find(m=>m.id===mapState.selectedMapId)||mapState.maps[0];}
  function pins(){return mapState.pinsByMap[mapState.selectedMapId]||(mapState.pinsByMap[mapState.selectedMapId]=[]);}
  function typeById(id){return mapState.types.find(t=>t.id===id)||mapState.types[0]||BUILTIN_TYPES[0];}
  function slug(s){return String(s||'custom').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||`custom-${Date.now()}`;}
  function iconHtml(t){
    if(t.iconImage) return `<span class="pin-custom"><img src="${esc(t.iconImage)}" alt=""></span>`;
    if(t.icon==='chest') return `<span class="pin-chest"><img src="assets/map-pin-sprite-chest.png" alt=""></span>`;
    if(t.icon==='gold') return `<span class="pin-target gold"></span>`;
    if(t.icon==='blue') return `<span class="pin-target blue"></span>`;
    return `<span class="pin-custom" style="--c:${esc(t.color||'#16f0d0')}"></span>`;
  }
  function miniIcon(t){
    if(t.iconImage) return `<img class="type-mini-img" src="${esc(t.iconImage)}" alt="">`;
    if(t.icon==='chest') return `<img class="type-mini-img" src="assets/map-pin-sprite-chest.png" alt="">`;
    if(t.icon==='gold') return `<span class="target-mini gold-target-mini"></span>`;
    if(t.icon==='blue') return `<span class="target-mini blue-target-mini"></span>`;
    return `<span class="custom-dot" style="background:${esc(t.color||'#16f0d0')}"></span>`;
  }
  function initMap(){
    if(document.body.dataset.page !== 'map') return;
    const mapScroll=$('mapScroll'), mapStage=$('mapStage'), seasonMap=$('seasonMap'), pinLayer=$('pinLayer'); if(!mapScroll||!mapStage||!seasonMap||!pinLayer)return;
    let adding=false, selected=null, zoom=1, pendingCloseup=null, pendingTypeIcon=null;
    const setHint=(t)=>{const e=$('mapHint');if(e)e.textContent=t;};
    function renderSeasons(){const sel=$('seasonSelect'); sel.innerHTML=mapState.maps.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''); sel.value=mapState.selectedMapId; seasonMap.src=curMap().image;}
    function renderTypes(){
      const sel=$('pinType'); if(sel){const val=sel.value; sel.innerHTML=mapState.types.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join(''); if(mapState.types.some(t=>t.id===val))sel.value=val;}
      const filters=$('typeFilters'); if(filters){filters.innerHTML=mapState.types.map(t=>`<label class="chip">${miniIcon(t)} <input type="checkbox" data-t="${esc(t.id)}" ${mapState.filters.types[t.id]!==false?'checked':''}> ${esc(t.label)}</label>`).join(''); filters.querySelectorAll('[data-t]').forEach(i=>i.addEventListener('change',()=>{mapState.filters.types[i.dataset.t]=i.checked;saveMap();renderPins();renderLegend();}));}
      const list=$('typeList'); if(list){list.innerHTML=mapState.types.map(t=>`<div class="type-row">${miniIcon(t)}<div><strong>${esc(t.label)}</strong><div class="help">${t.builtIn?'Built-in':'Custom'}</div></div>${t.builtIn?'':`<button class="mini danger-mini" data-deltype="${esc(t.id)}">Delete</button>`}</div>`).join(''); list.querySelectorAll('[data-deltype]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete custom type? Pins using it become Sprite Chest.')){const id=b.dataset.deltype;mapState.types=mapState.types.filter(t=>t.id!==id);Object.values(mapState.pinsByMap).forEach(arr=>arr.forEach(p=>{if(p.typeId===id)p.typeId='sprite-chest';}));saveMap();renderAll();}}));}
    }
    function visible(p){return mapState.filters.types[p.typeId]!==false && (mapState.filters.quality==='all'||p.quality===mapState.filters.quality) && (mapState.filters.confirmed==='all'||(mapState.filters.confirmed==='confirmed'?p.confirmed:!p.confirmed));}
    function renderPins(){
      pinLayer.innerHTML=''; const arr=pins(); const shown=arr.filter(visible); $('pinStats').textContent=`${shown.length} pins • ${shown.filter(p=>p.quality==='Best').length} best`;
      mapStage.classList.toggle('hide-labels',mapState.filters.showLabels===false);
      shown.forEach(p=>{const t=typeById(p.typeId); const el=document.createElement('button'); el.type='button'; el.className='map-pin'; el.style.left=`${p.x}%`; el.style.top=`${p.y}%`; el.innerHTML=`${iconHtml(t)}<span class="pin-label">${esc(p.name||t.label)}</span>`; el.addEventListener('click',(ev)=>{ev.stopPropagation();selected=p.id;loadPin(p);}); pinLayer.appendChild(el);});
    }
    function renderLegend(){const l=$('legend'); if(!l)return; l.innerHTML=mapState.types.map(t=>`<div class="legend-row">${miniIcon(t)}<strong>${esc(t.label)}</strong><span class="help">${pins().filter(p=>p.typeId===t.id).length}</span></div>`).join('');}
    function renderAll(){renderSeasons();renderTypes();renderPins();renderLegend();}
    function loadPin(p){$('pinName').value=p.name||'';$('pinType').value=p.typeId||'sprite-chest';$('pinArea').value=p.area||'';$('pinQuality').value=p.quality||'Best';$('pinX').value=p.x;$('pinY').value=p.y;$('pinConfirmed').checked=!!p.confirmed;$('pinNotes').value=p.notes||'';const prev=$('closeupPreview'); if(p.closeup){prev.src=p.closeup;prev.style.display='block';}else{prev.style.display='none';} pendingCloseup=p.closeup||null;}
    function clearForm(){selected=null;pendingCloseup=null;['pinArea','pinX','pinY','pinNotes'].forEach(id=>$(id).value='');$('pinName').value='Sprite';$('pinType').value=mapState.types[0]?.id||'sprite-chest';$('pinQuality').value='Best';$('pinConfirmed').checked=false;$('pinCloseup').value='';$('closeupPreview').style.display='none';}
    function savePin(){const x=clamp($('pinX').value,0,100), y=clamp($('pinY').value,0,100); if(!x && !y){alert('Click the map or enter X/Y first.');return;} let p=selected?pins().find(a=>a.id===selected):null; if(!p){p={id:`pin-${Date.now()}-${Math.random().toString(16).slice(2)}`}; pins().push(p); selected=p.id;} Object.assign(p,{name:$('pinName').value||'Sprite',typeId:$('pinType').value,area:$('pinArea').value,quality:$('pinQuality').value,x,y,confirmed:$('pinConfirmed').checked,notes:$('pinNotes').value,closeup:pendingCloseup||''}); saveMap(); renderPins(); renderLegend();}
    function place(ev){if(!adding)return; const rect=seasonMap.getBoundingClientRect(); const x=(ev.clientX-rect.left)/rect.width*100, y=(ev.clientY-rect.top)/rect.height*100; $('pinX').value=clamp(x,0,100).toFixed(2); $('pinY').value=clamp(y,0,100).toFixed(2); setHint('Pin position selected. Fill details and Save pin.'); adding=false; mapScroll.style.cursor='grab';}
    function setZoom(v){zoom=clamp(v,.45,2.2);$('mapZoom').value=zoom; mapStage.style.transform=`scale(${zoom})`; mapStage.style.marginBottom=`${seasonMap.naturalHeight*(zoom-1)}px`; mapStage.style.marginRight=`${seasonMap.naturalWidth*(zoom-1)}px`;}
    on('addPinModeBtn','click',()=>{adding=!adding;mapScroll.style.cursor=adding?'crosshair':'grab';setHint(adding?'Click the map to choose the exact pin spot.':'Click “Add pin” first');});
    on('savePinBtn','click',savePin); on('clearPinBtn','click',clearForm); on('deletePinBtn','click',()=>{if(!selected)return; mapState.pinsByMap[mapState.selectedMapId]=pins().filter(p=>p.id!==selected);clearForm();saveMap();renderPins();renderLegend();});
    on('exportPinsBtn','click',()=>downloadJson({version:10,exportedAt:new Date().toISOString(),mapState},'fortnite-map-locations-backup.json'));
    on('importPinsFile','change',async(e)=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());mapState=normalizeMap(d.mapState||d);saveMap();clearForm();renderAll();}catch(err){alert('Could not import map JSON.');}e.target.value='';});
    on('resetMapBtn','click',()=>{if(confirm('Delete every map pin and reset map manager?')){localStorage.removeItem(MAP_KEY);mapState=defaultMap();saveMap();clearForm();renderAll();}});
    on('seasonSelect','change',e=>{mapState.selectedMapId=e.target.value;saveMap();clearForm();renderAll();});
    on('newSeasonBtn','click',()=>{const name=prompt('Season map name:',`Fortnite Season ${mapState.maps.length+1}`); if(!name)return; const id=slug(name)+'-'+Date.now(); mapState.maps.push({id,name,image:'assets/current-season-map.png'}); mapState.pinsByMap[id]=[]; mapState.selectedMapId=id; saveMap();renderAll();});
    on('seasonImageFile','change',async(e)=>{const f=e.target.files[0];if(!f)return; curMap().image=await readFile(f);saveMap();renderAll();e.target.value='';});
    on('deleteSeasonBtn','click',()=>{if(mapState.maps.length<=1){alert('Keep at least one map.');return;} if(confirm('Delete this season map and its pins?')){const id=mapState.selectedMapId;mapState.maps=mapState.maps.filter(m=>m.id!==id);delete mapState.pinsByMap[id];mapState.selectedMapId=mapState.maps[0].id;saveMap();renderAll();}});
    on('qualityFilter','change',e=>{mapState.filters.quality=e.target.value;saveMap();renderPins();renderLegend();}); on('confirmedFilter','change',e=>{mapState.filters.confirmed=e.target.value;saveMap();renderPins();renderLegend();});
    on('showAllMapBtn','click',()=>{mapState.filters.types={};mapState.filters.quality='all';mapState.filters.confirmed='all';$('qualityFilter').value='all';$('confirmedFilter').value='all';saveMap();renderAll();});
    on('toggleLabelsBtn','click',()=>{mapState.filters.showLabels=mapState.filters.showLabels===false; $('toggleLabelsBtn').textContent=mapState.filters.showLabels===false?'Show labels':'Hide labels'; saveMap(); renderPins();});
    on('pinCloseup','change',async(e)=>{const f=e.target.files[0];if(!f)return;pendingCloseup=await readFile(f);$('closeupPreview').src=pendingCloseup;$('closeupPreview').style.display='block';});
    on('addTypeBtn','click',()=>{const name=$('newTypeName').value.trim(); if(!name){alert('Type name required.');return;} const id=slug(name); if(mapState.types.some(t=>t.id===id)){alert('A type with this name already exists.');return;} mapState.types.push({id,label:name,color:$('newTypeColor').value,icon:'custom',iconImage:pendingTypeIcon||'',builtIn:false,visible:$('newTypeVisible').checked}); mapState.filters.types[id]=$('newTypeVisible').checked; pendingTypeIcon=null; $('newTypeIcon').value=''; $('newTypeName').value=''; saveMap(); renderAll();});
    on('newTypeIcon','change',async(e)=>{const f=e.target.files[0]; pendingTypeIcon=f?await readFile(f):null;});
    on('pinTabBtn','click',()=>{$('pinEditorPanel').hidden=false;$('typeEditorPanel').hidden=true;$('pinTabBtn').classList.add('active');$('typeTabBtn').classList.remove('active');}); on('typeTabBtn','click',()=>{$('pinEditorPanel').hidden=true;$('typeEditorPanel').hidden=false;$('typeTabBtn').classList.add('active');$('pinTabBtn').classList.remove('active');renderTypes();renderLegend();});
    on('mapZoom','input',e=>setZoom(e.target.value)); on('zoomOutBtn','click',()=>setZoom(zoom-.15)); on('zoomInBtn','click',()=>setZoom(zoom+.15)); on('fitMapBtn','click',()=>{setZoom(1);mapScroll.scrollTo(0,0);});
    mapStage.addEventListener('click',place);
    let drag=false,sx=0,sy=0,sl=0,st=0; mapScroll.addEventListener('mousedown',e=>{if(adding||e.target.closest('.map-pin'))return;drag=true;sx=e.pageX;sy=e.pageY;sl=mapScroll.scrollLeft;st=mapScroll.scrollTop;}); window.addEventListener('mouseup',()=>drag=false); mapScroll.addEventListener('mousemove',e=>{if(!drag)return;e.preventDefault();mapScroll.scrollLeft=sl-(e.pageX-sx);mapScroll.scrollTop=st-(e.pageY-sy);});
    $('qualityFilter').value=mapState.filters.quality||'all'; $('confirmedFilter').value=mapState.filters.confirmed||'all'; $('toggleLabelsBtn').textContent=mapState.filters.showLabels===false?'Show labels':'Hide labels'; $('mapDebug').textContent='Map manager loaded: v10 stable';
    setZoom(1); renderAll(); clearForm();
  }
  window.addEventListener('DOMContentLoaded', () => { try{ initTracker(); initMap(); } catch(err){ console.error(err); const box=document.createElement('pre'); box.style.cssText='white-space:pre-wrap;background:#290b21;color:#fff;padding:16px;margin:16px;border:1px solid #ff3b73;border-radius:12px'; box.textContent='Website script error:\n'+(err&&err.stack?err.stack:err); document.body.prepend(box); } });
})();

const STORAGE_KEY = "fortnite-sprite-tracker-gitlab-v1";
const CUSTOM_KEY = "fortnite-sprite-tracker-gitlab-custom-v1";
const DEFAULT_IMAGE = "assets/sprite_01.png";
let sprites = loadSprites();
const grid = document.getElementById("grid");
const template = document.getElementById("cardTemplate");
const search = document.getElementById("search");
const filter = document.getElementById("filter");
const rarity = document.getElementById("rarity");
const variant = document.getElementById("variant");
const addDialog = document.getElementById("addDialog");
const addSpriteForm = document.getElementById("addSpriteForm");

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function defaultMap(){ return new Map(DEFAULT_SPRITES.map(s => [String(s.id), clone(s)])); }
function loadSprites(){
  const defaults = defaultMap();
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const customRaw = localStorage.getItem(CUSTOM_KEY);
  let merged = Array.from(defaults.values());
  if(savedRaw){
    try{
      const saved = JSON.parse(savedRaw);
      if(Array.isArray(saved)){
        const byId = new Map(saved.map(s => [String(s.id), s]));
        merged = merged.map(base => ({...base, ...(byId.get(String(base.id)) || {})}));
      }
    }catch(e){ console.warn("Saved tracker data could not be parsed", e); }
  }
  if(customRaw){
    try{
      const custom = JSON.parse(customRaw);
      if(Array.isArray(custom)) merged = merged.concat(custom.map(normalizeCustom));
    }catch(e){ console.warn("Custom sprite data could not be parsed", e); }
  }
  return merged;
}
function save(){
  const defaultIds = new Set(DEFAULT_SPRITES.map(s => String(s.id)));
  const regular = sprites.filter(s => defaultIds.has(String(s.id)));
  const custom = sprites.filter(s => !defaultIds.has(String(s.id)) || s.custom);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(regular));
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
}
function normalizeCustom(s){
  return {
    id: s.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    name: s.name || "Unnamed Sprite",
    rarity: s.rarity || "UNKNOWN",
    image: s.image || DEFAULT_IMAGE,
    fallbackImage: s.fallbackImage || DEFAULT_IMAGE,
    remoteImage: s.remoteImage || "",
    level: clampLevel(s.level),
    acquired: !!s.acquired,
    source: s.source || "custom",
    variantFamily: s.variantFamily || "Custom",
    baseName: s.baseName || "Custom",
    category: "custom",
    sortGroup: Number(s.sortGroup ?? 999),
    notes: s.notes || "",
    custom: true
  };
}
function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }
function clampLevel(v){ return Math.max(0, Math.min(5, Number(v)||0)); }
function familyOrder(f){ return {Base:0,Gold:1,Gummy:2,Galaxy:3,Holofoil:4,Gem:5,Custom:6}[f] ?? 9; }
function effectiveImage(sprite){ return sprite.imageOverride || sprite.remoteImage || sprite.image || sprite.fallbackImage || DEFAULT_IMAGE; }
function fallbackImage(sprite){ return sprite.fallbackImage || sprite.image || DEFAULT_IMAGE; }
function updateStats(){
  const acquired=sprites.filter(s=>s.acquired).length;
  const maxed=sprites.filter(s=>s.acquired && Number(s.level)===5).length;
  const missing=sprites.length-acquired;
  const totalLevel=sprites.reduce((a,s)=>a+(s.acquired?Number(s.level||0):0),0);
  const maxTotal=sprites.length*5;
  document.getElementById("acquiredCount").textContent=acquired;
  document.getElementById("maxedCount").textContent=maxed;
  document.getElementById("missingCount").textContent=missing;
  document.getElementById("totalLevel").textContent=totalLevel;
  document.getElementById("progressTitle").textContent=`${acquired} / ${sprites.length} acquired`;
  document.getElementById("progressText").textContent=`Level progress: ${pct(totalLevel,maxTotal)}%`;
  document.getElementById("progressFill").style.width=`${pct(totalLevel,maxTotal)}%`;
  const families=["Base","Gold","Gummy","Galaxy","Holofoil","Gem","Custom"];
  document.getElementById("variantSummary").innerHTML=families.map(f=>{
    const items=sprites.filter(s=>s.variantFamily===f);
    if(!items.length) return "";
    const got=items.filter(s=>s.acquired).length;
    return `<span class="pill">${f}: <strong>${got}/${items.length}</strong></span>`;
  }).join("");
}
function filteredSprites(){
  const q=search.value.trim().toLowerCase();
  return sprites.filter(s=>{
    if(q && !(`${s.name} ${s.baseName} ${s.variantFamily} ${s.rarity} ${s.notes||""}`.toLowerCase().includes(q))) return false;
    if(filter.value==="acquired" && !s.acquired) return false;
    if(filter.value==="missing" && s.acquired) return false;
    if(filter.value==="maxed" && !(s.acquired && Number(s.level)===5)) return false;
    if(filter.value==="notmaxed" && !(s.acquired && Number(s.level)<5)) return false;
    if(filter.value==="custom" && !s.custom) return false;
    if(rarity.value!=="all" && s.rarity!==rarity.value) return false;
    if(variant.value!=="all" && s.variantFamily!==variant.value) return false;
    return true;
  }).sort((a,b)=>(Number(a.sortGroup)-Number(b.sortGroup)) || familyOrder(a.variantFamily)-familyOrder(b.variantFamily) || String(a.id).localeCompare(String(b.id), undefined, {numeric:true}));
}
function render(){
  updateStats();
  const list=filteredSprites();
  grid.innerHTML="";
  if(!list.length){ grid.innerHTML='<div class="empty">No sprites match this filter.</div>'; return; }
  for(const s of list){
    const node=template.content.firstElementChild.cloneNode(true);
    node.dataset.id=s.id;
    node.classList.toggle("missing", !s.acquired);
    node.classList.toggle("custom-card", !!s.custom);
    node.querySelector(".number").textContent=String(s.id).startsWith("custom-") ? "NEW" : String(s.id).padStart(2,"0");
    const rarityEl=node.querySelector(".rarity"); rarityEl.textContent=s.rarity; rarityEl.className = `rarity ${s.rarity}`;
    const wrap=node.querySelector(".image-wrap"); wrap.dataset.variant=s.variantFamily;
    wrap.classList.toggle("remote", !!s.remoteImage && !s.imageOverride);
    const img=node.querySelector(".sprite-img");
    img.src=effectiveImage(s); img.alt=s.name;
    img.onerror=()=>{ if(img.src !== fallbackImage(s)) img.src=fallbackImage(s); };
    node.querySelector("h2").textContent=s.name;
    const vt=node.querySelector(".variant-tag"); vt.textContent=s.variantFamily; vt.className = `variant-tag ${s.variantFamily}`;
    node.querySelector(".base-tag").textContent=s.baseName;
    const acquired=node.querySelector(".acquired"); acquired.checked=!!s.acquired;
    const level=node.querySelector(".level"); level.value=String(clampLevel(s.level));
    node.querySelector(".level-pill").textContent=`Lvl ${clampLevel(s.level)}`;
    const notes=node.querySelector(".notes"); notes.value=s.notes||"";
    const imageUrl=node.querySelector(".image-url"); imageUrl.value=s.imageOverride || s.remoteImage || s.image || "";
    node.querySelector(".delete-custom").style.display = s.custom ? "inline-block" : "none";
    acquired.addEventListener("change",()=>{s.acquired=acquired.checked;if(!s.acquired) s.level=0; if(s.acquired && Number(s.level)===0) s.level=1; save(); render();});
    level.addEventListener("change",()=>{s.level=clampLevel(level.value); if(s.level>0) s.acquired=true; save(); render();});
    node.querySelector(".minus").addEventListener("click",()=>{s.level=clampLevel(Number(s.level)-1); if(s.level===0) s.acquired=false; save(); render();});
    node.querySelector(".plus").addEventListener("click",()=>{s.level=clampLevel(Number(s.level)+1); if(s.level>0) s.acquired=true; save(); render();});
    notes.addEventListener("input",()=>{s.notes=notes.value; save();});
    imageUrl.addEventListener("change",()=>{s.imageOverride=imageUrl.value.trim(); save(); render();});
    node.querySelector(".clear-img").addEventListener("click",()=>{delete s.imageOverride; save(); render();});
    node.querySelector(".delete-custom").addEventListener("click",()=>{ if(confirm(`Delete ${s.name}?`)){ sprites=sprites.filter(x=>x.id!==s.id); save(); render(); }});
    grid.appendChild(node);
  }
}
[search,filter,rarity,variant].forEach(el=>el.addEventListener("input",render));
document.getElementById("showMissingBtn").addEventListener("click",()=>{filter.value="missing"; render();});
document.getElementById("showNeedsBtn").addEventListener("click",()=>{filter.value="notmaxed"; render();});
document.getElementById("showAllBtn").addEventListener("click",()=>{filter.value="all"; rarity.value="all"; variant.value="all"; search.value=""; render();});
document.getElementById("addSpriteOpenBtn").addEventListener("click",()=> addDialog.showModal());
document.getElementById("resetBtn").addEventListener("click",()=>{ if(confirm("Reset tracker to the starting data? This removes custom sprites too.")){ localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CUSTOM_KEY); sprites=loadSprites(); render(); }});
document.getElementById("exportBtn").addEventListener("click",()=>{
  const payload={exportedAt:new Date().toISOString(), app:"fortnite-sprite-tracker-gitlab-v1", sprites};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="fortnite-sprite-tracker-backup.json"; a.click(); URL.revokeObjectURL(a.href);
});
document.getElementById("importFile").addEventListener("change",async e=>{
  const file=e.target.files[0]; if(!file) return;
  try{
    const data=JSON.parse(await file.text());
    const arr=Array.isArray(data) ? data : data.sprites;
    if(!Array.isArray(arr)) throw new Error("Invalid file");
    const defaultIds=new Set(DEFAULT_SPRITES.map(s=>String(s.id)));
    const byId=new Map(arr.map(s=>[String(s.id),s]));
    const regular=DEFAULT_SPRITES.map(base=>({...base,...(byId.get(String(base.id))||{})}));
    const custom=arr.filter(s=>!defaultIds.has(String(s.id)) || s.custom).map(normalizeCustom);
    sprites=regular.concat(custom); save(); render();
  }catch(err){ alert("Could not import this JSON file."); }
  e.target.value="";
});
addSpriteForm.addEventListener("submit", e=>{
  if(e.submitter && e.submitter.value==="cancel") return;
  e.preventDefault();
  const fd=new FormData(addSpriteForm);
  const level=clampLevel(fd.get("level"));
  const item=normalizeCustom({
    id:`custom-${Date.now()}`,
    name:String(fd.get("name")||"").trim(),
    baseName:String(fd.get("baseName")||"").trim(),
    variantFamily:String(fd.get("variantFamily")||"Custom"),
    rarity:String(fd.get("rarity")||"UNKNOWN"),
    level,
    acquired:!!fd.get("acquired") || level>0,
    image:String(fd.get("image")||"").trim() || DEFAULT_IMAGE,
    fallbackImage:DEFAULT_IMAGE,
    notes:String(fd.get("notes")||"").trim(),
    custom:true
  });
  if(!item.name || !item.baseName){ alert("Name and base name are required."); return; }
  sprites.push(item); save(); addSpriteForm.reset(); addDialog.close(); filter.value="custom"; render();
});
render();

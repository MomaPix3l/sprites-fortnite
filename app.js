const STORAGE_KEY = "fortnite-sprite-tracker-v9-professional";
const MAP_STATE_KEY = "fortnite-location-map-v9";

const $ = (id) => document.getElementById(id);
const DEFAULT_SPRITES = Array.isArray(window.DEFAULT_SPRITES) ? window.DEFAULT_SPRITES : [];
const clone = (obj) => JSON.parse(JSON.stringify(obj));
const clampLevel = (v) => Math.max(0, Math.min(5, Number(v) || 0));
const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
const escapeHtml = (str) => String(str || "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

let sprites = loadSprites();
let mapState = loadMapState();

function loadSprites(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(!saved) return clone(DEFAULT_SPRITES);
  try{
    const parsed = JSON.parse(saved);
    const byId = new Map(parsed.map(s => [s.id, s]));
    return DEFAULT_SPRITES.map(base => ({...base, ...(byId.get(base.id) || {})}));
  } catch(e){
    return clone(DEFAULT_SPRITES);
  }
}
function saveSprites(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(sprites)); }

function familyOrder(f){ return {Base:0, Gold:1, Gummy:2, Galaxy:3, Holofoil:4, Gem:5}[f] ?? 9; }
function downloadJson(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Sprite tracker page ----------
function initTrackerPage(){
  const grid = $("grid");
  const template = $("cardTemplate");
  if(!grid || !template) return;

  const search = $("search");
  const filter = $("filter");
  const rarity = $("rarity");
  const variant = $("variant");

  function updateStats(){
    const acquired = sprites.filter(s => s.acquired).length;
    const maxed = sprites.filter(s => s.acquired && Number(s.level) === 5).length;
    const missing = sprites.length - acquired;
    const totalLevel = sprites.reduce((a, s) => a + (s.acquired ? Number(s.level || 0) : 0), 0);
    const maxTotal = sprites.length * 5;
    $("acquiredCount").textContent = acquired;
    $("maxedCount").textContent = maxed;
    $("missingCount").textContent = missing;
    $("totalLevel").textContent = totalLevel;
    $("progressTitle").textContent = `${acquired} / ${sprites.length} acquired`;
    $("progressText").textContent = `Level progress: ${pct(totalLevel, maxTotal)}%`;
    $("progressFill").style.width = `${pct(totalLevel, maxTotal)}%`;
    const families = ["Base", "Gold", "Gummy", "Galaxy", "Holofoil", "Gem"];
    $("variantSummary").innerHTML = families.map(f => {
      const items = sprites.filter(s => s.variantFamily === f);
      const got = items.filter(s => s.acquired).length;
      return `<span class="pill">${f}: <strong>${got}/${items.length}</strong></span>`;
    }).join("");
  }

  function filteredSprites(){
    const q = search.value.trim().toLowerCase();
    return sprites.filter(s => {
      if(q && !(`${s.name} ${s.baseName} ${s.variantFamily} ${s.rarity}`.toLowerCase().includes(q))) return false;
      if(filter.value === "acquired" && !s.acquired) return false;
      if(filter.value === "missing" && s.acquired) return false;
      if(filter.value === "maxed" && !(s.acquired && Number(s.level) === 5)) return false;
      if(filter.value === "notmaxed" && !(s.acquired && Number(s.level) < 5)) return false;
      if(rarity.value !== "all" && s.rarity !== rarity.value) return false;
      if(variant.value !== "all" && s.variantFamily !== variant.value) return false;
      return true;
    }).sort((a,b) => (a.sortGroup - b.sortGroup) || familyOrder(a.variantFamily) - familyOrder(b.variantFamily) || a.id - b.id);
  }

  function renderTracker(){
    updateStats();
    const list = filteredSprites();
    grid.innerHTML = "";
    if(!list.length){ grid.innerHTML = '<div class="empty">No sprites match this filter.</div>'; return; }
    for(const s of list){
      const node = template.content.firstElementChild.cloneNode(true);
      node.dataset.id = s.id;
      node.classList.toggle("missing", !s.acquired);
      node.querySelector(".number").textContent = String(s.id).padStart(2,"0");
      const rarityEl = node.querySelector(".rarity"); rarityEl.textContent = s.rarity; rarityEl.classList.add(s.rarity);
      const wrap = node.querySelector(".image-wrap"); wrap.dataset.variant = s.variantFamily;
      const img = node.querySelector(".sprite-img");
      img.src = s.image || s.fallbackImage || "";
      img.alt = s.name;
      img.onerror = () => {
        if(s.fallbackImage && img.src.indexOf(s.fallbackImage) === -1){ img.src = s.fallbackImage; }
      };
      node.querySelector("h2").textContent = s.name;
      const vt = node.querySelector(".variant-tag"); vt.textContent = s.variantFamily; vt.classList.add(s.variantFamily);
      node.querySelector(".base-tag").textContent = s.baseName;
      const acquired = node.querySelector(".acquired"); acquired.checked = !!s.acquired;
      const level = node.querySelector(".level"); level.value = String(clampLevel(s.level));
      node.querySelector(".level-pill").textContent = `Lvl ${clampLevel(s.level)}`;
      const notes = node.querySelector(".notes"); notes.value = s.notes || "";
      acquired.addEventListener("change", () => { s.acquired = acquired.checked; if(!s.acquired) s.level = 0; saveSprites(); renderTracker(); });
      level.addEventListener("change", () => { s.level = clampLevel(level.value); if(s.level > 0) s.acquired = true; saveSprites(); renderTracker(); });
      node.querySelector(".minus").addEventListener("click", () => { s.level = clampLevel(Number(s.level) - 1); if(s.level === 0) s.acquired = false; saveSprites(); renderTracker(); });
      node.querySelector(".plus").addEventListener("click", () => { s.level = clampLevel(Number(s.level) + 1); if(s.level > 0) s.acquired = true; saveSprites(); renderTracker(); });
      notes.addEventListener("input", () => { s.notes = notes.value; saveSprites(); });
      grid.appendChild(node);
    }
  }

  [search, filter, rarity, variant].forEach(el => el.addEventListener("input", renderTracker));
  $("showMissingBtn").addEventListener("click", () => { filter.value = "missing"; renderTracker(); });
  $("showNeedsBtn").addEventListener("click", () => { filter.value = "notmaxed"; renderTracker(); });
  $("showAllBtn").addEventListener("click", () => { filter.value = "all"; rarity.value = "all"; variant.value = "all"; search.value = ""; renderTracker(); });
  $("resetBtn").addEventListener("click", () => { if(confirm("Reset tracker to the starting data?")){ localStorage.removeItem(STORAGE_KEY); sprites = clone(DEFAULT_SPRITES); renderTracker(); } });
  $("exportBtn").addEventListener("click", () => downloadJson({version:6, exportedAt:new Date().toISOString(), app:"fortnite-sprite-tracker-github-v6", sprites, mapState}, "fortnite-sprite-tracker-full-backup.json"));
  $("importFile").addEventListener("change", async e => {
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      const spriteData = Array.isArray(data) ? data : data.sprites;
      if(!Array.isArray(spriteData)) throw new Error("Invalid file");
      const byId = new Map(spriteData.map(s => [s.id, s]));
      sprites = DEFAULT_SPRITES.map(base => ({...base, ...(byId.get(base.id) || {})}));
      if(data.mapState){ mapState = normalizeMapState(data.mapState); saveMapState(); }
      saveSprites(); renderTracker();
    }catch(err){ alert("Could not import this JSON file."); }
    e.target.value = "";
  });

  renderTracker();
}

// ---------- Interactive map page ----------
// ---------- Interactive multi-season map page ----------
const DEFAULT_MAP_TYPES = [
  {id:"sprite-chest", label:"Sprite Chest", color:"#ff3fb7", iconKind:"chest", builtIn:true, visible:true, description:"Sprite chest locations"},
  {id:"gold-fishing-hole", label:"Gold Fishing Hole", color:"#ffd84a", iconKind:"gold-target", builtIn:true, visible:true, description:"Gold fishing ripple locations"},
  {id:"regular-fishing-hole", label:"Regular Fishing Hole", color:"#27a8ff", iconKind:"blue-target", builtIn:true, visible:true, description:"Regular fishing hole locations"}
];
function defaultMapState(){
  const mapId = "current-season";
  return {
    version: 6,
    selectedMapId: mapId,
    maps: [{id:mapId, name:"Current Season Map", image:"assets/current-season-map.png", builtIn:true, createdAt:new Date().toISOString()}],
    pinsByMap: {[mapId]: []},
    types: clone(DEFAULT_MAP_TYPES),
    filters: {types: {}, quality:"all", confirmed:"all", showLabels:true}
  };
}
function normalizeMapState(state){
  const base = defaultMapState();
  if(!state || typeof state !== "object") return base;
  const maps = Array.isArray(state.maps) && state.maps.length ? state.maps : base.maps;
  const types = mergeTypes(state.types);
  const selectedMapId = maps.some(m => m.id === state.selectedMapId) ? state.selectedMapId : maps[0].id;
  const pinsByMap = state.pinsByMap && typeof state.pinsByMap === "object" ? state.pinsByMap : {};
  for(const m of maps) if(!Array.isArray(pinsByMap[m.id])) pinsByMap[m.id] = [];
  return {
    version: 6,
    selectedMapId,
    maps: maps.map(m => ({...m, image:m.image || "assets/current-season-map.png", name:m.name || "Season Map"})),
    pinsByMap,
    types,
    filters: {...base.filters, ...(state.filters || {})}
  };
}
function mergeTypes(existing){
  const map = new Map(DEFAULT_MAP_TYPES.map(t => [t.id, {...t}]));
  if(Array.isArray(existing)) for(const t of existing){ if(t && t.id) map.set(t.id, {...map.get(t.id), ...t}); }
  return [...map.values()];
}
function loadMapState(){
  try{ return normalizeMapState(JSON.parse(localStorage.getItem(MAP_STATE_KEY))); }
  catch(e){ return defaultMapState(); }
}
function saveMapState(){ localStorage.setItem(MAP_STATE_KEY, JSON.stringify(mapState)); }
function currentMap(){ return mapState.maps.find(m => m.id === mapState.selectedMapId) || mapState.maps[0]; }
function currentPins(){ return mapState.pinsByMap[mapState.selectedMapId] || (mapState.pinsByMap[mapState.selectedMapId] = []); }
function getType(id){ return mapState.types.find(t => t.id === id) || mapState.types[0] || DEFAULT_MAP_TYPES[0]; }
function slugify(str){ return String(str || "custom").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"") || `custom-${Date.now()}`; }
function readFileDataUrl(file){ return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }

function initMapPage(){
  const mapScroll = $("mapScroll");
  const mapStage = $("mapStage");
  const seasonMap = $("seasonMap");
  const pinLayer = $("pinLayer");
  if(!mapScroll || !mapStage || !seasonMap || !pinLayer) return;

  let addingPin = false;
  let selectedPinId = null;
  let pendingCloseupData = null;
  let mapZoomValue = 1;
  let pendingCustomTypeIcon = null;
  let showMapLabels = mapState.filters.showLabels !== false;

  const uid = (prefix="pin") => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clampPercent = (v) => Math.max(0, Math.min(100, Number(v) || 0));
  const pinDisplayName = (pin) => pin.name || getType(pin.typeId).label || "Location";

  function safeSetText(id, value){ const el=$(id); if(el) el.textContent=value; }
  function renderAll(){ renderSeasonSelect(); renderTypeControls(); renderMapImage(); renderMapPins(); renderLegend(); }

  function renderSeasonSelect(){
    const sel = $("seasonSelect"); if(!sel) return;
    sel.innerHTML = mapState.maps.map(m => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name)}</option>`).join("");
    sel.value = mapState.selectedMapId;
  }
  function renderTypeControls(){
    const pinType = $("pinType");
    if(pinType){
      const current = pinType.value;
      pinType.innerHTML = mapState.types.map(t => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.label)}</option>`).join("");
      if(mapState.types.some(t => t.id === current)) pinType.value = current;
    }
    const filters = $("typeFilters");
    if(filters){
      filters.innerHTML = mapState.types.map(t => {
        const visible = mapState.filters.types[t.id] !== false;
        return `<label class="type-filter" style="--type-color:${escapeHtml(t.color || '#16f0d0')}"><input type="checkbox" data-type-filter="${escapeHtml(t.id)}" ${visible ? 'checked' : ''}/><span>${renderTypeIcon(t)}</span>${escapeHtml(t.label)}</label>`;
      }).join("");
      filters.querySelectorAll("[data-type-filter]").forEach(input => input.addEventListener("change", e => {
        mapState.filters.types[e.target.dataset.typeFilter] = e.target.checked;
        saveMapState(); renderMapPins(); renderLegend();
      }));
    }
    const typeList = $("typeList");
    if(typeList){
      typeList.innerHTML = mapState.types.map(t => `<div class="type-row" style="--type-color:${escapeHtml(t.color || '#16f0d0')}">
        <span class="type-row-icon">${renderTypeIcon(t)}</span>
        <div><strong>${escapeHtml(t.label)}</strong><small>${t.builtIn ? 'Built-in' : 'Custom'}${t.description ? ' • ' + escapeHtml(t.description) : ''}</small></div>
        <button class="mini-btn" type="button" data-toggle-type="${escapeHtml(t.id)}">${mapState.filters.types[t.id] === false ? 'Show' : 'Hide'}</button>
        ${t.builtIn ? '' : `<button class="mini-btn danger-mini" type="button" data-delete-type="${escapeHtml(t.id)}">Delete</button>`}
      </div>`).join("");
      typeList.querySelectorAll("[data-toggle-type]").forEach(btn => btn.addEventListener("click", e => {
        const id = e.currentTarget.dataset.toggleType;
        mapState.filters.types[id] = mapState.filters.types[id] === false;
        saveMapState(); renderAll();
      }));
      typeList.querySelectorAll("[data-delete-type]").forEach(btn => btn.addEventListener("click", e => deleteCustomType(e.currentTarget.dataset.deleteType)));
    }
  }
  function renderMapImage(){
    const map = currentMap();
    seasonMap.src = map.image || "assets/current-season-map.png";
    seasonMap.alt = map.name || "Fortnite season map";
  }
  function renderTypeIcon(type){
    if(type.iconImage) return `<img class="type-mini-img" src="${escapeHtml(type.iconImage)}" alt="" />`;
    if(type.iconKind === "chest") return `<img class="type-mini-img" src="assets/map-pin-sprite-chest.png" alt="" />`;
    if(type.iconKind === "gold-target") return `<span class="target-mini gold-target-mini"></span>`;
    if(type.iconKind === "blue-target") return `<span class="target-mini blue-target-mini"></span>`;
    return `<span class="custom-dot" style="background:${escapeHtml(type.color || '#16f0d0')}"></span>`;
  }
  function pinIconHtml(pin){
    const t = getType(pin.typeId);
    if(t.iconImage) return `<span class="pin-custom-img-wrap" style="--type-color:${escapeHtml(t.color || '#16f0d0')}"><img src="${escapeHtml(t.iconImage)}" alt="" /></span>`;
    if(t.iconKind === "chest") return `<span class="pin-chest"><img src="assets/map-pin-sprite-chest.png" alt="" /></span>`;
    if(t.iconKind === "gold-target") return `<span class="pin-target gold"></span>`;
    if(t.iconKind === "blue-target") return `<span class="pin-target blue"></span>`;
    return `<span class="pin-custom-dot" style="--type-color:${escapeHtml(t.color || '#16f0d0')}"></span>`;
  }
  function isPinVisible(pin){
    if(mapState.filters.types[pin.typeId] === false) return false;
    if(mapState.filters.quality !== "all" && pin.quality !== mapState.filters.quality) return false;
    if(mapState.filters.confirmed === "confirmed" && !pin.confirmed) return false;
    if(mapState.filters.confirmed === "unconfirmed" && pin.confirmed) return false;
    return true;
  }
  function renderMapPins(){
    pinLayer.innerHTML = "";
    const allPins = currentPins();
    const visiblePins = allPins.filter(isPinVisible);
    safeSetText("pinCount", visiblePins.length);
    safeSetText("bestPinCount", visiblePins.filter(p => p.quality === "Best").length);
    for(const pin of visiblePins){
      const type = getType(pin.typeId);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `map-pin icon-pin ${selectedPinId === pin.id ? "selected" : ""} ${showMapLabels ? "" : "hide-label"}`;
      btn.style.left = `${pin.x}%`;
      btn.style.top = `${pin.y}%`;
      btn.style.setProperty("--type-color", type.color || "#16f0d0");
      btn.title = `${pinDisplayName(pin)}${pin.area ? " — " + pin.area : ""}`;
      btn.innerHTML = `${pinIconHtml(pin)}<span class="pin-label">${escapeHtml(pinDisplayName(pin))}</span>`;
      btn.addEventListener("click", ev => { ev.stopPropagation(); selectPin(pin.id); });
      pinLayer.appendChild(btn);
    }
  }
  function renderLegend(){
    const legend = $("mapLegend"); if(!legend) return;
    legend.innerHTML = mapState.types.map(t => {
      const count = currentPins().filter(p => p.typeId === t.id && isPinVisible(p)).length;
      const hidden = mapState.filters.types[t.id] === false;
      return `<button type="button" class="legend-pill ${hidden ? 'muted' : ''}" data-legend-type="${escapeHtml(t.id)}" style="--type-color:${escapeHtml(t.color || '#16f0d0')}">${renderTypeIcon(t)}<span>${escapeHtml(t.label)}</span><strong>${count}</strong></button>`;
    }).join("");
    legend.querySelectorAll("[data-legend-type]").forEach(btn => btn.addEventListener("click", e => {
      const id = e.currentTarget.dataset.legendType;
      mapState.filters.types[id] = mapState.filters.types[id] === false;
      saveMapState(); renderAll();
    }));
  }
  function setAddMode(on){
    addingPin = on;
    $("addPinModeBtn").textContent = on ? "Click map to place pin" : "Add pin by clicking map";
    $("addModeLabel").textContent = on ? "Add mode active" : "Click “Add pin” first";
    $("addModeLabel").classList.toggle("active", on);
    mapScroll.classList.toggle("adding", on);
  }
  function setCloseupPreview(src){
    const prev = $("closeupPreview");
    prev.innerHTML = src ? `<img src="${src}" alt="Pin close-up preview" />` : `<span>No close-up yet. Auto-crop will be created from the map when you save.</span>`;
  }
  function clearPinForm(){
    selectedPinId = null; pendingCloseupData = null;
    $("pinFormTitle").textContent = "Add / Edit Pin";
    $("editingPinId").value = "";
    $("pinName").value = "Sprite";
    $("pinType").value = mapState.types[0]?.id || "sprite-chest";
    $("pinArea").value = "";
    $("pinQuality").value = "Best";
    $("pinX").value = "";
    $("pinY").value = "";
    $("pinConfirmed").checked = false;
    $("pinNotes").value = "";
    $("pinCloseup").value = "";
    setCloseupPreview(null);
    renderMapPins();
  }
  function selectPin(id){
    const pin = currentPins().find(p => p.id === id); if(!pin) return;
    selectedPinId = id; pendingCloseupData = null;
    $("pinFormTitle").textContent = "Editing Pin";
    $("editingPinId").value = pin.id;
    $("pinName").value = pin.name || "Sprite";
    $("pinType").value = pin.typeId || "sprite-chest";
    $("pinArea").value = pin.area || "";
    $("pinQuality").value = pin.quality || "Best";
    $("pinX").value = Number(pin.x).toFixed(2);
    $("pinY").value = Number(pin.y).toFixed(2);
    $("pinConfirmed").checked = !!pin.confirmed;
    $("pinNotes").value = pin.notes || "";
    setCloseupPreview(pin.closeup || null);
    renderMapPins();
  }
  function placePinFromClick(ev){
    if(!addingPin) return;
    const rect = seasonMap.getBoundingClientRect();
    const x = clampPercent(((ev.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((ev.clientY - rect.top) / rect.height) * 100);
    $("pinX").value = x.toFixed(2);
    $("pinY").value = y.toFixed(2);
    setAddMode(false);
  }
  function getPinFromForm(){
    return {
      id: $("editingPinId").value || uid("pin"),
      name: $("pinName").value.trim() || "Sprite",
      typeId: $("pinType").value || "sprite-chest",
      area: $("pinArea").value.trim(),
      quality: $("pinQuality").value,
      x: clampPercent($("pinX").value),
      y: clampPercent($("pinY").value),
      confirmed: $("pinConfirmed").checked,
      notes: $("pinNotes").value.trim(),
      closeup: pendingCloseupData || null,
      updatedAt: new Date().toISOString()
    };
  }
  function ensureImageLoaded(img){ return img.complete && img.naturalWidth ? Promise.resolve() : new Promise(res => img.addEventListener("load", res, {once:true})); }
  async function createMapCropDataUrl(xPct, yPct){
    await ensureImageLoaded(seasonMap);
    const canvas = document.createElement("canvas");
    const cropSize = 420; canvas.width = cropSize; canvas.height = cropSize;
    const ctx = canvas.getContext("2d");
    const naturalX = (xPct / 100) * seasonMap.naturalWidth;
    const naturalY = (yPct / 100) * seasonMap.naturalHeight;
    const side = Math.min(seasonMap.naturalWidth, seasonMap.naturalHeight) * 0.22;
    const sx = Math.max(0, Math.min(seasonMap.naturalWidth - side, naturalX - side / 2));
    const sy = Math.max(0, Math.min(seasonMap.naturalHeight - side, naturalY - side / 2));
    ctx.fillStyle = "#07101d"; ctx.fillRect(0, 0, cropSize, cropSize);
    ctx.drawImage(seasonMap, sx, sy, side, side, 0, 0, cropSize, cropSize);
    const cx = ((naturalX - sx) / side) * cropSize;
    const cy = ((naturalY - sy) / side) * cropSize;
    ctx.strokeStyle = "#16f0d0"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 36, cy); ctx.lineTo(cx + 36, cy); ctx.moveTo(cx, cy - 36); ctx.lineTo(cx, cy + 36); ctx.stroke();
    return canvas.toDataURL("image/png");
  }
  async function savePinFromForm(){
    const pin = getPinFromForm();
    if(!$("pinX").value || !$("pinY").value){ alert("Click the map or enter X/Y percentages first."); return; }
    const pins = currentPins();
    const existing = pins.find(p => p.id === pin.id);
    if(existing && !pin.closeup) pin.closeup = existing.closeup || null;
    if(!pin.closeup) pin.closeup = await createMapCropDataUrl(pin.x, pin.y);
    const idx = pins.findIndex(p => p.id === pin.id);
    if(idx >= 0) pins[idx] = {...pins[idx], ...pin}; else pins.push(pin);
    saveMapState(); selectPin(pin.id); renderAll();
  }
  function deleteSelectedPin(){
    const id = $("editingPinId").value;
    if(!id){ clearPinForm(); return; }
    if(!confirm("Delete this map pin?")) return;
    mapState.pinsByMap[mapState.selectedMapId] = currentPins().filter(p => p.id !== id);
    saveMapState(); clearPinForm(); renderAll();
  }
  function setMapZoom(v){
    mapZoomValue = Math.max(1, Math.min(3, Number(v) || 1));
    $("mapZoom").value = String(mapZoomValue);
    mapStage.style.width = `${mapZoomValue * 100}%`;
  }
  function addSeasonMap(){
    const name = prompt("Season map name", "New Fortnite Season Map");
    if(!name) return;
    const id = uid("season");
    mapState.maps.push({id, name:name.trim(), image:"assets/current-season-map.png", createdAt:new Date().toISOString()});
    mapState.pinsByMap[id] = [];
    mapState.selectedMapId = id;
    saveMapState(); clearPinForm(); renderAll();
  }
  async function uploadSeasonImage(e){
    const file = e.target.files[0]; if(!file) return;
    const map = currentMap();
    map.image = await readFileDataUrl(file);
    if(!map.name || map.name === "New Fortnite Season Map") map.name = file.name.replace(/\.[^.]+$/,"");
    saveMapState(); renderAll();
    e.target.value = "";
  }
  function deleteSeasonMap(){
    const map = currentMap();
    if(map.builtIn && mapState.maps.length === 1){ alert("You need at least one map."); return; }
    if(!confirm(`Delete map "${map.name}" and all pins on it?`)) return;
    delete mapState.pinsByMap[map.id];
    mapState.maps = mapState.maps.filter(m => m.id !== map.id);
    if(!mapState.maps.length) return Object.assign(mapState, defaultMapState());
    mapState.selectedMapId = mapState.maps[0].id;
    saveMapState(); clearPinForm(); renderAll();
  }
  function deleteCustomType(id){
    const type = getType(id);
    if(type.builtIn){ alert("Built-in types cannot be deleted."); return; }
    const used = Object.values(mapState.pinsByMap).flat().some(p => p.typeId === id);
    if(used && !confirm("This type is used by existing pins. Delete the type and convert those pins to Sprite Chest?")) return;
    for(const pins of Object.values(mapState.pinsByMap)) for(const p of pins) if(p.typeId === id) p.typeId = "sprite-chest";
    mapState.types = mapState.types.filter(t => t.id !== id);
    delete mapState.filters.types[id];
    saveMapState(); renderAll();
  }
  async function addCustomType(){
    const label = $("newTypeName").value.trim();
    if(!label){ alert("Type name is required."); return; }
    let id = slugify(label);
    if(mapState.types.some(t => t.id === id)) id = `${id}-${Date.now()}`;
    mapState.types.push({
      id, label, color: $("newTypeColor").value || "#16f0d0", iconKind:"custom", iconImage:pendingCustomTypeIcon, visible:$("newTypeVisible").checked, builtIn:false, createdAt:new Date().toISOString()
    });
    mapState.filters.types[id] = $("newTypeVisible").checked;
    pendingCustomTypeIcon = null;
    $("newTypeName").value = ""; $("newTypeIcon").value = ""; $("newTypeVisible").checked = true;
    saveMapState(); renderAll();
  }
  function exportMapData(){ downloadJson({version:6, exportedAt:new Date().toISOString(), mapState}, "fortnite-map-locations-backup.json"); }
  async function importMapData(e){
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      if(data.mapState) mapState = normalizeMapState(data.mapState);
      else if(Array.isArray(data.mapPins)){
        const migrated = defaultMapState(); migrated.pinsByMap[migrated.selectedMapId] = data.mapPins.map(p => ({...p, typeId:p.typeId || (p.type === "Gold fishing spot" ? "gold-fishing-hole" : "sprite-chest")})); mapState = migrated;
      } else throw new Error("Invalid file");
      saveMapState(); clearPinForm(); renderAll();
    }catch(err){ alert("Could not import this map JSON file."); }
    e.target.value = "";
  }

  $("addPinModeBtn").addEventListener("click", () => setAddMode(!addingPin));
  $("clearPinBtn").addEventListener("click", clearPinForm);
  $("savePinBtn").addEventListener("click", savePinFromForm);
  $("deletePinBtn").addEventListener("click", deleteSelectedPin);
  $("exportPinsBtn").addEventListener("click", exportMapData);
  $("importPinsFile").addEventListener("change", importMapData);
  $("resetMapBtn").addEventListener("click", () => { if(confirm("Delete every pin on every map?")){ mapState.pinsByMap = Object.fromEntries(mapState.maps.map(m => [m.id, []])); saveMapState(); clearPinForm(); renderAll(); } });
  $("mapZoom").addEventListener("input", e => setMapZoom(e.target.value));
  $("zoomOutBtn").addEventListener("click", () => setMapZoom(mapZoomValue - .2));
  $("zoomInBtn").addEventListener("click", () => setMapZoom(mapZoomValue + .2));
  $("fitMapBtn").addEventListener("click", () => { setMapZoom(1); mapScroll.scrollTo({top:0,left:0,behavior:"smooth"}); });
  $("toggleLabelsBtn").addEventListener("click", () => { showMapLabels = !showMapLabels; mapState.filters.showLabels = showMapLabels; $("toggleLabelsBtn").textContent = showMapLabels ? "Hide labels" : "Show labels"; saveMapState(); renderMapPins(); });
  $("seasonSelect").addEventListener("change", e => { mapState.selectedMapId = e.target.value; selectedPinId = null; saveMapState(); clearPinForm(); renderAll(); });
  $("newSeasonBtn").addEventListener("click", addSeasonMap);
  $("seasonImageFile").addEventListener("change", uploadSeasonImage);
  $("deleteSeasonBtn").addEventListener("click", deleteSeasonMap);
  $("qualityFilter").addEventListener("change", e => { mapState.filters.quality = e.target.value; saveMapState(); renderMapPins(); renderLegend(); });
  $("confirmedFilter").addEventListener("change", e => { mapState.filters.confirmed = e.target.value; saveMapState(); renderMapPins(); renderLegend(); });
  $("showAllMapBtn").addEventListener("click", () => { mapState.filters.types = {}; mapState.filters.quality = "all"; mapState.filters.confirmed = "all"; $("qualityFilter").value = "all"; $("confirmedFilter").value = "all"; saveMapState(); renderAll(); });
  $("pinCloseup").addEventListener("change", async e => { const file = e.target.files[0]; if(!file) return; pendingCloseupData = await readFileDataUrl(file); setCloseupPreview(pendingCloseupData); });
  $("newTypeIcon").addEventListener("change", async e => { const file = e.target.files[0]; if(!file){ pendingCustomTypeIcon = null; return; } pendingCustomTypeIcon = await readFileDataUrl(file); });
  $("addTypeBtn").addEventListener("click", addCustomType);
  $("pinTabBtn").addEventListener("click", () => { $("pinTabBtn").classList.add("active"); $("typeTabBtn").classList.remove("active"); $("pinEditorPanel").hidden = false; $("typeEditorPanel").hidden = true; });
  $("typeTabBtn").addEventListener("click", () => { $("typeTabBtn").classList.add("active"); $("pinTabBtn").classList.remove("active"); $("pinEditorPanel").hidden = true; $("typeEditorPanel").hidden = false; renderTypeControls(); });
  mapStage.addEventListener("click", placePinFromClick);

  let dragging = false, startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;
  mapScroll.addEventListener("mousedown", e => { if(addingPin || e.target.closest(".map-pin")) return; dragging = true; startX = e.pageX; startY = e.pageY; scrollLeft = mapScroll.scrollLeft; scrollTop = mapScroll.scrollTop; mapScroll.style.cursor = "grabbing"; });
  window.addEventListener("mouseup", () => { dragging = false; mapScroll.style.cursor = addingPin ? "crosshair" : ""; });
  mapScroll.addEventListener("mousemove", e => { if(!dragging) return; e.preventDefault(); mapScroll.scrollLeft = scrollLeft - (e.pageX - startX); mapScroll.scrollTop = scrollTop - (e.pageY - startY); });

  $("qualityFilter").value = mapState.filters.quality || "all";
  $("confirmedFilter").value = mapState.filters.confirmed || "all";
  $("toggleLabelsBtn").textContent = showMapLabels ? "Hide labels" : "Show labels";
  setMapZoom(1);
  renderAll();
}

initTrackerPage();
initMapPage();
